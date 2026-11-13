import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { setting } from "./env.ts";

// A mail to send. from is like "Linden Physio <hello@lindenphysio.com>".
type Mail = { from: string; to: string; subject: string; text: string; html: string };

// In production, mail goes through Resend, an email provider, over its HTTP API. Resend refuses to
// send from a business's domain until the domain's DNS records say it may (SPF) and publish the key
// it signs with (DKIM). Gmail then checks both, and DMARC, before it trusts the mail.
async function sendWithResend(mail: Mail, key: string) {
  const { error } = await new Resend(key).emails.send(mail);
  // Resend answers with an error instead of throwing, like "The lindenphysio.com domain is not
  // verified." Throw it, so it isn't lost.
  if (error) throw new Error("Resend refused the mail: " + error.message);
}

// On this computer, mail goes over SMTP, the protocol mail servers speak to each other, to the server
// in MAIL_URL: Mailpit (compose.yaml), which catches every mail and sends none on. Read them at
// http://localhost:8025.
let opened: Transporter | null = null;
function transport(): Transporter {
  opened ??= nodemailer.createTransport(setting("MAIL_URL"));
  return opened;
}

export async function sendMail(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (key) await sendWithResend(mail, key);
  else await transport().sendMail(mail);
}
