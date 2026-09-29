import { consoleEmailSender } from "./console";
import { smtpEmailSender } from "./smtp";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Anything that can deliver an email. Swap providers by adding one file here. */
export interface EmailSender {
  name: string;
  send(msg: EmailMessage): Promise<void>;
  /** True when the provider is reachable and accepts our login right now. */
  health(): Promise<boolean>;
}

export function getEmailSender(): EmailSender {
  return process.env.EMAIL_PROVIDER === "smtp" ? smtpEmailSender() : consoleEmailSender;
}
