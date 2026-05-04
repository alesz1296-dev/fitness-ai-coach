import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import { OfflineBanner } from "./components/OfflineBanner";
import { InstallPrompt } from "./components/InstallPrompt";
import { useOfflineSync } from "./hooks/useOfflineSync";
import { authApi } from "./api";
import { useAuthStore } from "./store/authStore";

// Auth
import Login    from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// App pages
import Dashboard       from "./pages/dashboard/Dashboard";
import WorkoutsPage    from "./pages/workouts/WorkoutsPage";
import NutritionPage   from "./pages/nutrition/NutritionPage";
import ProgressPage    from "./pages/progress/ProgressPage";
import GoalsPage       from "./pages/goals/GoalsPage";
import ChatPage        from "./pages/chat/ChatPage";
import ReportsPage     from "./pages/reports/ReportsPage";
import SettingsPage    from "./pages/settings/SettingsPage";
import MealPlannerPage from "./pages/mealplanner/MealPlannerPage";

export default function App() {
  // Wire up online/offline listeners and SW message handler globally
  useOfflineSync();
  const { setAuth, clearAuth, setHydrating } = useAuthStore();

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setHydrating(true);
      try {
        const { data } = await authApi.refresh();
        if (active && data.user) {
          setAuth(data.user, data.accessToken);
        } else if (active) {
          clearAuth();
        }
      } catch {
        if (active) clearAuth();
      } finally {
        if (active) setHydrating(false);
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, [clearAuth, setAuth, setHydrating]);

  return (
    <BrowserRouter>
      <OfflineBanner />
      <InstallPrompt />
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="/workouts" element={<ErrorBoundary><WorkoutsPage /></ErrorBoundary>} />
            <Route path="/templates" element={<Navigate to="/workouts" replace />} />
            <Route path="/nutrition" element={<ErrorBoundary><NutritionPage /></ErrorBoundary>} />
            <Route path="/progress" element={<ErrorBoundary><ProgressPage /></ErrorBoundary>} />
            <Route path="/goals" element={<ErrorBoundary><GoalsPage /></ErrorBoundary>} />
            <Route path="/chat" element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
            <Route path="/meal-planner" element={<ErrorBoundary><MealPlannerPage /></ErrorBoundary>} />
            <Route path="/reports" element={<ErrorBoundary><ReportsPage /></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
