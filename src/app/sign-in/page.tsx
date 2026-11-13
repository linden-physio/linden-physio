import type { Metadata } from "next";
import { SignInForm } from "../../staff/SignInForm";

export const metadata: Metadata = { title: "Sign in · Linden Physio" };

// Where the staff sign in.
export default function SignInPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-24">
      <h1 className="text-title">Linden Physio staff</h1>
      <SignInForm />
    </main>
  );
}
