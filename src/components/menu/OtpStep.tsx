import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { api, ClientApiError } from "@/lib/client-api";
import { formatRupees } from "@/lib/money";

interface SendResult {
  expiresAt: string;
  resendAt: string;
  maskedPhone: string;
}

function useCountdown(targetIso: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetIso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [targetIso]);
  return targetIso ? Math.max(0, Math.ceil((new Date(targetIso).getTime() - now) / 1000)) : 0;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Sends a code to the student's phone, collects the 4 digits and returns a single-use token.
 * The code field supports the phone's automatic one-time-code fill.
 */
export function OtpStep({
  totalPaise,
  onVerified,
  onBack,
  busy,
}: {
  totalPaise: number;
  onVerified: (otpToken: string) => Promise<void>;
  onBack: () => void;
  busy: boolean;
}) {
  const [sent, setSent] = useState<SendResult | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const resendIn = useCountdown(sent?.resendAt ?? null);
  const expiresIn = useCountdown(sent?.expiresAt ?? null);
  const startedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      setSent(await api<SendResult>("/api/otp/send", { method: "POST" }));
      setCode("");
    } catch (e) {
      if (e instanceof ClientApiError && e.code === "RATE_LIMITED" && sent === null) {
        // A code was sent a moment ago (e.g. the sheet was reopened): let them type it.
        const wait = Number(e.details.retryAfterSeconds ?? 30);
        setSent({ expiresAt: new Date(Date.now() + 4.5 * 60_000).toISOString(), resendAt: new Date(Date.now() + wait * 1000).toISOString(), maskedPhone: "your phone" });
        setError(e.message);
      } else {
        setError(e instanceof ClientApiError ? e.message : "Couldn't send the code. Check your connection.");
      }
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void send();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once when the step opens
  }, []);

  // The field is disabled until a code is sent, so focus it (and let SMS auto-fill land) once it is.
  useEffect(() => {
    if (sent) requestAnimationFrame(() => inputRef.current?.focus());
  }, [sent]);

  async function verify(value: string) {
    if (value.length !== 4 || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const { otpToken } = await api<{ otpToken: string }>("/api/otp/verify", { body: { code: value } });
      await onVerified(otpToken);
    } catch (e) {
      setCode("");
      setError(e instanceof ClientApiError ? e.message : "Couldn't verify. Check your connection.");
      requestAnimationFrame(() => inputRef.current?.focus());
    } finally {
      setVerifying(false);
    }
  }

  const working = verifying || busy;

  return (
    <div className="grid gap-4 px-5 pb-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-leaf-soft text-leaf">
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <h3 className="font-display text-xl font-extrabold">Confirm it&apos;s you</h3>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {sending && !sent ? "Sending a 4-digit code…" : sent ? <>We sent a 4-digit code to <b className="text-foreground">+91 {sent.maskedPhone}</b></> : "We couldn't send a code yet."}
          </p>
        </div>
      </div>

      <div className="flex justify-center py-1">
        <InputOTP
          maxLength={4}
          value={code}
          onChange={(v) => {
            setCode(v.replace(/\D/g, ""));
            setError(null);
          }}
          onComplete={verify}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="^[0-9]*$"
          disabled={working || !sent}
          ref={inputRef}
          aria-label="4-digit code"
        >
          <InputOTPGroup className="gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <InputOTPSlot key={i} index={i} className="size-14 rounded-2xl border text-2xl font-extrabold first:rounded-2xl last:rounded-2xl" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-chili-soft px-3 py-2 text-center text-sm font-medium text-chili">
          {error}
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground tabular">
        {sent && expiresIn > 0 ? <>Code expires in {mmss(expiresIn)} · </> : sent ? <>Code expired · </> : null}
        {resendIn > 0 ? (
          <>Resend in 0:{String(resendIn).padStart(2, "0")}</>
        ) : (
          <button type="button" className="font-semibold text-leaf underline-offset-4 hover:underline disabled:opacity-50" onClick={send} disabled={sending}>
            Resend code
          </button>
        )}
      </p>

      <Button size="xl" onClick={() => verify(code)} disabled={code.length !== 4 || working}>
        {working ? "Placing your order…" : `Verify & place order · ${formatRupees(totalPaise)}`}
      </Button>
      <Button variant="ghost" onClick={onBack} disabled={working} className="h-10 font-semibold text-leaf">
        Back to cart
      </Button>
    </div>
  );
}
