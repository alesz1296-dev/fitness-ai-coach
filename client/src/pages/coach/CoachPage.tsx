import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { coachApi } from "../../api";
import type {
  CoachClientLink,
  CoachDashboardSummary,
  CoachLibraryFavorite,
  MealPlan,
  WorkoutTemplate,
} from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";

type LibraryItemType = "template" | "meal";

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

  const toggleFavorite = async (itemType: LibraryItemType, sourceId: number) => {
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

  const isFavorite = (itemType: LibraryItemType, sourceId: number) =>
    libraryFavorites.some((favorite) => favorite.itemType === itemType && favorite.sourceId === sourceId);

  const clientMeta = new Map(
    clients
      .filter((link) => link.client?.id)
      .map((link) => [link.client!.id, link.client!]),
  );

  const attentionClients = dashboard?.attentionClients ?? [];
  const recentNotifications = dashboard?.recentNotifications ?? [];
  const favoriteTemplates = libraryTemplates.filter((tpl) => isFavorite("template", tpl.id)).slice(0, 4);
  const favoriteMealPlans = libraryMealPlans.filter((plan) => isFavorite("meal", plan.id)).slice(0, 4);

  const getReasonTone = (reason: string) => {
    const normalized = reason.toLowerCase();
    if (normalized.includes("overdue") || normalized.includes("late") || normalized.includes("check")) {
      return {
        label: t("coach.overdueCheckIns"),
        className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
      };
    }
    if (
      normalized.includes("adherence") ||
      normalized.includes("protein") ||
      normalized.includes("nutrition") ||
      normalized.includes("workout")
    ) {
      return {
        label: t("coach.adherenceWidgets"),
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      };
    }
    if (normalized.includes("pending") || normalized.includes("proposal") || normalized.includes("approval")) {
      return {
        label: t("coach.pendingProposals"),
        className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
      };
    }
    if (normalized.includes("weight")) {
      return {
        label: t("coach.weightWidget"),
        className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
      };
    }
    return {
      label: t("coach.needsAttentionToday"),
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    };
  };

  const getNotificationTone = (type?: string) => {
    const normalized = (type ?? "").toLowerCase();
    if (normalized.includes("proposal")) return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
    if (normalized.includes("comment")) return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
    if (normalized.includes("invite")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

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

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.7fr_1.05fr] gap-5 items-start">
        <div className="space-y-5">
          <section className="rounded-[28px] border border-sky-200/70 dark:border-sky-900/60 bg-gradient-to-br from-sky-50 via-white to-white dark:from-sky-950/20 dark:via-gray-900 dark:to-gray-900 shadow-sm overflow-hidden">
            <div className="border-b border-sky-100 dark:border-sky-900/50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
                {t("coach.todayPriorities")}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                {t("coach.needsAttentionToday")}
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="rounded-2xl bg-white/85 dark:bg-gray-800/70 border border-sky-100 dark:border-sky-900/40 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">{t("coach.totalClients")}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                  {dashboard?.totalClients ?? clients.length}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">{t("coach.pendingProposals")}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.pendingProposals ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">{t("coach.overdueCheckIns")}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.overdueCheckIns ?? 0}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">{t("coach.assignedClients")}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {clients.length === 0 ? t("coach.noClients") : `${clients.length} ${t("coach.clientsWaitingReview")}`}
                </p>
              </div>
            </div>
          </section>

          <Card>
            <CardHeader
              title={t("coach.recentCoachActivity")}
              subtitle={t("coach.notificationsSub")}
              action={
                <Link
                  to="/notifications"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  {t("common.viewAll")}
                </Link>
              }
            />
            <div className="space-y-4">
              {recentNotifications.length === 0 ? (
                <p className="text-sm text-gray-400">{t("coach.noNotifications")}</p>
              ) : (
                recentNotifications.map((notification, index) => (
                  <div key={notification.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl text-[11px] font-semibold ${getNotificationTone(notification.type)}`}>
                        {notification.type?.slice(0, 1).toUpperCase() || "•"}
                      </span>
                      {index < recentNotifications.length - 1 && (
                        <span className="mt-2 h-full w-px bg-gray-200 dark:bg-gray-700" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{notification.title}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{notification.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
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

        <section className="rounded-[30px] border border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50 via-white to-white dark:from-amber-950/20 dark:via-gray-900 dark:to-gray-900 shadow-sm overflow-hidden">
          <div className="border-b border-amber-100 dark:border-amber-900/50 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
              {t("coach.todayPriorities")}
            </p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {t("coach.attentionClients")}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {t("coach.attentionClientsSub")}
                </p>
              </div>
              <span className="inline-flex items-center self-start rounded-full bg-white/80 dark:bg-gray-800/80 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40">
                {attentionClients.length} {t("coach.clientsWaitingReview")}
              </span>
            </div>
          </div>

          <div className="p-4 md:p-5">
            {attentionClients.length === 0 ? (
              <p className="text-sm text-gray-400">{t("coach.noNotifications")}</p>
            ) : (
              <div className="space-y-4">
                {attentionClients.map((entry) => {
                  const meta = clientMeta.get(entry.client.id);
                  const primaryReason = entry.reasons[0] ?? t("coach.needsAttentionToday");
                  const tone = getReasonTone(primaryReason);
                  return (
                    <div key={entry.client.id} className="rounded-[24px] border border-amber-100 dark:border-amber-900/40 bg-white/85 dark:bg-gray-900/75 p-4 md:p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone.className}`}>
                              {tone.label}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
                              {entry.pendingProposals} {t("coach.pendingProposals")}
                            </span>
                          </div>
                          <div className="mt-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {entry.client.firstName || entry.client.username} {entry.client.lastName || ""}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {t("coach.topConcern")}: {primaryReason}
                            </p>
                          </div>
                        </div>
                        <Link
                          to={`/coach/clients/${entry.client.id}`}
                          className="inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-brand-600 hover:bg-brand-700 text-white shadow-sm px-4 py-2 text-sm"
                        >
                          {t("coach.open")}
                        </Link>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-gray-400">{t("coach.latestCheckIn")}</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                            {entry.latestWeekStart || t("coach.noWeeklyCheckIns")}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-gray-400">{t("coach.currentGoal")}</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                            {meta?.goal || "-"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-gray-400">{t("coach.pendingProposals")}</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                            {entry.pendingProposals}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-gray-400">{t("coach.totalClients")}</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                            {meta?.trainingDaysPerWeek ?? "?"} / 7
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.reasons.map((reason) => {
                          const reasonTone = getReasonTone(reason);
                          return (
                            <span
                              key={reason}
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${reasonTone.className}`}
                            >
                              {reason}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <Card>
            <CardHeader title={t("coach.libraryTools")} subtitle={t("coach.reusableLibrariesSub")} />
            <div className="space-y-4 text-sm">
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">{t("coach.reusablePlans")}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{libraryFavorites.length}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("coach.workoutLibraries")}</p>
                <div className="mt-2 space-y-2">
                  {favoriteTemplates.length === 0 ? (
                    <p className="text-sm text-gray-400">{t("coach.noWorkoutLibraries")}</p>
                  ) : (
                    favoriteTemplates.map((tpl) => (
                      <div key={tpl.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{tpl.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{tpl.splitType}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={togglingFavorite === `template:${tpl.id}`}
                            onClick={() => void toggleFavorite("template", tpl.id)}
                          >
                            {isFavorite("template", tpl.id) ? "â˜…" : "â˜†"}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("coach.mealLibraries")}</p>
                <div className="mt-2 space-y-2">
                  {favoriteMealPlans.length === 0 ? (
                    <p className="text-sm text-gray-400">{t("coach.noMealLibraries")}</p>
                  ) : (
                    favoriteMealPlans.map((plan) => (
                      <div key={plan.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{plan.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{plan.durationWeeks}w</p>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={togglingFavorite === `meal:${plan.id}`}
                            onClick={() => void toggleFavorite("meal", plan.id)}
                          >
                            {isFavorite("meal", plan.id) ? "â˜…" : "â˜†"}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card>
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
        </div>
      </div>
    </div>
  );
}
