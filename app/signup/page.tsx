"use client";

import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/AuthButton";

export default function SignupPage() {
  const router = useRouter();
  return <AuthModal onClose={() => router.push("/")} onDone={() => router.push("/start")} />;
}
