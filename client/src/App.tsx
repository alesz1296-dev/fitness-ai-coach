import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

// Auth
import Login    from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// App pages
import Dashboard    from "./pages/dashboard/Dashboard";
import WorkoutsPage from "./pages/workouts/WorkoutsPage";
import NutritionPage from "./pages/nutrition/NutritionPage";
import ProgressPage from "./pages/progress/ProgressPage";
import GoalsPage    from "./pages/goals/GoalsPage";
import ChatPage     from "./pages/chat/ChatPage";
import ReportsPage  from "./pages/reports/ReportsPage";
import SettingsPage from "./pages/settings/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/workouts"  element={<WorkoutsPage />} />
            <Route path="/templates" element={<Navigate to="/workouts" replace />} />
            <Route path="/nutrition" element={<NutritionPage />} />
            <Route path="/progress"  element={<ProgressPage />} />
            <Route path="/goals"     element={<GoalsPage />} />
            <Route path="/chat"      element={<ChatPage />} />
            <Route path="/reports"   element={<ReportsPage />} />
            <Route path="/settings"  element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
