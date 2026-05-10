import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../api";
import { useTranslation } from "../../i18n";

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isCoachShell = user?.role === "coach";
  const isAdminShell = user?.role === "admin" || user?.role === "developer";

  const navItems = [
    { to: "/dashboard", icon: "\u{1F3E0}", label: t("nav.dashboard") },
    { to: "/notifications", icon: "\u{1F514}", label: t("nav.notifications") },
    { to: "/workouts", icon: "\u{1F3CB}\uFE0F", label: t("nav.workouts") },
    { to: "/nutrition", icon: "\u{1F34E}", label: t("nav.nutrition") },
    { to: "/goals", icon: "\u{1F3AF}", label: t("nav.goals") },
    { to: "/chat", icon: "\u{1F916}", label: t("nav.aiCoach") },
    { to: "/meal-planner", icon: "\u{1F37D}\uFE0F", label: t("nav.mealPlanner") },
    { to: "/progress", icon: "\u{1F4C8}", label: t("nav.progress") },
    { to: "/reports", icon: "\u{1F4CB}", label: t("nav.reports") },
    { to: "/settings", icon: "\u2699\uFE0F", label: t("nav.settings") },
  ];

  if (isCoachShell || isAdminShell) {
    navItems.push({ to: "/coach", icon: "\u{1F465}", label: t("nav.coachMode") });
  }
  if (isAdminShell) {
    navItems.push({ to: "/internal", icon: "\u{1F6E0}\uFE0F", label: t("nav.adminMode") });
  }

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* best-effort */
    }
    logout();
    navigate("/login");
  };

  return (
    <aside className="hidden md:flex md:flex-col w-60 min-h-screen bg-gray-900 shrink-0">
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            F
          </div>
          <span className="text-white font-semibold text-lg">FitAI Coach</span>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {user?.username?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-medium truncate">{user?.username}</p>
            <p className="text-gray-400 text-xs truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            <span className="emoji-glyph text-base leading-none w-6 text-center">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <span className="emoji-glyph text-base leading-none w-6 text-center">
            {"\u21A9\uFE0F"}
          </span>
          {t("auth.logout")}
        </button>
      </div>
    </aside>
  );
}
