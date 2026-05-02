import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useAuthStore } from "../../store/authStore";
import { OnboardingModal } from "../OnboardingModal";
import { useDarkModeInit } from "../../hooks/useDarkMode";
import { ProfileSummaryBar } from "./ProfileSummaryBar";
import { OfflineBanner } from "./OfflineBanner";

export function Layout() {
  useDarkModeInit();
  const { user } = useAuthStore();
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

  const dismiss = () => {
    if (user) localStorage.setItem(`fitai_onboarded_${user.id}`, "true");
    setShowOnboarding(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <OfflineBanner />
      <Sidebar />
      {/* pb-16 reserves space for the fixed bottom tab bar on mobile */}
      <main className="flex-1 overflow-auto min-w-0 pb-16 md:pb-0">
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
