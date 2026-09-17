import type { Metadata } from "next";
import { AuthPage } from "../login/AuthPage";

export const metadata: Metadata = { title: "Create your account", robots: { index: false, follow: false } };

export default function SignupPage() {
  return <AuthPage mode="up" />;
}
