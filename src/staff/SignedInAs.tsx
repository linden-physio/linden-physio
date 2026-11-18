import { signedIn } from "../session";
import { signOut } from "../staffActions";

// Who is signed in, under the clinic's name, and a way to sign out.
export async function SignedInAs() {
  const staff = await signedIn();
  if (!staff) return null;
  return (
    <form action={signOut} className="flex flex-col items-start gap-1 text-small">
      <span className="text-ink-600">{staff.name}</span>
      <button type="submit" className="text-brand-700 underline">
        Sign out
      </button>
    </form>
  );
}
