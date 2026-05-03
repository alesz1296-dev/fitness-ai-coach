import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";
import "./index.css";

// ── Register service worker for PWA / offline support ─────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.info("[sw] registered:", reg.scope);

        const checkForUpdate = () => {
          void reg.update().catch(() => {});
        };

        let reloadingForUpdate = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloadingForUpdate) return;
          reloadingForUpdate = true;
          window.location.reload();
        });

        // Ask for updates when the tab is active so users don't need to clear cache manually.
        checkForUpdate();
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdate();
        });
        window.addEventListener("focus", checkForUpdate);
        window.setInterval(checkForUpdate, 30 * 60 * 1000);
      })
      .catch((err) => console.warn("[sw] registration failed:", err));
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
