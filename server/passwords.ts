import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt) as (password: string, salt: Buffer, length: number) => Promise<Buffer>;

// A password, made into something that can be stored: "scrypt$<salt>$<hash>". scrypt is slow on
// purpose, so that someone who copies the table can try only a few guesses a second for each row.
// The salt is random for each password, so two people with the same password get different rows.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password.normalize("NFKC"), salt, 32);
  return ["scrypt", salt.toString("base64url"), hash.toString("base64url")].join("$");
}

// Whether a password is the one that was stored, by making it again with the same salt.
export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const made = await derive(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length);
  // Compare every byte, however early they differ, so the time taken gives nothing away.
  return timingSafeEqual(made, expected);
}
