import { Suspense } from "react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { signInWithMicrosoft } from "../../staffActions";

export const metadata: Metadata = { title: "Sign in · Linden Physio" };

// Where the staff sign in: with their work account, at Microsoft.
export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-24">
      <h1 className="text-title">Linden Physio staff</h1>
      <form action={signInWithMicrosoft}>
        <Button type="submit" className="w-full">
          Sign in with your work account
        </Button>
      </form>
      <Suspense fallback={null}>
        <Refused searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Better Auth sends a refused sign-in back here with ?error=…
async function Refused({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;
  const message =
    error === "not_staff"
      ? "That account isn't on the clinic's staff. Sign in with your own work account."
      : "Signing in didn't work. Please try again.";
  return (
    <p role="alert" className="rounded-md bg-invalid-100 px-4 py-3 text-danger-600">
      {message}
    </p>
  );
}
