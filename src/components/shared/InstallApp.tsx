"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const noop = () => () => {};
/** iPhone/iPad Safari has no install prompt: people add the app from the Share menu. */
const isIosBrowser = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches && !("standalone" in navigator && navigator.standalone);

/**
 * "Install app" button. Android/desktop Chrome: opens the browser's install prompt. iPhone: shows
 * the two taps to add it to the Home Screen. Renders nothing once installed or where unsupported.
 */
export function InstallApp({ className }: { className?: string }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const ios = useSyncExternalStore(noop, isIosBrowser, () => false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt && !ios) return null;

  return (
    <div className={cn("inline-flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={async () => {
          if (!prompt) return setShowIosHelp((v) => !v);
          await prompt.prompt();
          if ((await prompt.userChoice).outcome === "accepted") setPrompt(null);
        }}
        aria-expanded={ios && !prompt ? showIosHelp : undefined}
        className="inline-flex items-center gap-2 rounded-lg border border-white/50 px-5 py-3 font-semibold hover:bg-white/10"
      >
        <Download className="size-4" /> Install app
      </button>
      {showIosHelp && (
        <p role="status" className="max-w-xs rounded-lg bg-white/15 px-3 py-2 text-sm">
          Tap <Share className="inline size-4 align-text-bottom" aria-label="Share" /> in Safari, then <b>Add to Home Screen</b>.
        </p>
      )}
    </div>
  );
}
