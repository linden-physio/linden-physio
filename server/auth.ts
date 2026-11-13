import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import * as schema from "./auth-schema.ts";
import { db } from "./db.ts";
import { setting } from "./env.ts";

// Signing in, by Better Auth. The staff sign in with their work account in the clinic's Microsoft
// Entra ID (its tenant): Better Auth sends them to Microsoft, Microsoft sends them back with a code,
// and Better Auth swaps the code for an ID token that says who they are. Then it starts a session, as
// our own code did: a row in the session table, and a cookie with its token.
function makeAuth() {
  return betterAuth({
    baseURL: setting("BETTER_AUTH_URL"),
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
      },
    },
    // Microsoft's access and refresh tokens are stored encrypted, not as they came.
    account: { encryptOAuthTokens: true },
    session: { expiresIn: 7 * 24 * 60 * 60 },
    // Lets Better Auth set cookies from inside a server action.
    plugins: [nextCookies()],
  });
}

// Made the first time something asks for it, like the database: next build loads every file.
let made: ReturnType<typeof makeAuth> | null = null;
export function auth() {
  made ??= makeAuth();
  return made;
}
