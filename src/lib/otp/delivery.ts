import { getEmailSender } from "../email";
import { getSmsSender } from "../sms";
import { escapeHtml } from "../email/html";

export type OtpChannel = "email" | "sms";

/** Where order codes go. Email by default (free, no phone needed); OTP_CHANNEL=sms uses the SMS gateway. */
export function otpChannel(): OtpChannel {
  return process.env.OTP_CHANNEL === "sms" ? "sms" : "email";
}

export function maskPhone(phone: string): string {
  return `••••• •${phone.slice(-4)}`;
}

/** "sreevathson@gmail.com" -> "s•••••n@gmail.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "your email";
  const hidden = local.length <= 2 ? `${local[0]}•` : `${local[0]}•••••${local[local.length - 1]}`;
  return `${hidden}@${domain}`;
}

export function otpEmail(code: string, firstName: string) {
  const subject = `${code} is your QuickCanteen order code`;
  const text = `${code} is your QuickCanteen order code. Valid for 5 minutes. Do not share it.\n\nIf you didn't try to place an order, you can ignore this email.`;
  const html = `<!doctype html><html><body style="margin:0;background:#faf6ee;font-family:Arial,Helvetica,sans-serif;color:#1b1a17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#ffffff;border:1px solid #e1d8c6;border-radius:20px;overflow:hidden">
<tr><td style="background:#1f5e3b;color:#faf6ee;padding:20px 24px;font-size:18px;font-weight:bold">Canteen<span style="color:#e3a21a">.</span>live</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 8px;font-size:16px">Hi ${escapeHtml(firstName)},</p>
<p style="margin:0 0 20px;font-size:15px;color:#6b6558">Enter this code to confirm your order:</p>
<p style="margin:0 0 20px;text-align:center;font-size:40px;font-weight:bold;letter-spacing:12px;background:#fbebc6;border-radius:14px;padding:16px 0">${code}</p>
<p style="margin:0;font-size:13px;color:#6b6558">Valid for 5 minutes. Never share it. If you didn't try to order, ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}

interface Recipient {
  email: string;
  phone: string | null;
  name: string;
}

export interface OtpDelivery {
  channel: OtpChannel;
  provider: string;
  /** Masked destination shown to the student, e.g. "s•••••n@gmail.com". */
  maskedTo(user: Recipient): string;
  send(user: Recipient, code: string): Promise<void>;
  health(): Promise<boolean>;
}

export function getOtpDelivery(): OtpDelivery {
  if (otpChannel() === "sms") {
    const sms = getSmsSender();
    return {
      channel: "sms",
      provider: sms.name,
      maskedTo: (u) => `+91 ${maskPhone(u.phone ?? "")}`,
      send: (u, code) => sms.send(u.phone!, `${code} is your QuickCanteen order code. Valid for 5 minutes. Do not share it.`),
      health: () => sms.health(),
    };
  }
  const email = getEmailSender();
  return {
    channel: "email",
    provider: email.name,
    maskedTo: (u) => maskEmail(u.email),
    send: (u, code) => email.send({ to: u.email, ...otpEmail(code, u.name.split(/\s+/)[0] || "there") }),
    health: () => email.health(),
  };
}
