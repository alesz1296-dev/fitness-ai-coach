import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../api";
import { useTranslation } from "../../i18n";

const MORE_PATHS = ["/meal-planner", "/progress", "/reports", "/settings"];

export function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const { logout } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const PRIMARY_ITEMS = [
    { to: "/dashboard", icon: "⊞", label: t("nav.dashboard") },
    { to: "/workouts", icon: "🏋️", label: t("nav.workouts") },
    { to: "/nutrition", icon: "🥗", label: t("nav.nutrition") },
    { to: "/goals", icon: "🎯", label: t("nav.goals") },
    { to: "/chat", icon: "🤖", label: t("nav.aiCoach") },
  ];

  const MORE_ITEMS = [
    { to: "/meal-planner", icon: "📋", label: t("nav.mealPlanner") },
    { to: "/progress", icon: "📈", label: t("nav.progress") },
    { to: "/reports", icon: "📊", label: t("nav.reports") },
    { to: "/settings", icon: "⚙️", label: t("nav.settings") },
  ];

  const handleLogout = async () => {
    setShowMore(false);
    try {
      await authApi.logout();
    } catch {
      /* best-effort */
    }
    logout();
    navigate("/login");
  };

  const isMoreActive = MORE_PATHS.some((p) => location.pathname.startsWith(p));

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-900 border-t border-gray-800"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-14">
          {PRIMARY_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-brand-400" : "text-gray-400"
                }`
              }
            >
              <span className="text-xl leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <button
            onClick={() => setShowMore(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              isMoreActive && !showMore ? "text-brand-400" : "text-gray-400"
            }`}
          >
            <span className="text-xl leading-none">⋯</span>
            {t("nav.more")}
          </button>
        </div>
      </nav>

      {showMore && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/60"
            onClick={() => setShowMore(false)}
          />

          <div
            className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-900 rounded-t-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-700 rounded-full" />
            </div>

            <div className="px-5 py-3 border-b border-gray-800">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("nav.more")}</p>
            </div>

            <div className="px-3 py-3 space-y-0.5">
              {MORE_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-600 text-white"
                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                    }`
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="px-3 py-3 border-t border-gray-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <span className="text-lg">🚪</span>
                {t("auth.logout")}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
