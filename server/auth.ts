import { betterAuth } from "better-auth";
import { eq } from "drizzle-orm";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { APIError, createAuthMiddleware } from "better-auth/api";
import * as schema from "./auth-schema.ts";
import { businesses, staff } from "./schema.ts";
import { businessFor } from "./businesses.ts";
import { db } from "./db.ts";
import { setting } from "./env.ts";
import { sendMail } from "./mail.ts";

// Where the link that confirms a booking goes, once it has signed the person in (see holds.ts).
export const CONFIRM_PATH = "/bookings/confirm";

// How the member of staff with an address signs in ("microsoft" or "email"), or null for an address
// that isn't on any business's staff.
async function staffSignIn(email: string | undefined): Promise<string | null> {
  const [member] = await db()
    .select({ signIn: businesses.staffSignIn })
    .from(staff)
    .innerJoin(businesses, eq(staff.businessId, businesses.id))
    .where(eq(staff.email, email?.trim().toLowerCase() ?? ""));
  return member?.signIn ?? null;
}

// Signing in, by Better Auth. The people who book get a link by email (the magic-link plugin), which
// shows them their bookings, and so do the staff of a business without work accounts, like Birch Hair
// Studio. Linden's staff sign in with their work account in the clinic's Microsoft
// Entra ID (its tenant): Better Auth sends them to Microsoft, Microsoft sends them back with a code,
// and Better Auth swaps the code for an ID token that says who they are. Then it starts a session, as
// our own code did: a row in the session table, and a cookie with its token.
function makeAuth() {
  return betterAuth({
    // Each business's pages are at their own address, and the links in Better Auth's mail and its
    // redirects must go back to the one the request came to. These are the addresses it may use.
    baseURL: {
      allowedHosts: setting("BETTER_AUTH_HOSTS").split(","),
      fallback: setting("BETTER_AUTH_URL"),
    },
    // Signs the session cookie, and encrypts what Microsoft gave us. Keep it secret, like a password.
    secret: setting("BETTER_AUTH_SECRET"),
    database: drizzleAdapter(db(), { provider: "pg", schema }),
    socialProviders: {
      microsoft: {
        // The app registration in the clinic's Entra ID, and the tenant: only the clinic's own
        // accounts can sign in, not any Microsoft account.
        clientId: setting("ENTRA_CLIENT_ID"),
        clientSecret: setting("ENTRA_CLIENT_SECRET"),
        tenantId: setting("ENTRA_TENANT_ID"),
        prompt: "select_account",
        disableProfilePhoto: true,
        // Entra puts an email claim in the ID token only for an account that has a mailbox address,
        // and the clinic's accounts have none: Better Auth then refuses with ?error=email_not_found.
        // Their sign-in name (preferred_username, here karin@lindenphysio.com) is the address they're
        // known by. Microsoft says not to trust it from just any tenant, because whoever runs a tenant
        // chooses its names; this app takes only the clinic's own tenant, whose names the clinic chooses.
        mapProfileToUser: (profile) => ({ email: profile.email ?? profile.preferred_username }),
      },
    },
    // Anyone with an account in the clinic's Entra ID can get through Microsoft, the admin account
    // too. Let in through Microsoft only the people in the staff table, by their address, every time
    // they sign in.
    user: {
      validateUserInfo: async ({ user }, ctx) => {
        if (ctx.path.startsWith("/callback/") && (await staffSignIn(user.email)) !== "microsoft") {
          return { error: "not_staff", errorDescription: "Only the clinic's staff can sign in here." };
        }
      },
    },
    // And the other way round: a Linden staff address gets no link by email. They sign in only through
    // Microsoft, so turning off their Microsoft account is enough to keep them out.
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/magic-link" && (await staffSignIn(ctx.body?.email)) === "microsoft") {
          throw new APIError("FORBIDDEN", { message: "Staff sign in with their work account." });
        }
      }),
    },
    // Where a refused sign-in lands, with ?error=not_staff.
    onAPIError: { errorURL: "/sign-in" },
    // Microsoft's access and refresh tokens are stored encrypted, not as they came.
    account: { encryptOAuthTokens: true },
    session: { expiresIn: 7 * 24 * 60 * 60 },
    plugins: [
      // A link that signs someone in: a long random token in the address, which works once and for
      // 15 minutes. The table keeps only the token's hash, as film 37's sessions did.
      magicLink({
        expiresIn: 15 * 60,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          // From the business whose address the link is for.
          const business = await businessFor(db(), new URL(url).host);
          // A link that confirms a booking says so (see holds.ts).
          const confirming = new URL(url).searchParams.get("callbackURL") === CONFIRM_PATH;
          const [{ name, email: from }] = await db()
            .select({ name: businesses.name, email: businesses.email })
            .from(businesses)
            .where(eq(businesses.id, business));
          await sendMail({
            from: name + " <" + from + ">",
            to: email,
            subject: confirming ? "Confirm your booking at " + name : "Your link to " + name,
            text:
              (confirming ? "Open this link to confirm your booking at " : "Open this link to sign in to ") +
              name +
              ":\n\n" +
              url +
              "\n\nIt works once, for 15 minutes. If you didn't ask for it, you can ignore this email.\n",
            html: `<p>${confirming ? "Open this link to confirm your booking at" : "Open this link to sign in to"} ${name}:</p><p><a href="${url}">${confirming ? "Confirm my booking" : "Sign in"}</a></p><p>It works once, for 15 minutes. If you didn't ask for it, you can ignore this email.</p>`,
          });
        },
      }),
      // Lets Better Auth set cookies from inside a server action. (Last, as its docs ask.)
      nextCookies(),
    ],
  });
}

// Made the first time something asks for it, like the database: next build loads every file.
let made: ReturnType<typeof makeAuth> | null = null;
export function auth() {
  made ??= makeAuth();
  return made;
}
