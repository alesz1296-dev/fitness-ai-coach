import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../../api";
import type { CoachClientLink, User, InternalSummaryMetrics, AuditLogEntry } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";

const PERMISSIONS = [
  "manage_users",
  "manage_relationships",
  "manage_content",
  "view_system_analytics",
  "feature_flags",
  "impersonate",
  "repair_data",
];

type FeatureFlagRow = {
  id: number;
  key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, startImpersonation } = useAuthStore();
  const { t } = useTranslation();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<InternalSummaryMetrics | null>(null);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [relationships, setRelationships] = useState<CoachClientLink[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagRow[]>([]);
  const [contentSummary, setContentSummary] = useState<Record<string, number>>({});
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [repairUserId, setRepairUserId] = useState("");
  const [repairMessage, setRepairMessage] = useState("");

  const load = async (q = "") => {
    const [summary, usersRes, rels, audit, flags, content] = await Promise.allSettled([
      adminApi.getSummary(),
      adminApi.searchUsers(q),
      adminApi.getRelationships(),
      adminApi.getAuditLogs(),
      adminApi.getFeatureFlags(),
      adminApi.getContentSummary(),
    ]);

    if (summary.status === "fulfilled") {
      setStats(summary.value.data.stats);
      setMetrics(summary.value.data.metrics);
    }
    if (usersRes.status === "fulfilled") setUsers(usersRes.value.data.users);
    else setUsers([]);
    if (rels.status === "fulfilled") setRelationships(rels.value.data.relationships);
    else setRelationships([]);
    if (audit.status === "fulfilled") setAuditLogs(audit.value.data.logs);
    else setAuditLogs([]);
    if (flags.status === "fulfilled") setFeatureFlags(flags.value.data.flags);
    else setFeatureFlags([]);
    if (content.status === "fulfilled") setContentSummary(content.value.data.summary);
    else setContentSummary({});
  };

  useEffect(() => {
    if (!user || !["admin", "developer"].includes(user.role ?? "user")) {
      navigate("/dashboard", { replace: true });
      return;
    }
    void load();
  }, [navigate, user]);

  const updateRole = async (target: User, role: User["role"], permissionFlags: string[]) => {
    setSavingUserId(target.id);
    try {
      await adminApi.updateUserRole(target.id, {
        role: role as "user" | "coach" | "admin" | "developer",
        permissionFlags,
      });
      await load(query);
    } finally {
      setSavingUserId(null);
    }
  };

  const beginImpersonation = async (target: User) => {
    if (!user) return;
    const { data } = await adminApi.startImpersonation(target.id);
    startImpersonation(data.token, user, data.user);
    navigate("/dashboard");
  };

  const toggleFlag = async (flag: FeatureFlagRow) => {
    await adminApi.upsertFeatureFlag({
      key: flag.key,
      label: flag.label,
      description: flag.description ?? undefined,
      enabled: !flag.enabled,
    });
    await load(query);
  };

  const runRepair = async (action: "sync_profile_weight" | "cleanup_expired_invites") => {
    const payload = action === "sync_profile_weight"
      ? { action, userId: Number(repairUserId) }
      : { action };
    const { data } = await adminApi.runRepair(payload);
    setRepairMessage(data.message);
    await load(query);
  };

  const totalCards = [
    { key: "users", label: t("admin.totalUsers"), value: stats.users ?? 0 },
    { key: "coaches", label: t("admin.totalCoaches"), value: stats.coaches ?? 0 },
    { key: "admins", label: t("admin.totalInternalUsers"), value: stats.admins ?? 0 },
    { key: "proposals", label: t("admin.totalPendingProposals"), value: stats.proposals ?? 0 },
  ];

  const metricCards = metrics
    ? [
        { key: "signups7d", label: t("admin.metricSignups7d"), value: metrics.signups7d },
        { key: "workouts7d", label: t("admin.metricWorkouts7d"), value: metrics.workouts7d },
        { key: "foodLogs7d", label: t("admin.metricFoodLogs7d"), value: metrics.foodLogs7d },
        { key: "weights7d", label: t("admin.metricWeights7d"), value: metrics.weights7d },
        { key: "chats7d", label: t("admin.metricChats7d"), value: metrics.chats7d },
        { key: "activeGoals", label: t("admin.metricActiveGoals"), value: metrics.activeGoals },
        { key: "calendarDays30d", label: t("admin.metricCalendarDays30d"), value: metrics.calendarDays30d },
        { key: "pendingCoachLinks", label: t("admin.metricPendingCoachLinks"), value: metrics.pendingCoachLinks },
      ]
    : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("admin.title")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("admin.subtitle")}</p>
      </div>

      <Card>
        <CardHeader title={t("admin.systemTotals")} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {totalCards.map((card) => (
            <div key={card.key} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("admin.recentUsageSignals")} subtitle={t("admin.recentUsageSignalsSub")} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card) => (
            <div key={card.key} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("admin.userLookup")} />
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("admin.searchPlaceholder")}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
            <Button variant="secondary" onClick={() => load(query)}>
              {t("admin.search")}
            </Button>
          </div>

          <div className="space-y-3">
            {users.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {entry.username} / {entry.email}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(entry.firstName || "") + " " + (entry.lastName || "")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 xl:items-end">
                    <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                      <select
                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                        value={entry.role || "user"}
                        onChange={(e) => updateRole(entry, e.target.value as User["role"], entry.permissionFlags || [])}
                        disabled={savingUserId === entry.id}
                      >
                        <option value="user">{t("admin.roleUser")}</option>
                        <option value="coach">{t("admin.roleCoach")}</option>
                        <option value="admin">{t("admin.roleAdmin")}</option>
                        <option value="developer">{t("admin.roleDeveloper")}</option>
                      </select>

                      <div className="flex flex-wrap gap-2">
                        {PERMISSIONS.map((flag) => {
                          const active = (entry.permissionFlags || []).includes(flag);
                          return (
                            <button
                              key={flag}
                              onClick={() =>
                                updateRole(
                                  entry,
                                  entry.role || "user",
                                  active
                                    ? (entry.permissionFlags || []).filter((f) => f !== flag)
                                    : [...(entry.permissionFlags || []), flag],
                                )
                              }
                              disabled={savingUserId === entry.id}
                              className={`px-2.5 py-1 rounded-full text-xs border ${
                                active
                                  ? "bg-brand-600 text-white border-brand-600"
                                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                              }`}
                            >
                              {flag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => navigate(`/internal/users/${entry.id}`)}>
                        {t("admin.openWorkspace")}
                      </Button>
                      <Button variant="ghost" onClick={() => navigate(`/internal/view/users/${entry.id}`)}>
                        {t("admin.readOnlyView")}
                      </Button>
                      <Button variant="ghost" onClick={() => void beginImpersonation(entry)}>
                        {t("admin.startImpersonation")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader title={t("admin.featureFlags")} subtitle={t("admin.featureFlagsSub")} />
          <div className="space-y-3">
            {featureFlags.length === 0 ? (
              <p className="text-sm text-gray-400">{t("admin.noFeatureFlags")}</p>
            ) : featureFlags.map((flag) => (
              <div key={flag.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{flag.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{flag.key}</p>
                    {flag.description ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{flag.description}</p>
                    ) : null}
                  </div>
                  <Button variant={flag.enabled ? "primary" : "secondary"} size="sm" onClick={() => void toggleFlag(flag)}>
                    {flag.enabled ? t("admin.enabled") : t("admin.disabled")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={t("admin.contentOps")} subtitle={t("admin.contentOpsSub")} />
          <div className="space-y-3 text-sm">
            {Object.entries(contentSummary).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
                <span className="text-gray-600 dark:text-gray-300">{key}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={t("admin.repairTools")} subtitle={t("admin.repairToolsSub")} />
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-300">{t("admin.repairUserIdLabel")}</label>
              <input
                value={repairUserId}
                onChange={(e) => setRepairUserId(e.target.value)}
                placeholder={t("admin.repairUserIdPlaceholder")}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              />
              <Button variant="secondary" onClick={() => void runRepair("sync_profile_weight")}>
                {t("admin.repairSyncWeight")}
              </Button>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" onClick={() => void runRepair("cleanup_expired_invites")}>
                {t("admin.repairCleanupInvites")}
              </Button>
            </div>

            {repairMessage ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{repairMessage}</p>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader title={t("admin.coachRelationships")} />
          <div className="space-y-3">
            {relationships.length === 0 ? (
              <p className="text-sm text-gray-400">{t("admin.noRelationships")}</p>
            ) : relationships.map((relationship) => (
              <div
                key={relationship.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {t("admin.coachToClient", {
                      coach: relationship.coach?.username || "-",
                      client: relationship.client?.username || "-",
                    })}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {relationship.coach?.email} / {relationship.client?.email}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                  {relationship.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={t("admin.recentAuditLogs")} subtitle={t("admin.recentAuditLogsSub")} />
          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-400">{t("admin.noAuditLogs")}</p>
            ) : auditLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{log.action}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {log.actor?.username || log.actorRole} / {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                  {log.targetUserId ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                      #{log.targetUserId}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
