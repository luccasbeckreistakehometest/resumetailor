"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { AuthModal, type AuthMode } from "@/components/AuthButton";
import { SiteHeader } from "@/components/SiteHeader";

/** /login and /signup: the same dialog, opened in the mode the URL names. */
export function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  // Closing after a successful sign-in must not undo the redirect to /start.
  const done = useRef(false);
  return (
    <div className="min-h-screen">
      <SiteHeader minimal />
      <AuthModal initialMode={mode} onClose={() => { if (!done.current) router.push("/"); }} onDone={() => { done.current = true; router.push("/start"); }} />
    </div>
  );
}
