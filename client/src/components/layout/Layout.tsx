import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useAuthStore } from "../../store/authStore";
import { adminApi, usersApi } from "../../api";
import { OnboardingModal } from "../OnboardingModal";
import { useDarkModeInit } from "../../hooks/useDarkMode";
import { ProfileSummaryBar } from "./ProfileSummaryBar";
import { OfflineBanner } from "./OfflineBanner";
import { APP_EVENTS } from "../../lib/appEvents";
import { Button } from "../ui/Button";
import { useTranslation } from "../../i18n";

export function Layout() {
  useDarkModeInit();
  const { user, actorUser, impersonationToken, updateUser, stopImpersonation } = useAuthStore();
  const { t } = useTranslation();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Show onboarding if profile not complete and user hasn't dismissed this session.
    // profileComplete is set server-side when onboarding finishes, so it persists
    // across browsers and localStorage clears.
    const dismissed = localStorage.getItem(`fitai_onboarded_${user.id}`);
    if (!user.profileComplete && !dismissed) {
      // Small delay so the dashboard finishes rendering first
      const t = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(t);
    }
  }, [user?.id, user?.profileComplete]);

  useEffect(() => {
    const syncProfile = () => {
      usersApi.getProfile().then((r) => updateUser(r.data.user)).catch(() => {});
    };

    window.addEventListener(APP_EVENTS.dataChanged, syncProfile);
    return () => window.removeEventListener(APP_EVENTS.dataChanged, syncProfile);
  }, [updateUser]);

  const dismiss = () => {
    if (user) localStorage.setItem(`fitai_onboarded_${user.id}`, "true");
    setShowOnboarding(false);
  };

  const endImpersonation = async () => {
    try {
      await adminApi.stopImpersonation();
    } catch {
      // Keep local exit available even if the server-side stop call fails.
    } finally {
      stopImpersonation();
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <OfflineBanner />
      {impersonationToken && actorUser && user ? (
        <div className="fixed top-0 inset-x-0 z-[70] bg-amber-500 text-amber-950 border-b border-amber-600 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
            <div>
              <span className="font-semibold">{t("admin.readOnlyBannerTitle")}</span>
              <span className="ml-2">
                {t("admin.impersonationBanner", {
                  actor: actorUser.username,
                  user: user.username,
                })}
              </span>
            </div>
            <Button size="sm" variant="secondary" onClick={endImpersonation}>
              {t("admin.endImpersonation")}
            </Button>
          </div>
        </div>
      ) : null}
      <Sidebar />
      {/* pb-16 reserves space for the fixed bottom tab bar on mobile */}
      <main className={`flex-1 overflow-auto min-w-0 pb-16 md:pb-0 ${impersonationToken ? "pt-14 md:pt-12" : ""}`}>
        <ProfileSummaryBar />
        <Outlet />
      </main>
      <BottomNav />
      <OnboardingModal
        open={showOnboarding}
        onComplete={dismiss}
        onSkip={dismiss}
      />
    </div>
  );
}
