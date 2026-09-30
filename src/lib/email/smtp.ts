import nodemailer from "nodemailer";
import type { EmailSender } from "./index";

/**
 * SMTP sender. Defaults to Gmail (smtp.gmail.com:465), which is free, needs no domain and delivers
 * to any address. SMTP_USER is the Gmail address and SMTP_PASSWORD a Google app password, not the
 * account password. A fresh connection per send: serverless functions shouldn't hold a pool.
 */
export function smtpEmailSender(): EmailSender {
  const user = process.env.SMTP_USER ?? "";
  const port = Number(process.env.SMTP_PORT) || 465;
  const transport = () =>
    nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user, pass: (process.env.SMTP_PASSWORD ?? "").replace(/\s+/g, "") }, // app passwords are shown with spaces
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  const from = process.env.EMAIL_FROM || `"QuickCanteen" <${user}>`;

  return {
    name: "smtp",
    async send({ to, subject, text, html }) {
      await transport().sendMail({ from, to, subject, text, html });
    },
    async health() {
      if (!user || !process.env.SMTP_PASSWORD) return false;
      try {
        return await transport().verify();
      } catch (err) {
        console.error("[email] SMTP check failed", err instanceof Error ? err.message : err);
        return false;
      }
    },
  };
}
