"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "../Field";
import { signIn } from "../staffActions";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Work email" id="email" name="email" type="email" required autoComplete="username" />
      <Field label="Password" id="password" name="password" type="password" required autoComplete="current-password" />
      <Button type="submit" disabled={pending}>
        Sign in
      </Button>
      <div role="status">
        {state && <p className="rounded-md bg-invalid-100 px-4 py-3 text-danger-600">{state.message}</p>}
      </div>
    </form>
  );
}
