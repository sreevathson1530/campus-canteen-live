import { afterEach, describe, expect, it, vi } from "vitest";
import { getOtpDelivery, maskEmail, otpChannel, otpEmail } from "@/lib/otp/delivery";

afterEach(() => vi.unstubAllEnvs());

describe("otp delivery", () => {
  it("masks emails but keeps them recognisable", () => {
    expect(maskEmail("sreevathson1530@gmail.com")).toBe("s•••••0@gmail.com");
    expect(maskEmail("ab@x.in")).toBe("a•@x.in");
    expect(maskEmail("broken")).toBe("your email");
  });

  it("puts the code in the subject and body, and escapes the name", () => {
    const m = otpEmail("0421", "<Asha>");
    expect(m.subject).toBe("0421 is your QuickCanteen order code");
    expect(m.text).toContain("0421");
    expect(m.html).toContain("0421");
    expect(m.html).toContain("&lt;Asha&gt;");
    expect(m.html).not.toContain("<Asha>");
  });

  it("defaults to email; OTP_CHANNEL=sms switches to the phone", () => {
    expect(otpChannel()).toBe("email");
    const user = { email: "asha@canteen.test", phone: "+919000004821", name: "Asha" };
    expect(getOtpDelivery().maskedTo(user)).toBe("a•••••a@canteen.test");
    vi.stubEnv("OTP_CHANNEL", "sms");
    expect(getOtpDelivery().channel).toBe("sms");
    expect(getOtpDelivery().maskedTo(user)).toBe("+91 ••••• •4821");
  });

  it("SMTP without credentials reports offline instead of throwing", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    vi.stubEnv("SMTP_USER", "");
    expect(getOtpDelivery().provider).toBe("smtp");
    expect(await getOtpDelivery().health()).toBe(false);
  });
});
