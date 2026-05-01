import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../api";

// Primary 5 items shown in the tab bar
const PRIMARY_ITEMS = [
  { to: "/dashboard",  icon: "⊞",  label: "Home" },
  { to: "/workouts",   icon: "🏋️", label: "Workouts" },
  { to: "/nutrition",  icon: "🥗", label: "Nutrition" },
  { to: "/chat",       icon: "🤖", label: "AI Coach" },
];

// Overflow items shown in the "More" sheet
const MORE_ITEMS = [
  { to: "/meal-planner", icon: "📅", label: "Meal Planner" },
  { to: "/progress",     icon: "📈", label: "Progress & Goals" },
  { to: "/reports",      icon: "📊", label: "Reports" },
  { to: "/settings",     icon: "⚙️", label: "Profile" },
];

// All routes that belong to "more" — used to highlight the More button when active
const MORE_PATHS = MORE_ITEMS.map((i) => i.to);

export function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const { logout } = useAuthStore();
  const navigate   = useNavigate();

  const handleLogout = async () => {
    setShowMore(false);
    const refreshToken = localStorage.getItem("refreshToken") ?? undefined;
    try { await authApi.logout(refreshToken); } catch { /* best-effort */ }
    logout();
    navigate("/login");
  };

  const isMoreActive = MORE_PATHS.some((p) => location.pathname.startsWith(p));

  return (
    <>
      {/* Bottom tab bar — visible only on mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-900 border-t border-gray-800"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
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

          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              isMoreActive && !showMore ? "text-brand-400" : "text-gray-400"
            }`}
          >
            <span className="text-xl leading-none">⋯</span>
            More
          </button>
        </div>
      </nav>

      {/* "More" slide-up sheet */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/60"
            onClick={() => setShowMore(false)}
          />

          {/* Sheet */}
          <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-900 rounded-t-2xl"
               style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-800">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">More</p>
            </div>

            {/* Items */}
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

            {/* Logout */}
            <div className="px-3 py-3 border-t border-gray-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <span className="text-lg">🚪</span>
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
