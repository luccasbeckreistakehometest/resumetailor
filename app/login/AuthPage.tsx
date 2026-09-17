"use client";

import { useRouter } from "next/navigation";
import { AuthModal, type AuthMode } from "@/components/AuthButton";
import { SiteHeader } from "@/components/SiteHeader";

/** /login and /signup: the same dialog, opened in the mode the URL names. */
export function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  return (
    <div className="min-h-screen">
      <SiteHeader minimal />
      <AuthModal initialMode={mode} onClose={() => router.push("/")} onDone={() => router.push("/start")} />
    </div>
  );
}
