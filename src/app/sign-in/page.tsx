import { Suspense } from "react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { signInWithMicrosoft } from "../../staffActions";
import { about, here } from "../../business";
import { LinkForm } from "../../mine/LinkForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Sign in · " + (await about(await here())).name };
}

// Where the staff sign in: with their work account at Microsoft, or, for a business without work
// accounts, with a link by email.
export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-24">
      <Suspense fallback={null}>
        <SignIn />
      </Suspense>
      <Suspense fallback={null}>
        <Refused searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SignIn() {
  const { name, staffSignIn } = await about(await here());
  return (
    <>
      <h1 className="text-title">{name} staff</h1>
      {staffSignIn === "microsoft" ? (
        <form action={signInWithMicrosoft}>
          <Button type="submit" className="w-full">
            Sign in with your work account
          </Button>
        </form>
      ) : (
        <LinkForm next="/staff" />
      )}
    </>
  );
}

// Better Auth sends a refused sign-in back here with ?error=…
async function Refused({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;
  const message =
    error === "not_staff"
      ? "That account isn't on the staff here. Sign in with your own work account."
      : "Signing in didn't work. Please try again.";
  return (
    <p role="alert" className="rounded-md bg-invalid-100 px-4 py-3 text-danger-600">
      {message}
    </p>
  );
}
