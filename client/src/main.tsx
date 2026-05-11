import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";
import "./index.css";

const SW_UPDATE_EVENT = "fitai:sw-update-available";

// ── Register service worker for PWA / offline support ─────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(__APP_BUILD_ID__)}`)
      .then((reg) => {
        window.__FITAI_SW_REG__ = reg;
        console.info("[sw] registered:", reg.scope);

        const checkForUpdate = () => {
          void reg.update().catch(() => {});
        };

        const announceUpdate = () => {
          window.dispatchEvent(
            new CustomEvent(SW_UPDATE_EVENT, {
              detail: { buildId: __APP_BUILD_ID__, buildLabel: __APP_BUILD_LABEL__ },
            }),
          );
        };

        let reloadingForUpdate = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloadingForUpdate) return;
          reloadingForUpdate = true;
          window.location.reload();
        });

        if (reg.waiting) announceUpdate();

        reg.addEventListener("updatefound", () => {
          const nextWorker = reg.installing;
          if (!nextWorker) return;
          nextWorker.addEventListener("statechange", () => {
            if (nextWorker.state === "installed" && navigator.serviceWorker.controller) {
              announceUpdate();
            }
          });
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
