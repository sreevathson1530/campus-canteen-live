import type { EmailSender } from "./index";

/** Development sender: prints the email in the server terminal (or the Vercel logs). */
export const consoleEmailSender: EmailSender = {
  name: "console",
  async send({ to, text }) {
    if (process.env.NODE_ENV === "test") return;
    console.log(`\n✉️ Email to ${to}: ${text.split("\n")[0]}\n`);
  },
  async health() {
    return true;
  },
};
