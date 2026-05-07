import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  calorieGoalsApi,
  coachApi,
  mealPlansApi,
  templatesApi,
} from "../../api";
import type { CalorieGoal, CoachProposal, MealPlan, User, Workout, WorkoutTemplate } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";

const WEEKDAYS = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
  { label: "Sat", value: 5 },
  { label: "Sun", value: 6 },
];

export default function CoachClientPage() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const clientNumericId = Number(clientId);
  const [client, setClient] = useState<User | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [activeGoal, setActiveGoal] = useState<CalorieGoal | null>(null);
  const [nutritionSummary, setNutritionSummary] = useState({ calories: 0, protein: 0 });
  const [clientPlans, setClientPlans] = useState<MealPlan[]>([]);
  const [proposals, setProposals] = useState<CoachProposal[]>([]);
  const [myTemplates, setMyTemplates] = useState<WorkoutTemplate[]>([]);
  const [myMealPlans, setMyMealPlans] = useState<MealPlan[]>([]);
  const [myGoals, setMyGoals] = useState<CalorieGoal[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const [selectedMealPlanId, setSelectedMealPlanId] = useState<number | "">("");
  const [selectedGoalId, setSelectedGoalId] = useState<number | "">("");
  const [weekdays, setWeekdays] = useState<number[]>([0]);
  const [months, setMonths] = useState(1);
  const [overwrite, setOverwrite] = useState(false);
  const [sending, setSending] = useState<null | "workout" | "meal" | "goal">(null);

  const load = async () => {
    const [overview, templatesRes, mealPlansRes, goalsRes] = await Promise.all([
      coachApi.getClientOverview(clientNumericId),
      templatesApi.getAll(),
      mealPlansApi.getAll(),
      calorieGoalsApi.getAll(),
    ]);
    setClient(overview.data.client);
    setRecentWorkouts(overview.data.recentWorkouts);
    setActiveGoal(overview.data.activeGoal);
    setNutritionSummary(overview.data.nutritionSummary);
    setClientPlans(overview.data.plans);
    setProposals(overview.data.proposals);
    setMyTemplates(templatesRes.data.templates);
    setMyMealPlans(mealPlansRes.data.plans);
    setMyGoals(goalsRes.data.goals);
  };

  useEffect(() => {
    if (!user || !["coach", "admin", "developer"].includes(user.role ?? "user")) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (!Number.isInteger(clientNumericId) || clientNumericId < 1) {
      navigate("/coach", { replace: true });
      return;
    }
    void load();
  }, [clientNumericId, navigate, user]);

  const pendingCount = useMemo(
    () => proposals.filter((proposal) => proposal.status === "pending").length,
    [proposals],
  );

  const toggleWeekday = (value: number) => {
    setWeekdays((prev) =>
      prev.includes(value) ? prev.filter((day) => day !== value) : [...prev, value].sort((a, b) => a - b),
    );
  };

  const sendWorkoutProposal = async () => {
    if (!selectedTemplateId) return;
    setSending("workout");
    try {
      await coachApi.createProposal({
        clientId: clientNumericId,
        type: "workout",
        sourceId: Number(selectedTemplateId),
        payload: { weekdays, months, overwrite },
      });
      await load();
    } finally {
      setSending(null);
    }
  };

  const sendMealProposal = async () => {
    if (!selectedMealPlanId) return;
    setSending("meal");
    try {
      await coachApi.createProposal({
        clientId: clientNumericId,
        type: "meal",
        sourceId: Number(selectedMealPlanId),
      });
      await load();
    } finally {
      setSending(null);
    }
  };

  const sendGoalProposal = async () => {
    if (!selectedGoalId) return;
    setSending("goal");
    try {
      await coachApi.createProposal({
        clientId: clientNumericId,
        type: "goal",
        sourceId: Number(selectedGoalId),
      });
      await load();
    } finally {
      setSending(null);
    }
  };

  const proposalLabel = (proposal: CoachProposal) => {
    if (proposal.type === "workout") return t("coach.workoutProposal");
    if (proposal.type === "meal") return t("coach.mealProposal");
    return t("coach.goalProposal");
  };

  const proposalStatusLabel = (status: CoachProposal["status"]) => {
    if (status === "accepted") return t("coach.accepted");
    if (status === "rejected") return t("coach.rejected");
    return t("coach.pending");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {client?.firstName || client?.username} {client?.lastName || ""}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("coach.clientOverviewBody")}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/coach")}>
          {t("coach.backToClients")}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="p-4"><p className="text-xs text-gray-400">{t("coach.currentGoal")}</p><p className="font-semibold mt-1">{client?.goal || "-"}</p></div></Card>
        <Card><div className="p-4"><p className="text-xs text-gray-400">{t("coach.recentCalories")}</p><p className="font-semibold mt-1">{Math.round(nutritionSummary.calories)} kcal</p></div></Card>
        <Card><div className="p-4"><p className="text-xs text-gray-400">{t("coach.recentProtein")}</p><p className="font-semibold mt-1">{Math.round(nutritionSummary.protein)} g</p></div></Card>
        <Card><div className="p-4"><p className="text-xs text-gray-400">{t("coach.pendingProposals")}</p><p className="font-semibold mt-1">{pendingCount}</p></div></Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader title={t("coach.clientActivity")} />
          <div className="space-y-3">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("coach.recentWorkouts")}</p>
              <div className="mt-3 space-y-2">
                {recentWorkouts.length === 0 ? (
                  <p className="text-sm text-gray-400">{t("coach.noLoggedWorkouts")}</p>
                ) : recentWorkouts.map((workout) => (
                  <div key={workout.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{workout.name}</span>
                    <span className="text-gray-500 dark:text-gray-400">{new Date(workout.date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("coach.activeCalorieGoal")}</p>
              {activeGoal ? (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  <p>{activeGoal.name}</p>
                  <p>{Math.round(activeGoal.dailyCalories)} kcal · {Math.round(activeGoal.proteinGrams)}p / {Math.round(activeGoal.carbsGrams)}c / {Math.round(activeGoal.fatsGrams)}f</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-400">{t("coach.noActiveCalorieGoal")}</p>
              )}
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("coach.currentMealPlans")}</p>
              <div className="mt-2 space-y-2">
                {clientPlans.length === 0 ? (
                  <p className="text-sm text-gray-400">{t("coach.noMealPlans")}</p>
                ) : clientPlans.map((plan) => (
                  <p key={plan.id} className="text-sm text-gray-700 dark:text-gray-300">
                    {plan.name} · {plan.durationWeeks} week(s)
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("coach.publishDrafts")} />
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("coach.workoutTemplate")}</label>
              <select
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">{t("coach.selectTemplate")}</option>
                {myTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 pt-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleWeekday(day.value)}
                    className={`px-2.5 py-1 rounded-full text-xs border ${weekdays.includes(day.value) ? "bg-brand-600 text-white border-brand-600" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                >
                  <option value={1}>{t("coach.oneMonth")}</option>
                  <option value={2}>{t("coach.twoMonths")}</option>
                  <option value={3}>{t("coach.threeMonths")}</option>
                </select>
                <label className="text-sm flex items-center gap-2">
                  <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                  {t("coach.overwrite")}
                </label>
              </div>
              <Button className="w-full" loading={sending === "workout"} onClick={sendWorkoutProposal}>
                {t("coach.sendWorkoutDraft")}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("coach.mealPlan")}</label>
              <select
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={selectedMealPlanId}
                onChange={(e) => setSelectedMealPlanId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">{t("coach.selectMealPlan")}</option>
                {myMealPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
              <Button className="w-full" loading={sending === "meal"} onClick={sendMealProposal}>
                {t("coach.sendMealDraft")}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("coach.goalMacros")}</label>
              <select
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">{t("coach.selectCalorieGoal")}</option>
                {myGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name || t("coach.fallbackGoalName", { type: goal.type })}
                  </option>
                ))}
              </select>
              <Button className="w-full" loading={sending === "goal"} onClick={sendGoalProposal}>
                {t("coach.sendGoalDraft")}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={t("coach.proposalHistory")} />
        <div className="space-y-3">
          {proposals.length === 0 ? (
            <p className="text-sm text-gray-400">{t("coach.noCoachProposals")}</p>
          ) : proposals.map((proposal) => (
            <div key={proposal.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {proposalLabel(proposal)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {proposalStatusLabel(proposal.status)} · {new Date(proposal.createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                proposal.status === "accepted"
                  ? "bg-green-100 text-green-700"
                  : proposal.status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              }`}>
                {proposalStatusLabel(proposal.status)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
