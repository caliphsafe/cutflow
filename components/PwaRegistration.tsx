"use client";

import { useEffect } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};


export function PwaRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      (window as typeof window & { __cutflowInstallPrompt?: InstallPromptEvent }).__cutflowInstallPrompt = event as InstallPromptEvent;
      window.dispatchEvent(new Event("cutflow-install-ready"));
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () => window.removeEventListener("beforeinstallprompt", capturePrompt);
  }, []);
  return null;
}
