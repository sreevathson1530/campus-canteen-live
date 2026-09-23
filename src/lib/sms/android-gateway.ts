import type { SmsSender } from "./index";

/**
 * SMS Gateway for Android (https://github.com/capcom6/android-sms-gateway), "Local server" mode.
 * The phone's SIM sends the message, so there are no per-message fees.
 * Env: SMS_GATEWAY_URL (e.g. http://192.168.1.50:8080), SMS_GATEWAY_USER, SMS_GATEWAY_PASSWORD.
 */
export function androidGatewaySender(): SmsSender {
  const base = (process.env.SMS_GATEWAY_URL ?? "").replace(/\/+$/, "");
  const auth = "Basic " + Buffer.from(`${process.env.SMS_GATEWAY_USER ?? ""}:${process.env.SMS_GATEWAY_PASSWORD ?? ""}`).toString("base64");

  return {
    name: "android-gateway",
    async send(to, text) {
      if (!base) throw new Error("SMS_GATEWAY_URL is not set");
      const res = await fetch(`${base}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({ textMessage: { text }, phoneNumbers: [to] }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Gateway responded ${res.status}`);
    },
    async health() {
      if (!base) return false;
      try {
        const res = await fetch(`${base}/health`, { headers: { Authorization: auth }, signal: AbortSignal.timeout(3000) });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}
