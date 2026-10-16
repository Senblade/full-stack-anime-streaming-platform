"use server";

import { redirect } from "next/navigation";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { AVATAR_COLORS } from "@/lib/constants";

export type AuthState = { error?: string; fields?: Record<string, string> } | null;

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password.", fields: { email } };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password.", fields: { email } };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fields = { displayName, username, email };

  if (!displayName || displayName.length < 2) return { error: "Display name must be at least 2 characters.", fields };
  if (!username || username.length < 3) return { error: "Username must be at least 3 characters (letters, numbers, underscores).", fields };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email address.", fields };
  if (password.length < 8) return { error: "Password must be at least 8 characters.", fields };

  const existing = await db
    .select({ id: users.id, email: users.email, username: users.username })
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);
  if (existing[0]) {
    return {
      error: existing[0].email === email ? "An account with that email already exists." : "That username is taken.",
      fields,
    };
  }

  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const [user] = await db
    .insert(users)
    .values({ displayName, username, email, passwordHash: hashPassword(password), avatarColor })
    .returning();

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
