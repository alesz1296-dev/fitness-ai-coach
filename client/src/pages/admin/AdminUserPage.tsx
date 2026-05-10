import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { adminApi } from "../../api";
import type { InternalUserWorkspace } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function AdminUserPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { userId } = useParams();
  const { t } = useTranslation();
  const [workspace, setWorkspace] = useState<InternalUserWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const isReadOnlyView = location.pathname.includes("/internal/view/");
  const [actingAsCoach, setActingAsCoach] = useState(false);

  useEffect(() => {
    if (!user || !["admin", "developer"].includes(user.role ?? "user")) {
      navigate("/dashboard", { replace: true });
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await adminApi.getUserWorkspace(Number(userId));
        if (active) setWorkspace(data);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (userId) {
      void load();
    }

    return () => {
      active = false;
    };
  }, [navigate, user, userId]);

  const startCoachTest = async () => {
    if (!workspace) return;
    setActingAsCoach(true);
    try {
      await adminApi.startCoachTestAccess(workspace.user.id);
      navigate(`/coach/clients/${workspace.user.id}`);
    } finally {
      setActingAsCoach(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/internal")}>
          {t("admin.backToInternal")}
        </Button>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.error")}</p>
      </div>
    );
  }

  const profileName =
    [workspace.user.firstName, workspace.user.lastName].filter(Boolean).join(" ").trim() ||
    workspace.user.username;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/internal")}>
            {t("admin.backToInternal")}
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {t("admin.workspaceTitle", { user: profileName })}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{workspace.user.email}</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t("admin.joinedOn")}: {formatDate(workspace.user.createdAt)}
        </div>
      </div>

      {isReadOnlyView ? (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                {t("admin.readOnlyBannerTitle")}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                {t("admin.readOnlyBannerBody")}
              </p>
            </div>
            <Button variant="secondary" onClick={() => navigate(`/internal/users/${workspace.user.id}`)}>
              {t("admin.openWorkspace")}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader title={t("admin.profileAndRole")} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">{t("common.name")}</p>
              <p className="font-semibold text-gray-900 dark:text-white">{profileName}</p>
            </div>
            <div>
              <p className="text-gray-400">{t("admin.roleLabel")}</p>
              <p className="font-semibold text-gray-900 dark:text-white">{workspace.user.role || "-"}</p>
            </div>
            <div>
              <p className="text-gray-400">{t("common.goal")}</p>
              <p className="font-semibold text-gray-900 dark:text-white">{workspace.user.goal || "-"}</p>
            </div>
            <div>
              <p className="text-gray-400">{t("admin.trainingDaysLabel")}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {workspace.user.trainingDaysPerWeek ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-400">{t("common.weight")}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {workspace.user.weight ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-400">{t("admin.permissionFlagsLabel")}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {(workspace.user.permissionFlags || []).length === 0 ? (
                  <span className="text-gray-500 dark:text-gray-400">-</span>
                ) : (
                  (workspace.user.permissionFlags || []).map((flag) => (
                    <span
                      key={flag}
                      className="px-2 py-1 rounded-full text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                    >
                      {flag}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("admin.statsOverview")} />
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(workspace.stats).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">{key}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={t("admin.coachPrivacyTitle")} subtitle={t("admin.coachPrivacySubtitle")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {Object.entries(workspace.user.coachVisibility ?? {}).map(([key, value]) => (
            <div key={key} className={`rounded-xl border px-3 py-3 ${value ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800" : "border-gray-200 bg-gray-50 dark:bg-gray-900/40 dark:border-gray-700"}`}>
              <p className="font-medium text-gray-900 dark:text-white">{t(`settings.coachVisibility${key.charAt(0).toUpperCase() + key.slice(1)}` as any)}</p>
              <p className={`text-xs mt-1 ${value ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-gray-400"}`}>
                {value ? t("admin.visibleToCoach") : t("admin.hiddenFromCoach")}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {!isReadOnlyView && (user?.role === "admin" || user?.role === "developer") ? (
        <Card>
          <CardHeader title={t("admin.coachTestTitle")} subtitle={t("admin.coachTestSub")} />
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">{t("admin.coachTestBody")}</p>
            <Button loading={actingAsCoach} onClick={() => void startCoachTest()}>
              {t("admin.actAsCoachForClient")}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title={t("admin.activeGoalLabel")} />
          {workspace.activeGoal ? (
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <p><span className="text-gray-400">{t("admin.goalTypeLabel")}:</span> {workspace.activeGoal.type}</p>
              <p><span className="text-gray-400">{t("admin.dailyCaloriesLabel")}:</span> {workspace.activeGoal.dailyCalories}</p>
              <p><span className="text-gray-400">{t("admin.targetWeightLabel")}:</span> {workspace.activeGoal.targetWeight}</p>
              <p><span className="text-gray-400">{t("admin.targetDateLabel")}:</span> {formatDate(workspace.activeGoal.targetDate)}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.noActiveGoal")}</p>
          )}
        </Card>

        <Card>
          <CardHeader
            title={t("admin.recentNutrition")}
            subtitle={`${formatDate(workspace.windows.nutritionStart)} - ${formatDate(workspace.windows.nutritionEnd)}`}
          />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-400">{t("common.calories")}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{Math.round(workspace.nutritionSummary.calories)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-400">{t("common.protein")}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{Math.round(workspace.nutritionSummary.protein)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-400">{t("common.carbs")}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{Math.round(workspace.nutritionSummary.carbs)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-400">{t("common.fats")}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{Math.round(workspace.nutritionSummary.fats)}</p>
            </div>
          </div>
          {workspace.recentFoods.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.noRecentNutrition")}</p>
          ) : (
            <div className="space-y-2">
              {workspace.recentFoods.slice(0, 6).map((food) => (
                <div key={food.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{food.foodName}</p>
                    <p className="text-gray-500 dark:text-gray-400">{formatDate(food.date)}</p>
                  </div>
                  <span className="text-gray-700 dark:text-gray-200">{Math.round(food.calories)} kcal</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title={t("admin.recentWorkouts")} />
          {workspace.recentWorkouts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.noRecentWorkouts")}</p>
          ) : (
            <div className="space-y-3">
              {workspace.recentWorkouts.map((workout) => (
                <div key={workout.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{workout.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(workout.date)}</p>
                    </div>
                    <div className="text-right text-sm text-gray-600 dark:text-gray-300">
                      <p>{workout.duration} {t("common.min")}</p>
                      <p>{workout.exercises.length} {t("admin.exerciseCountLabel")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={t("admin.recentWeight")} />
          {workspace.recentWeights.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.noRecentWeight")}</p>
          ) : (
            <div className="space-y-2">
              {workspace.recentWeights.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-900 dark:text-white">{formatDate(log.date)}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{log.weight}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title={t("admin.recentMealPlans")} />
          {workspace.mealPlans.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.noMealPlans")}</p>
          ) : (
            <div className="space-y-3">
              {workspace.mealPlans.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <p className="font-semibold text-gray-900 dark:text-white">{plan.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(plan.weekStart)} · {plan.durationWeeks}w
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title={t("admin.calendarPreview")}
            subtitle={t("admin.calendarPreviewSubtitle", {
              end: formatDate(workspace.windows.calendarEnd) || "-",
            })}
          />
          {workspace.calendarDays.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.noCalendarDays")}</p>
          ) : (
            <div className="space-y-2">
              {workspace.calendarDays.map((day) => (
                <div key={day.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{day.workoutName || t("admin.restDayLabel")}</p>
                    <p className="text-gray-500 dark:text-gray-400">{formatDate(day.date)}</p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {(day.muscleGroups || []).join(", ") || "-"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title={t("admin.pendingProposals")} />
          {workspace.pendingProposals.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.noPendingProposals")}</p>
          ) : (
            <div className="space-y-3">
              {workspace.pendingProposals.map((proposal) => (
                <div key={proposal.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {proposal.type} · {proposal.status}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {proposal.coach?.username || "-"} · {formatDateTime(proposal.createdAt)}
                      </p>
                    </div>
                  </div>
                  {proposal.note && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{proposal.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={t("admin.relationshipsForUser")} />
          {workspace.relationships.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.noRelationshipsForUser")}</p>
          ) : (
            <div className="space-y-3">
              {workspace.relationships.map((relationship) => (
                <div key={relationship.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {relationship.coach?.username || "-"} → {relationship.client?.username || "-"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{relationship.status}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
