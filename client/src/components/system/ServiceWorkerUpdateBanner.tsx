import { useEffect, useState } from "react";
import { APP_BUILD_LABEL } from "../../lib/buildInfo";
import { Button } from "../ui/Button";
import { useTranslation } from "../../i18n";

const SW_UPDATE_EVENT = "fitai:sw-update-available";

export function ServiceWorkerUpdateBanner() {
  const { t } = useTranslation();
  const [updateReady, setUpdateReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handler = () => setUpdateReady(true);
    window.addEventListener(SW_UPDATE_EVENT, handler);
    return () => window.removeEventListener(SW_UPDATE_EVENT, handler);
  }, []);

  if (!updateReady) return null;

  const refreshApp = () => {
    setRefreshing(true);
    const registration = window.__FITAI_SW_REG__;
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }
    window.location.reload();
  };

  return (
    <div className="fixed top-3 left-1/2 z-[80] w-[min(92vw,38rem)] -translate-x-1/2 rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-brand-800 dark:bg-gray-900/95">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("settings.updateReadyTitle")}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("settings.updateReadyBody", { build: APP_BUILD_LABEL })}
          </p>
        </div>
        <Button size="sm" onClick={refreshApp} loading={refreshing}>
          {t("settings.refreshApp")}
        </Button>
      </div>
    </div>
  );
}
