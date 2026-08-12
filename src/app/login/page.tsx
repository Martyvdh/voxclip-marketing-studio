import { redirect } from "next/navigation";

import { VoxClipMark } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <VoxClipMark />
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold">
            VoxClip <span className="text-ink-muted">Studio</span>
          </span>
        </div>

        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 mb-8 text-sm text-ink-muted">
          Your own account, not a shared code. Every approval and every
          publication is recorded against the person who made it.
        </p>

        <LoginForm />
      </div>
    </main>
  );
}
