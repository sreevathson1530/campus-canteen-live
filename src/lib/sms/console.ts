import type { SmsSender } from "./index";

/** Development sender: prints the message in the server terminal. */
export const consoleSender: SmsSender = {
  name: "console",
  async send(to, text) {
    if (process.env.NODE_ENV === "test") return;
    console.log(`\n📱 SMS to ${to}: ${text}\n`);
  },
  async health() {
    return true;
  },
};
