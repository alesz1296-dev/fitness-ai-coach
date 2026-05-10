import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { dashboardApi, coachApi } from "../../api";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { APP_EVENTS } from "../../lib/appEvents";
import type { CoachDashboardSummary, CoachNotification, CoachProposal, DashboardData } from "../../types";

type CenterItemType = "proposal" | "checkin" | "client" | "invite" | "goal" | "activity";

interface CenterItem {
  id: string;
  type: CenterItemType;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  clientId?: number | null;
  clientName?: string | null;
  actionLabel?: string | null;
  href?: string | null;
}

function getReadKey(userId?: number | null) {
  return `fitai:notifications-read:${userId ?? "anonymous"}`;
}

function loadReadIds(userId?: number | null): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(getReadKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(userId: number | null | undefined, ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getReadKey(userId), JSON.stringify(Array.from(ids)));
}

function formatTime(value: string) {
  try {
    return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
  } catch {
    return value;
  }
}

function notificationTone(type: CenterItemType) {
  switch (type) {
    case "proposal":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
    case "checkin":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300";
    case "invite":
      return "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300";
    case "goal":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
    case "activity":
    case "client":
    default:
      return "bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-200";
  }
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [coachSummary, setCoachSummary] = useState<CoachDashboardSummary | null>(null);
  const [coachNotifications, setCoachNotifications] = useState<CoachNotification[]>([]);
  const [coachAttention, setCoachAttention] = useState<CoachDashboardSummary["attentionClients"]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pendingProposals, setPendingProposals] = useState<CoachProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds(user?.id));

  const isPrivileged = ["coach", "admin", "developer"].includes(user?.role ?? "user");

  useEffect(() => {
    setReadIds(loadReadIds(user?.id));
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (isPrivileged) {
        const [notificationsRes, dashboardRes] = await Promise.all([
          coachApi.getNotifications(),
          coachApi.getDashboard(),
        ]);
        setCoachNotifications(notificationsRes.data.notifications ?? []);
        setCoachAttention(notificationsRes.data.attentionClients ?? []);
        setCoachSummary({
          ...dashboardRes.data,
          attentionClients: notificationsRes.data.attentionClients ?? dashboardRes.data.attentionClients,
          recentNotifications: notificationsRes.data.notifications ?? dashboardRes.data.recentNotifications,
        });
        setDashboard(null);
        setPendingProposals([]);
      } else {
        const [dashboardRes, proposalsRes] = await Promise.all([
          dashboardApi.get(),
          coachApi.getPendingForMe(),
        ]);
        setDashboard(dashboardRes.data);
        setPendingProposals(proposalsRes.data.proposals ?? []);
        setCoachNotifications([]);
        setCoachAttention([]);
        setCoachSummary(null);
      }
    } catch {
      setCoachNotifications([]);
      setCoachAttention([]);
      setCoachSummary(null);
      setDashboard(null);
      setPendingProposals([]);
    } finally {
      setLoading(false);
    }
  }, [isPrivileged]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener(APP_EVENTS.dataChanged, handler);
    const timer = window.setInterval(() => void refresh(), 45000);
    return () => {
      window.removeEventListener(APP_EVENTS.dataChanged, handler);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const items = useMemo<CenterItem[]>(() => {
    if (isPrivileged) {
      return coachNotifications.map((notification) => ({
        id: notification.id,
        type: notification.type === "invite"
          ? "invite"
          : notification.type === "checkin"
            ? "checkin"
            : notification.type === "proposal"
              ? "proposal"
              : "client",
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt,
        unread: !readIds.has(notification.id),
        clientId: notification.clientId ?? null,
        clientName: notification.clientName ?? null,
        actionLabel: notification.action ?? null,
        href: notification.clientId ? `/coach/clients/${notification.clientId}` : "/coach",
      }));
    }

    return [
      ...pendingProposals.map((proposal) => ({
        id: `proposal-${proposal.id}`,
        type: "proposal" as const,
        title: proposal.type === "meal"
          ? t("coach.mealProposal")
          : proposal.type === "goal"
            ? t("coach.goalProposal")
            : t("coach.workoutProposal"),
        body: proposal.diffSummary?.[0]
          ?? proposal.note
          ?? t("notifications.proposalWaiting"),
        createdAt: proposal.createdAt,
        unread: !readIds.has(`proposal-${proposal.id}`),
        clientName: proposal.coach ? proposal.coach.username : null,
        actionLabel: proposal.status,
        href: "/dashboard",
      })),
    ];
  }, [coachNotifications, isPrivileged, pendingProposals, readIds, t]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.title, item.body, item.clientName, item.actionLabel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [items, query]);

  const markRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(user?.id, next);
  };

  const markAllRead = () => {
    const next = new Set(items.map((item) => item.id));
    setReadIds((prev) => {
      const merged = new Set(prev);
      next.forEach((id) => merged.add(id));
      saveReadIds(user?.id, merged);
      return merged;
    });
  };

  const unreadCount = items.filter((item) => item.unread).length;

  const summaryCards = isPrivileged
    ? [
        { label: t("coach.totalClients"), value: coachSummary?.totalClients ?? 0, sub: t("notifications.coachFeed") },
        { label: t("coach.pendingProposals"), value: coachSummary?.pendingProposals ?? 0, sub: t("notifications.proposalTimeline") },
        { label: t("coach.needsAttentionToday"), value: coachSummary?.needsAttention ?? 0, sub: t("coach.attentionClients") },
        { label: t("coach.overdueCheckIns"), value: coachSummary?.overdueCheckIns ?? 0, sub: t("coach.overdueCheckIns") },
      ]
    : [
        { label: t("coach.pendingProposals"), value: pendingProposals.length, sub: t("notifications.userFeed") },
        { label: t("dashboard.workoutsThisWeek"), value: dashboard?.weeklyWorkoutCount ?? 0, sub: t("dashboard.inTheLast7Days") },
        { label: t("dashboard.caloriesToday"), value: Math.round(dashboard?.today.totals.calories ?? 0), sub: t("dashboard.todaysCalories") },
        { label: t("dashboard.activeGoal"), value: dashboard?.activeGoal?.name ?? t("dashboard.noGoalSet"), sub: dashboard?.activeGoal ? `${Math.round(dashboard.activeGoal.dailyCalories)} kcal` : t("dashboard.setGoal") },
      ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
            {t("nav.notifications")}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {t("notifications.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            {isPrivileged ? t("notifications.subtitleCoach") : t("notifications.subtitleUser")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void refresh()} loading={loading}>
            {t("common.manage")}
          </Button>
          {isPrivileged ? (
            <Button size="sm" onClick={() => navigate("/coach")}>
              {t("notifications.openCoach")}
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate("/dashboard")}>
              {t("notifications.openDashboard")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title={t("notifications.center")}
          subtitle={t("notifications.centerSub")}
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {unreadCount} {t("notifications.unread")}
              </span>
              <Button size="sm" variant="secondary" onClick={markAllRead} disabled={items.length === 0}>
                {t("notifications.markAllRead")}
              </Button>
            </div>
          }
        />

        <div className="mb-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("notifications.searchPlaceholder")}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">{t("common.loading")}</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            {t("notifications.noNotifications")}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 transition-colors ${item.unread ? "border-brand-300 bg-brand-50/60 dark:border-brand-700 dark:bg-brand-500/10" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                      {item.unread && (
                        <span className="rounded-full bg-brand-600 text-white px-2 py-0.5 text-[11px] font-semibold">
                          {t("notifications.unread")}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${notificationTone(item.type)}`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.body}</p>
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      {formatTime(item.createdAt)}
                      {item.actionLabel ? ` · ${item.actionLabel}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {item.href && (
                      <Link
                        to={item.href}
                        onClick={() => markRead(item.id)}
                        className="inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed bg-brand-600 hover:bg-brand-700 text-white shadow-sm px-3 py-1.5 text-xs"
                      >
                        {t("notifications.viewDetails")}
                      </Link>
                    )}
                    {item.unread && (
                      <button
                        type="button"
                        onClick={() => markRead(item.id)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                      >
                        {t("notifications.markRead")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {isPrivileged ? (
        <Card>
          <CardHeader title={t("notifications.attentionQueue")} subtitle={t("notifications.attentionQueueSub")} />
          {(coachAttention ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">{t("coach.noNotifications")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {coachAttention.map((entry) => (
                <Link
                  key={entry.client.id}
                  to={`/coach/clients/${entry.client.id}`}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-brand-400 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {entry.client.firstName || entry.client.username} {entry.client.lastName || ""}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {entry.latestWeekStart ?? t("coach.noWeeklyCheckIns")}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-[11px] font-semibold">
                      {entry.pendingProposals}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.reasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 text-[11px] font-medium"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
