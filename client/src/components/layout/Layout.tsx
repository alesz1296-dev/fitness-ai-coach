import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuthStore } from "../../store/authStore";
import { OnboardingModal } from "../OnboardingModal";

export function Layout() {
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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <OnboardingModal
        open={showOnboarding}
        onComplete={dismiss}
        onSkip={dismiss}
      />
    </div>
  );
}
