"use client";

import { Download, Share2, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};


function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

export function InstallAppButton({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);
    setInstalled(isStandalone());
    setInstallable(Boolean((window as typeof window & { __cutflowInstallPrompt?: InstallPromptEvent }).__cutflowInstallPrompt));

    const ready = () => setInstallable(true);
    const complete = () => {
      setInstalled(true);
      setInstallable(false);
    };
    window.addEventListener("cutflow-install-ready", ready);
    window.addEventListener("appinstalled", complete);
    return () => {
      window.removeEventListener("cutflow-install-ready", ready);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);

  async function install() {
    if (installed) return;
    const prompt = (window as typeof window & { __cutflowInstallPrompt?: InstallPromptEvent }).__cutflowInstallPrompt;
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setInstallable(false);
        (window as typeof window & { __cutflowInstallPrompt?: InstallPromptEvent }).__cutflowInstallPrompt = undefined;
      }
      return;
    }
    setShowHelp(true);
  }

  return (
    <>
      <button type="button" className={`${compact ? "install-app-button compact" : "install-app-button"} ${className}`.trim()} onClick={install} disabled={installed}>
        <Download size={compact ? 16 : 18} />
        <span>{installed ? "Installed" : installable ? "Install CutFlow" : "Add CutFlow to phone"}</span>
      </button>
      {showHelp && (
        <div className="install-modal-layer" role="dialog" aria-modal="true" aria-label="Install CutFlow">
          <button className="install-modal-scrim" onClick={() => setShowHelp(false)} aria-label="Close install instructions" />
          <section className="install-modal">
            <header><span><Smartphone /></span><div><small>USE CUTFLOW LIKE AN APP</small><h2>Add CutFlow to your Home Screen</h2></div><button onClick={() => setShowHelp(false)} aria-label="Close"><X /></button></header>
            {isIos ? (
              <ol>
                <li><span>1</span><div><b>Open CutFlow in Safari</b><p>Apple only allows Home Screen installation from Safari.</p></div></li>
                <li><span>2</span><div><b>Tap the Share button</b><p>Look for the square with the upward arrow. <Share2 size={16}/></p></div></li>
                <li><span>3</span><div><b>Choose “Add to Home Screen”</b><p>Confirm the CutFlow name and tap Add.</p></div></li>
              </ol>
            ) : (
              <ol>
                <li><span>1</span><div><b>Open the browser menu</b><p>In Chrome, tap the three-dot menu.</p></div></li>
                <li><span>2</span><div><b>Choose “Install app”</b><p>Some Android devices label it “Add to Home screen.”</p></div></li>
                <li><span>3</span><div><b>Confirm installation</b><p>CutFlow will open from your Home Screen in its own app window.</p></div></li>
              </ol>
            )}
            <button className="button" onClick={() => setShowHelp(false)}>Got it</button>
          </section>
        </div>
      )}
    </>
  );
}
