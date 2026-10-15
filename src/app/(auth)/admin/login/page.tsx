import { Suspense } from "react";

import LoginForm from "@/components/admin/LoginForm";
import AuthSessionProvider from "@/components/admin/SessionProvider";

// Static shell: signed-in detection happens client-side in LoginForm.
// Server-side enforcement lives in src/app/admin/layout.tsx.
export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-950 dark:ring-1 dark:ring-zinc-800">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Admin sign in</h1>
        <p className="mb-6 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Study Abroad platform administration
        </p>
        <AuthSessionProvider>
          <Suspense>
            <LoginForm />
          </Suspense>
        </AuthSessionProvider>
      </div>
    </main>
  );
}
