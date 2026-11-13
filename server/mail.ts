import nodemailer, { type Transporter } from "nodemailer";
import { setting } from "./env.ts";

// Who the clinic's mail comes from.
const from = "Linden Physio <hello@lindenphysio.com>";

// Mail goes out over SMTP, the protocol mail servers speak to each other, to the server in MAIL_URL.
// On this computer that's Mailpit (compose.yaml), which catches every mail and sends none on; you
// read them at http://localhost:8025.
let opened: Transporter | null = null;
function transport(): Transporter {
  opened ??= nodemailer.createTransport(setting("MAIL_URL"));
  return opened;
}

export async function sendMail(mail: { to: string; subject: string; text: string; html: string }) {
  await transport().sendMail({ from, ...mail });
}
