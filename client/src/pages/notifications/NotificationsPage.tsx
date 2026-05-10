import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { dashboardApi, coachApi } from "../../api";
import { OwnershipChip, StatusChip } from "../../components/coach/CoachUi";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { APP_EVENTS } from "../../lib/appEvents";
import type { CoachDashboardSummary, CoachNotification, CoachProposal, DashboardData } from "../../types";

type CenterItemType = "proposal" | "checkin" | "comment" | "invite" | "attention" | "activity";
type GroupKey = "unread" | "today" | "earlier";

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

function isSameDay(value: string, compare = new Date()) {
  const date = new Date(value);
  return (
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth() &&
    date.getDate() === compare.getDate()
  );
}

function eventPillClass(type: CenterItemType) {
  switch (type) {
    case "proposal":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
    case "comment":
      return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300";
    case "checkin":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300";
    case "invite":
      return "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300";
    case "attention":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
    case "activity":
    default:
      return "bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-200";
  }
}

function eventIcon(type: CenterItemType) {
  switch (type) {
    case "proposal":
      return "PR";
    case "comment":
      return "CM";
    case "checkin":
      return "CI";
    case "invite":
      return "IN";
    case "attention":
      return "AT";
    case "activity":
    default:
      return "UP";
  }
}

function proposalStatusTone(status?: string | null) {
  return status === "accepted"
    ? "accepted"
    : status === "rejected"
      ? "rejected"
      : "pending";
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
        type:
          notification.type === "invite"
            ? "invite"
            : notification.type === "checkin"
              ? "checkin"
              : notification.type === "proposal"
                ? "proposal"
                : "activity",
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

    return pendingProposals.map((proposal) => ({
      id: `proposal-${proposal.id}`,
      type: (proposal.comments?.length ?? 0) > 0 ? "comment" : "proposal",
      title:
        proposal.type === "meal"
          ? t("coach.mealProposal")
          : proposal.type === "goal"
            ? t("coach.goalProposal")
            : t("coach.workoutProposal"),
      body: proposal.diffSummary?.[0] ?? proposal.note ?? t("notifications.proposalWaiting"),
      createdAt: proposal.createdAt,
      unread: !readIds.has(`proposal-${proposal.id}`),
      clientName: proposal.coach ? proposal.coach.username : null,
      actionLabel: proposal.status,
      href: "/dashboard",
    }));
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

  const groupedItems = useMemo<Record<GroupKey, CenterItem[]>>(() => {
    const groups: Record<GroupKey, CenterItem[]> = { unread: [], today: [], earlier: [] };
    filteredItems.forEach((item) => {
      if (item.unread) {
        groups.unread.push(item);
      } else if (isSameDay(item.createdAt)) {
        groups.today.push(item);
      } else {
        groups.earlier.push(item);
      }
    });
    return groups;
  }, [filteredItems]);

  const groupsInOrder = [
    { key: "unread", title: t("notifications.sectionUnread"), items: groupedItems.unread },
    { key: "today", title: t("notifications.sectionToday"), items: groupedItems.today },
    { key: "earlier", title: t("notifications.sectionEarlier"), items: groupedItems.earlier },
  ] satisfies Array<{ key: GroupKey; title: string; items: CenterItem[] }>;

  const visibleGroups = groupsInOrder.filter((group) => group.items.length > 0);

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

  const emptyTitle = isPrivileged
    ? t("notifications.emptyCoachTitle")
    : pendingProposals.length === 0
      ? t("notifications.emptyUserTitle")
      : t("notifications.emptyFilteredTitle");

  const emptyBody = isPrivileged
    ? t("notifications.emptyCoachBody")
    : pendingProposals.length === 0
      ? t("notifications.emptyUserBody")
      : t("notifications.emptyFilteredBody");

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
              {t("nav.notifications")}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isPrivileged
                  ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
              }`}
            >
              {isPrivileged ? t("notifications.modeCoach") : t("notifications.modeUser")}
            </span>
          </div>
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
          <Card key={card.label} className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className={`grid gap-4 ${isPrivileged ? "xl:grid-cols-[1.25fr,0.8fr]" : "grid-cols-1"}`}>
        <Card className="bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900">
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

          <div className="mb-5">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("notifications.searchPlaceholder")}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">{t("common.loading")}</div>
          ) : visibleGroups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 px-6 py-12 text-center">
              <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{emptyTitle}</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{emptyBody}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleGroups.map((group) => (
                <section key={group.key} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      {group.title}
                    </h2>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  </div>

                  <div className="relative pl-5">
                    <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <div key={item.id} className="relative">
                          <span className={`absolute -left-3.5 top-5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-800 ${item.unread ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                          <div
                            className={`rounded-3xl border p-4 transition-colors ${
                              item.unread
                                ? "border-brand-200 bg-white shadow-sm dark:border-brand-800 dark:bg-gray-800"
                                : "border-gray-200 bg-white/90 dark:border-gray-700 dark:bg-gray-800/90"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 gap-3">
                                <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[11px] font-bold ${eventPillClass(item.type)}`}>
                                  {eventIcon(item.type)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className={`text-sm ${item.unread ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-800 dark:text-gray-100"}`}>
                                      {item.title}
                                    </p>
                                    {item.unread ? <span className="h-2 w-2 rounded-full bg-brand-500" /> : null}
                                    {!isPrivileged && (item.type === "proposal" || item.type === "comment") ? (
                                      <OwnershipChip owner="coach" />
                                    ) : null}
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${eventPillClass(item.type)}`}>
                                      {item.type}
                                    </span>
                                    {!isPrivileged && item.actionLabel ? (
                                      <StatusChip
                                        status={proposalStatusTone(item.actionLabel)}
                                        className="px-2 py-0.5"
                                      />
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.body}</p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                                    <span>{formatTime(item.createdAt)}</span>
                                    {item.clientName ? <span>/ {item.clientName}</span> : null}
                                    {isPrivileged && item.actionLabel ? <span>/ {item.actionLabel}</span> : null}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                {item.href ? (
                                  <Link
                                    to={item.href}
                                    onClick={() => markRead(item.id)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
                                  >
                                    {t("notifications.viewDetails")}
                                  </Link>
                                ) : null}
                                {item.unread ? (
                                  <button
                                    type="button"
                                    onClick={() => markRead(item.id)}
                                    className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                  >
                                    {t("notifications.markRead")}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </Card>

        {isPrivileged ? (
          <Card className="bg-gradient-to-br from-brand-50/40 to-white dark:from-brand-900/10 dark:to-gray-900">
            <CardHeader title={t("notifications.attentionQueue")} subtitle={t("notifications.attentionQueueSub")} />
            {(coachAttention ?? []).length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 px-5 py-10 text-center">
                <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{t("notifications.emptyAttentionTitle")}</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("notifications.emptyAttentionBody")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {coachAttention.map((entry) => (
                  <Link
                    key={entry.client.id}
                    to={`/coach/clients/${entry.client.id}`}
                    className="block rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition-colors hover:border-brand-400"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {entry.client.firstName || entry.client.username} {entry.client.lastName || ""}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {entry.latestWeekStart ?? t("coach.noWeeklyCheckIns")}
                        </p>
                      </div>
                      <StatusChip
                        status={entry.pendingProposals > 0 ? "pending" : "needs_attention"}
                        label={`${entry.pendingProposals} ${t("coach.pendingProposals").toLowerCase()}`}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.reasons.map((reason) => (
                        <StatusChip
                          key={reason}
                          status="needs_attention"
                          label={reason}
                          className="normal-case tracking-normal"
                        />
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
