import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { signInWithMicrosoft } from "../../staffActions";

export const metadata: Metadata = { title: "Sign in · Linden Physio" };

// Where the staff sign in: with their work account, at Microsoft.
export default function SignInPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-24">
      <h1 className="text-title">Linden Physio staff</h1>
      <form action={signInWithMicrosoft}>
        <Button type="submit" className="w-full">
          Sign in with your work account
        </Button>
      </form>
    </main>
  );
}
