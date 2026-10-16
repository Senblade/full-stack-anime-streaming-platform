import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted">Sign in to pick up where you left off.</p>
      <div className="mt-8">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-violet-300 hover:text-violet-200">
          Create an account
        </Link>
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-surface/60 p-4 text-xs text-muted">
        <p className="font-medium text-fg">Demo accounts</p>
        <p className="mt-1">
          Any of <span className="font-mono text-violet-200">sakura, kenji, yuki, aiko, ren, hana, daichi</span>@anisync.app — password <span className="font-mono text-violet-200">password123</span>. Open two accounts in different browsers to try a synced watch party.
        </p>
      </div>
    </div>
  );
}
