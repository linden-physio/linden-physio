import { auth, CONFIRM_PATH } from "./auth.ts";

// A new booking is held until the person opens a link we email them. The link is the same kind as the
// one to their bookings (Better Auth's magic link): it signs them in as that address, and then
// CONFIRM_PATH confirms their holds. So a booking counts only once someone shows the address is theirs,
// and a hold made with an address nobody reads lets its time go after 15 minutes.
// headers are the request's: the link goes back to the address it came to. Returns false if the email
// couldn't be sent.
export async function emailConfirmLink(email: string, headers: Headers): Promise<boolean> {
  try {
    await auth().api.signInMagicLink({
      body: { email, callbackURL: CONFIRM_PATH, errorCallbackURL: "/bookings" },
      headers,
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

// For the tests: sends nothing, and says it did.
export const noMail = async () => true;
