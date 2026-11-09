"use client";

import { useEffect, useRef, useState } from "react";

export default function PwaStatus() {
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [waiting, setWaiting] = useState(null);
  const [message, setMessage] = useState("");
  const userRequestedUpdate = useRef(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    const install = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const installed = () => {
      setInstallPrompt(null);
      setMessage(
        "App installed. WebMCP availability still depends on your browser.",
      );
    };
    const changed = () => {
      if (userRequestedUpdate.current) window.location.reload();
    };
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", installed);
    navigator.serviceWorker?.addEventListener("controllerchange", changed);
    let disposed = false;
    let registration;
    let watchUpdate;

    // Avoid a development worker serving a stale build during hot reload.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((value) => {
          if (disposed) return;
          registration = value;
          if (value.waiting) setWaiting(value.waiting);
          watchUpdate = () => {
            const worker = value.installing;
            worker?.addEventListener("statechange", () => {
              if (
                !disposed &&
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              )
                setWaiting(value.waiting);
            });
          };
          value.addEventListener("updatefound", watchUpdate);
        })
        .catch(() => {
          if (!disposed)
            setMessage(
              "Offline support is unavailable in this browser. The online demo still works.",
            );
        });
    }
    return () => {
      disposed = true;
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", installed);
      navigator.serviceWorker?.removeEventListener("controllerchange", changed);
      registration?.removeEventListener("updatefound", watchUpdate);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {
      setMessage(
        "Use your browser’s app installation menu if the prompt is unavailable.",
      );
    } finally {
      setInstallPrompt(null);
    }
  }
  function update() {
    if (!waiting) return;
    // The button states the consequence; no silent reload during checkout.
    userRequestedUpdate.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <aside className="pwa-status" aria-label="App installation and connection">
      <p id="network-status" role="status">
        {online
          ? "Online demo"
          : "You’re offline. Changes and confirmation are paused until you reconnect."}
      </p>
      <div>
        {installPrompt && (
          <button className="text-button" id="install-app" onClick={install}>
            Install app
          </button>
        )}
        {waiting && (
          <button className="text-button" id="update-app" onClick={update}>
            Update app · resets demo
          </button>
        )}
        <details>
          <summary>Install & offline info</summary>
          <p>
            Use your browser’s Install app menu, Add to Dock, or Add to Home
            Screen when available. Installation does not enable WebMCP.
          </p>
          <p>
            Offline navigation shows a reconnect screen. Baskets, tickets,
            receipts, and checkout actions are never stored by the service
            worker. Updates wait for you to choose a reload.
          </p>
        </details>
      </div>
      {message && <p role="status">{message}</p>}
    </aside>
  );
}
