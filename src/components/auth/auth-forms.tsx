"use client";

import { useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import { loginAction, registerAction, type AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(loginAction, null);
  const [email, setEmail] = useState(state?.fields?.email ?? "");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Sign in
      </Button>
      <button
        type="button"
        onClick={() => {
          setEmail("sakura@anisync.app");
          setPassword("password123");
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/40 bg-brand/5 px-4 py-2.5 text-xs text-violet-200 transition hover:bg-brand/10"
      >
        <Sparkles className="h-3.5 w-3.5" /> Fill demo account (sakura@anisync.app / password123)
      </button>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(registerAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" htmlFor="displayName">
          <Input id="displayName" name="displayName" defaultValue={state?.fields?.displayName} placeholder="Sakura Tanaka" required minLength={2} />
        </Field>
        <Field label="Username" htmlFor="username">
          <Input id="username" name="username" defaultValue={state?.fields?.username} placeholder="sakura" required minLength={3} />
        </Field>
      </div>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.fields?.email} placeholder="you@example.com" required />
      </Field>
      <Field label="Password" htmlFor="password" hint="8+ characters">
        <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="••••••••" required minLength={8} />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Create account
      </Button>
    </form>
  );
}
