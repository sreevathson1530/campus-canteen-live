import type { SmsSender } from "./index";

/**
 * SMS Gateway for Android (https://github.com/capcom6/android-sms-gateway). The phone's SIM sends
 * the message, so there are no per-message fees.
 *
 * - "local": the app's Local server on the same Wi-Fi as this server (LAN demo).
 *     SMS_GATEWAY_URL=http://192.168.1.50:8080 → POST {url}/message
 * - "cloud": the app's free Cloud server, so the phone can be on any network (hosted deploys).
 *     SMS_GATEWAY_URL defaults to https://api.sms-gate.app/3rdparty/v1 → POST {url}/messages
 *
 * Both use Basic auth with the username/password shown in the app (SMS_GATEWAY_USER / _PASSWORD).
 */
export function androidGatewaySender(mode: "local" | "cloud"): SmsSender {
  const base = (process.env.SMS_GATEWAY_URL || (mode === "cloud" ? "https://api.sms-gate.app/3rdparty/v1" : ""))
    .replace(/\/+$/, "");
  const auth = "Basic " + Buffer.from(`${process.env.SMS_GATEWAY_USER ?? ""}:${process.env.SMS_GATEWAY_PASSWORD ?? ""}`).toString("base64");
  const sendPath = mode === "cloud" ? "/messages" : "/message";
  const healthUrl = mode === "cloud" ? `${new URL(base || "https://api.sms-gate.app").origin}/health` : `${base}/health`;

  return {
    name: mode === "cloud" ? "android-gateway-cloud" : "android-gateway",
    async send(to, text) {
      if (!base) throw new Error("SMS_GATEWAY_URL is not set");
      if (!process.env.SMS_GATEWAY_USER || !process.env.SMS_GATEWAY_PASSWORD) throw new Error("SMS gateway credentials are not set");
      const res = await fetch(`${base}${sendPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({ textMessage: { text }, phoneNumbers: [to] }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Gateway responded ${res.status}`);
    },
    async health() {
      if (!base) return false;
      try {
        const res = await fetch(healthUrl, { headers: { Authorization: auth }, signal: AbortSignal.timeout(4000) });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}
