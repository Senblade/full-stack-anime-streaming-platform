"use client";

import { useActionState, useState } from "react";
import { changePasswordAction, updateProfileAction, type ProfileState } from "@/actions/profile";
import type { SafeUser } from "@/lib/auth";
import { AVATAR_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input, Textarea } from "@/components/ui/input";

export function ProfileForm({ user }: { user: SafeUser }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(updateProfileAction, null);
  const [color, setColor] = useState(user.avatarColor);
  const [name, setName] = useState(user.displayName);

  return (
    <form action={formAction} className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold">Profile</h2>
      <p className="mb-5 text-xs text-muted">How you appear in chat, reviews, and party rooms.</p>
      <div className="flex items-center gap-4">
        <Avatar name={name || user.displayName} color={color} size="xl" />
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Avatar colour</p>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={cn("h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-surface transition", color === c ? "ring-white" : "ring-transparent")} style={{ background: c }} aria-label={c} />
            ))}
          </div>
          <input type="hidden" name="avatarColor" value={color} />
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Display name">
          <Input name="displayName" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </Field>
        <Field label="Username">
          <Input value={`@${user.username}`} disabled />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input value={user.email} disabled />
        </Field>
        <Field label="Bio" hint="240 chars" className="sm:col-span-2">
          <Textarea name="bio" defaultValue={user.bio} maxLength={240} placeholder="Favourite genres, what you're watching, hot takes…" />
        </Field>
      </div>
      <div className="mt-4 space-y-3">
        <FormError message={state?.error} />
        <FormSuccess message={state?.success} />
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>
            Save profile
          </Button>
        </div>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(changePasswordAction, null);
  return (
    <form action={formAction} className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold">Password</h2>
      <p className="mb-5 text-xs text-muted">Use at least 8 characters.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password">
          <Input name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password">
          <Input name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirm new password">
          <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
      </div>
      <div className="mt-4 space-y-3">
        <FormError message={state?.error} />
        <FormSuccess message={state?.success} />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={pending}>
            Change password
          </Button>
        </div>
      </div>
    </form>
  );
}
