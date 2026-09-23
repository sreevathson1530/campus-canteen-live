import { androidGatewaySender } from "./android-gateway";
import { consoleSender } from "./console";

/** Anything that can deliver a text message. Swap providers by adding one file here. */
export interface SmsSender {
  name: string;
  send(to: string, text: string): Promise<void>;
  /** True when the provider is reachable right now. */
  health(): Promise<boolean>;
}

export function getSmsSender(): SmsSender {
  return process.env.SMS_PROVIDER === "android-gateway" ? androidGatewaySender() : consoleSender;
}
