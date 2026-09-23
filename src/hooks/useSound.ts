"use client";

import { useCallback, useEffect, useState } from "react";

// Sounds are short Web Audio oscillator tones, so the project needs no audio files.
const g = globalThis as unknown as { __ccAudio?: AudioContext | null };

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (g.__ccAudio === undefined) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    g.__ccAudio = AC ? new AC() : null;
  }
  return g.__ccAudio ?? null;
}

function tone(ac: AudioContext, freq: number, start: number, duration: number, type: OscillatorType = "sine", gain = 0.18) {
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  vol.gain.setValueAtTime(0, ac.currentTime + start);
  vol.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.02);
  vol.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(vol).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

export type SoundKind = "chime" | "new-order" | "error";

export function playSound(kind: SoundKind): void {
  const ac = ctx();
  if (!ac || ac.state !== "running") return;
  if (kind === "chime") {
    // Rising three-note "ready" chime.
    tone(ac, 659.25, 0, 0.45);
    tone(ac, 830.61, 0.14, 0.45);
    tone(ac, 987.77, 0.28, 0.7);
  } else if (kind === "new-order") {
    tone(ac, 880, 0, 0.18, "triangle", 0.2);
    tone(ac, 1174.66, 0.16, 0.3, "triangle", 0.2);
  } else {
    tone(ac, 220, 0, 0.3, "square", 0.08);
  }
}

/** Browsers block autoplay: audio is enabled only after a click, which also resumes the context. */
export function useSound() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const ac = ctx();
    if (!ac) return;
    const sync = () => setEnabled(ac.state === "running");
    sync();
    ac.addEventListener("statechange", sync);
    // Any tap on the page also unlocks audio for later events (e.g. "Ready" on the tracker).
    const unlock = () => void ac.resume();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      ac.removeEventListener("statechange", sync);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  const enable = useCallback(async () => {
    const ac = ctx();
    if (!ac) return;
    await ac.resume();
    setEnabled(ac.state === "running");
    playSound("new-order");
  }, []);

  return { enabled, enable, play: playSound };
}
