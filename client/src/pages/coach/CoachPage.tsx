import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { coachApi } from "../../api";
import type { CoachClientLink, CoachDashboardSummary, CoachLibraryFavorite, MealPlan, WorkoutTemplate } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";

export default function CoachPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [clients, setClients] = useState<CoachClientLink[]>([]);
  const [dashboard, setDashboard] = useState<CoachDashboardSummary | null>(null);
  const [libraryFavorites, setLibraryFavorites] = useState<CoachLibraryFavorite[]>([]);
  const [libraryTemplates, setLibraryTemplates] = useState<WorkoutTemplate[]>([]);
  const [libraryMealPlans, setLibraryMealPlans] = useState<MealPlan[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !["coach", "admin", "developer"].includes(user.role ?? "user")) {
      navigate("/dashboard", { replace: true });
      return;
    }
    Promise.all([
      coachApi.getClients(),
      coachApi.getDashboard(),
      coachApi.getLibrary(),
    ])
      .then(([clientsRes, dashboardRes, libraryRes]) => {
        setClients(clientsRes.data.clients);
        setDashboard(dashboardRes.data);
        setLibraryFavorites(libraryRes.data.favorites ?? []);
        setLibraryTemplates(libraryRes.data.templates ?? []);
        setLibraryMealPlans(libraryRes.data.mealPlans ?? []);
      })
      .finally(() => setLoading(false));
  }, [navigate, user]);

  const handleCreateInvite = async () => {
    setCreating(true);
    try {
      const res = await coachApi.createInvite(7);
      setInviteCode(res.data.invite.code);
    } finally {
      setCreating(false);
    }
  };

  const toggleFavorite = async (itemType: "template" | "meal", sourceId: number) => {
    setTogglingFavorite(`${itemType}:${sourceId}`);
    try {
      await coachApi.toggleLibraryFavorite({ itemType, sourceId });
      const res = await coachApi.getLibrary();
      setLibraryFavorites(res.data.favorites ?? []);
      setLibraryTemplates(res.data.templates ?? []);
      setLibraryMealPlans(res.data.mealPlans ?? []);
    } finally {
      setTogglingFavorite(null);
    }
  };

  const isFavorite = (itemType: "template" | "meal", sourceId: number) =>
    libraryFavorites.some((favorite) => favorite.itemType === itemType && favorite.sourceId === sourceId);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("coach.title")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("coach.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader title={t("coach.needsAttentionToday")} />
          <div className="space-y-3">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-xs text-gray-400">{t("coach.totalClients")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.totalClients ?? clients.length}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-xs text-gray-400">{t("coach.pendingProposals")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.pendingProposals ?? 0}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-xs text-gray-400">{t("coach.overdueCheckIns")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.overdueCheckIns ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader title={t("coach.attentionClients")} subtitle={t("coach.attentionClientsSub")} />
          {(dashboard?.attentionClients ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">{t("coach.noNotifications")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {dashboard!.attentionClients.map((entry) => (
                <div key={entry.client.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {entry.client.firstName || entry.client.username} {entry.client.lastName || ""}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.latestWeekStart ? `${entry.latestWeekStart}` : t("coach.noWeeklyCheckIns")}
                      </p>
                    </div>
                    <span className="text-[11px] rounded-full bg-amber-100 text-amber-700 px-2 py-1 font-semibold">
                      {entry.pendingProposals}
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    {entry.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2">
                        <span className="text-brand-500">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <Link
                      to={`/coach/clients/${entry.client.id}`}
                      className="inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed bg-brand-600 hover:bg-brand-700 text-white shadow-sm px-3 py-1.5 text-xs flex-1"
                    >
                      {t("coach.open")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t("coach.notifications")} subtitle={t("coach.notificationsSub")} />
          <div className="space-y-3">
            {(dashboard?.recentNotifications ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">{t("coach.noNotifications")}</p>
            ) : (
              dashboard!.recentNotifications.map((notification) => (
                <div key={notification.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{notification.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.body}</p>
                    </div>
                    <span className="text-[11px] rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-1 text-gray-600 dark:text-gray-300">
                      {notification.type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t("coach.reusableLibraries")} subtitle={t("coach.reusableLibrariesSub")} />
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("coach.workoutLibraries")}</p>
              <div className="mt-2 space-y-2">
                {libraryTemplates.filter((tpl) => isFavorite("template", tpl.id)).slice(0, 4).map((tpl) => (
                  <div key={tpl.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{tpl.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{tpl.splitType}</p>
                      </div>
                      <Button size="sm" variant="secondary" loading={togglingFavorite === `template:${tpl.id}`} onClick={() => void toggleFavorite("template", tpl.id)}>
                        {isFavorite("template", tpl.id) ? "★" : "☆"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("coach.mealLibraries")}</p>
              <div className="mt-2 space-y-2">
                {libraryMealPlans.filter((plan) => isFavorite("meal", plan.id)).slice(0, 4).map((plan) => (
                  <div key={plan.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{plan.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{plan.durationWeeks}w</p>
                      </div>
                      <Button size="sm" variant="secondary" loading={togglingFavorite === `meal:${plan.id}`} onClick={() => void toggleFavorite("meal", plan.id)}>
                        {isFavorite("meal", plan.id) ? "★" : "☆"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title={t("coach.inviteClient")} />
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("coach.inviteClientBody")}
            </p>
            <Button onClick={handleCreateInvite} loading={creating}>
              {t("coach.createInviteCode")}
            </Button>
            {inviteCode && (
              <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 p-3">
                <p className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300 font-semibold">
                  {t("coach.activeCode")}
                </p>
                <p className="text-2xl font-bold text-brand-800 dark:text-brand-200 mt-1">
                  {inviteCode}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t("coach.assignedClients")} />
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {t("coach.loadingClients")}
            </div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {t("coach.noClients")}
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((link) => (
                <Link
                  key={link.id}
                  to={`/coach/clients/${link.client?.id}`}
                  className="block rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-brand-400 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {link.client?.firstName || link.client?.username} {link.client?.lastName || ""}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {link.client?.email}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      <p>{t("coach.currentGoal")}: {link.client?.goal || "-"}</p>
                      <p>{link.client?.trainingDaysPerWeek ?? "?"} / 7</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
