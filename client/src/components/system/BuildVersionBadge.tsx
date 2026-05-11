import { APP_BUILD_ID, APP_VERSION } from "../../lib/buildInfo";

export function BuildVersionBadge() {
  return (
    <div className="pointer-events-none fixed left-3 bottom-20 md:bottom-3 z-40 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-gray-600 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300">
      {`v${APP_VERSION} / ${APP_BUILD_ID}`}
    </div>
  );
}
