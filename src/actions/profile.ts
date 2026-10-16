"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AVATAR_COLORS } from "@/lib/constants";
import { hashPassword, verifyPassword } from "@/lib/password";

export type ProfileState = { error?: string; success?: string } | null;

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 240);
  const avatarColor = String(formData.get("avatarColor") ?? user.avatarColor);

  if (displayName.length < 2) return { error: "Display name must be at least 2 characters." };
  if (!AVATAR_COLORS.includes(avatarColor)) return { error: "Pick one of the available colours." };

  await db.update(users).set({ displayName, bio, avatarColor }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { success: "Profile updated." };
}

export async function changePasswordAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords do not match." };

  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !verifyPassword(current, row.passwordHash)) return { error: "Your current password is incorrect." };

  await db.update(users).set({ passwordHash: hashPassword(next) }).where(eq(users.id, user.id));
  return { success: "Password changed." };
}
