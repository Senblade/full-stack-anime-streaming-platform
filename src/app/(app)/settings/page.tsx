import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { requireUser } from "@/lib/auth";
import { PasswordForm, ProfileForm } from "@/components/settings/settings-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your profile and account."
        actions={
          user.role === "admin" ? (
            <Badge tone="pink">Admin · can edit any catalog entry</Badge>
          ) : (
            <Badge>Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</Badge>
          )
        }
      />
      <div className="space-y-6">
        <ProfileForm user={user} />
        <PasswordForm />
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-6">
          <div>
            <h2 className="text-sm font-semibold">Sign out</h2>
            <p className="text-xs text-muted">You&apos;ll need your password to sign back in.</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
