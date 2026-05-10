import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  calorieGoalsApi,
  coachApi,
  mealPlansApi,
  templatesApi,
} from "../../api";
import type {
  CalorieGoal,
  CoachAdherenceSummary,
  CoachClientOverview,
  CoachLibraryFavorite,
  CoachProposal,
  MealPlan,
  User,
  WeeklyReview,
  Workout,
  WorkoutTemplate,
} from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { OwnershipChip, StatusChip, VisibilityChip } from "../../components/coach/CoachUi";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";
import { FoodPicker } from "../../components/food/FoodPicker";
import { UserRoleBadge } from "../../components/user/UserRoleBadge";
import { durationToWeeks, type ScaledFoodItem } from "../../lib/foodSearch";
import { emitDataChanged } from "../../lib/appEvents";

type MealName = "breakfast" | "lunch" | "dinner" | "snack";
type DurationMode = "weeks" | "months";

interface CustomWorkoutPattern {
  dayIndex: number;
  workoutName: string;
  muscleGroups: string;
  isRestDay: boolean;
  notes: string;
}
interface ScratchMealItem extends ScaledFoodItem {
  id: string;
}

const WEEKDAYS = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
  { label: "Sat", value: 5 },
  { label: "Sun", value: 6 },
];

const MEALS: MealName[] = ["breakfast", "lunch", "dinner", "snack"];

const todayIso = () => new Date().toISOString().slice(0, 10);

const mondayIso = () => {
  const date = new Date();
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
};

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const addMonths = (iso: string, months: number) => {
  const date = new Date(`${iso}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
};

const makeWorkoutPattern = (): CustomWorkoutPattern[] =>
  WEEKDAYS.map((day) => ({
    dayIndex: day.value,
    workoutName: "",
    muscleGroups: "",
    isRestDay: day.value >= 5,
    notes: "",
  }));

const scratchKey = (dayIndex: number, meal: MealName) => `${dayIndex}:${meal}`;

function sumScratchItems(items: ScratchMealItem[]) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + Number(item.calories || 0),
      protein: acc.protein + Number(item.protein || 0),
      carbs: acc.carbs + Number(item.carbs || 0),
      fats: acc.fats + Number(item.fats || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );
}
function buildCustomWorkoutDays(
  pattern: CustomWorkoutPattern[],
  startDate: string,
  mode: DurationMode,
  amount: number,
) {
  const endDate =
    mode === "weeks"
      ? addDays(startDate, Math.max(1, amount) * 7)
      : addMonths(startDate, Math.max(1, amount));
  const days = [];
  let cursor = startDate;

  while (cursor < endDate && days.length < 366) {
    const date = new Date(`${cursor}T00:00:00`);
    const isoDay = (date.getDay() + 6) % 7;
    const day = pattern.find((item) => item.dayIndex === isoDay);

    if (day && (day.isRestDay || day.workoutName.trim())) {
      days.push({
        date: cursor,
        workoutName: day.workoutName.trim() || undefined,
        muscleGroups: day.muscleGroups
          .split(",")
          .map((group) => group.trim())
          .filter(Boolean),
        isRestDay: day.isRestDay,
        notes: day.notes.trim() || undefined,
      });
    }
    cursor = addDays(cursor, 1);
  }

  return days;
}

export default function CoachClientPage() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const clientNumericId = Number(clientId);
  const [client, setClient] = useState<User | null>(null);
  const [clientVisibility, setClientVisibility] = useState<CoachClientOverview["visibility"] | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [activeGoal, setActiveGoal] = useState<CalorieGoal | null>(null);
  const [nutritionSummary, setNutritionSummary] = useState({ calories: 0, protein: 0 });
  const [clientPlans, setClientPlans] = useState<MealPlan[]>([]);
  const [proposals, setProposals] = useState<CoachProposal[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([]);
  const [adherenceSummary, setAdherenceSummary] = useState<CoachAdherenceSummary | null>(null);
  const [libraryFavorites, setLibraryFavorites] = useState<CoachLibraryFavorite[]>([]);
  const [libraryTemplates, setLibraryTemplates] = useState<WorkoutTemplate[]>([]);
  const [libraryMealPlans, setLibraryMealPlans] = useState<MealPlan[]>([]);
  const [myTemplates, setMyTemplates] = useState<WorkoutTemplate[]>([]);
  const [myMealPlans, setMyMealPlans] = useState<MealPlan[]>([]);
  const [myGoals, setMyGoals] = useState<CalorieGoal[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const [selectedMealPlanId, setSelectedMealPlanId] = useState<number | "">("");
  const [selectedGoalId, setSelectedGoalId] = useState<number | "">("");
  const [weekdays, setWeekdays] = useState<number[]>([0]);
  const [months, setMonths] = useState(1);
  const [overwrite, setOverwrite] = useState(false);
  const [workoutMode, setWorkoutMode] = useState<"quick" | "custom">("quick");
  const [customStartDate, setCustomStartDate] = useState(todayIso());
  const [customDurationMode, setCustomDurationMode] = useState<DurationMode>("weeks");
  const [customDurationValue, setCustomDurationValue] = useState(4);
  const [customWorkoutPattern, setCustomWorkoutPattern] = useState(makeWorkoutPattern);
  const [mealMode, setMealMode] = useState<"existing" | "scratch">("existing");
  const [mealDurationMode, setMealDurationMode] = useState<DurationMode>("weeks");
  const [mealDurationValue, setMealDurationValue] = useState(4);
  const [scratchMealName, setScratchMealName] = useState(t("coach.scratchMealDefaultName"));
  const [scratchWeekStart, setScratchWeekStart] = useState(mondayIso());
  const [scratchMeals, setScratchMeals] = useState<Record<string, ScratchMealItem[]>>({});
  const [sending, setSending] = useState<null | "workout" | "meal" | "goal">(null);
  const [proposalCommentDrafts, setProposalCommentDrafts] = useState<Record<number, string>>({});
  const [commentingProposalId, setCommentingProposalId] = useState<number | null>(null);
  const [weeklyReviewNotes, setWeeklyReviewNotes] = useState<Record<string, string>>({});
  const [savingReviewNoteKey, setSavingReviewNoteKey] = useState<string | null>(null);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
  const mealDurationWeeks = durationToWeeks(mealDurationMode, mealDurationValue);

  const load = async () => {
    const [overview, templatesRes, mealPlansRes, goalsRes, libraryRes] = await Promise.all([
      coachApi.getClientOverview(clientNumericId),
      templatesApi.getAll(),
      mealPlansApi.getAll(),
      calorieGoalsApi.getAll(),
      coachApi.getLibrary(),
    ]);
    const data: CoachClientOverview = overview.data;
    setClient(data.client);
    setRecentWorkouts(data.recentWorkouts);
    setActiveGoal(data.activeGoal);
    setNutritionSummary(data.nutritionSummary);
    setClientPlans(data.plans);
    setClientVisibility(data.visibility ?? null);
    setProposals(data.proposals);
    setWeeklyReviews(data.weeklyReviews ?? []);
    setAdherenceSummary(data.adherenceSummary ?? null);
    setWeeklyReviewNotes(
      Object.fromEntries((data.weeklyReviews ?? []).map((review) => [review.weekStart, review.coachNote ?? ""])),
    );
    setMyTemplates(templatesRes.data.templates);
    setMyMealPlans(mealPlansRes.data.plans);
    setMyGoals(goalsRes.data.goals);
    setLibraryFavorites(libraryRes.data.favorites ?? []);
    setLibraryTemplates(libraryRes.data.templates ?? []);
    setLibraryMealPlans(libraryRes.data.mealPlans ?? []);
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
      prev.includes(value)
        ? prev.filter((day) => day !== value)
        : [...prev, value].sort((a, b) => a - b),
    );
  };

  const updateWorkoutPattern = (
    dayIndex: number,
    patch: Partial<CustomWorkoutPattern>,
  ) => {
    setCustomWorkoutPattern((prev) =>
      prev.map((day) => (day.dayIndex === dayIndex ? { ...day, ...patch } : day)),
    );
  };

  const addScratchMealItem = (dayIndex: number, meal: MealName, food: ScaledFoodItem) => {
    const key = scratchKey(dayIndex, meal);
    setScratchMeals((prev) => ({
      ...prev,
      [key]: [
        ...(prev[key] ?? []),
        { ...food, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ],
    }));
  };

  const updateScratchMealItem = (
    dayIndex: number,
    meal: MealName,
    itemId: string,
    patch: Partial<ScratchMealItem>,
  ) => {
    const key = scratchKey(dayIndex, meal);
    setScratchMeals((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    }));
  };

  const removeScratchMealItem = (dayIndex: number, meal: MealName, itemId: string) => {
    const key = scratchKey(dayIndex, meal);
    setScratchMeals((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((item) => item.id !== itemId),
    }));
  };

  const isFavorite = (itemType: "template" | "meal", sourceId: number) =>
    libraryFavorites.some((favorite) => favorite.itemType === itemType && favorite.sourceId === sourceId);

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

  const saveReviewNote = async (weekStart: string) => {
    setSavingReviewNoteKey(weekStart);
    try {
      const review = await coachApi.updateWeeklyReviewNote(
        clientNumericId,
        weekStart,
        weeklyReviewNotes[weekStart] ?? "",
      );
      setWeeklyReviews((prev) => prev.map((item) => (item.weekStart === weekStart ? review.data.review : item)));
      setWeeklyReviewNotes((prev) => ({
        ...prev,
        [weekStart]: review.data.review.coachNote ?? "",
      }));
    } finally {
      setSavingReviewNoteKey(null);
    }
  };

  const buildScratchMealPlanDays = () =>
    WEEKDAYS.map((day) => ({
      dayIndex: day.value,
      meals: MEALS.map((meal) => ({
        meal,
        items: (scratchMeals[scratchKey(day.value, meal)] ?? []).map(({ id: _id, ...item }) => item),
      })).filter((meal) => meal.items.length > 0),
    }));

  const hasScratchMealItems = useMemo(
    () => Object.values(scratchMeals).some((items) => items.length > 0),
    [scratchMeals],
  );

  const sendWorkoutProposal = async () => {
    if (workoutMode === "quick" && !selectedTemplateId) return;
    setSending("workout");
    try {
      if (workoutMode === "custom") {
        await coachApi.createProposal({
          clientId: clientNumericId,
          type: "workout",
          sourceId: 0,
          payload: {
            mode: "custom",
            overwrite,
            days: buildCustomWorkoutDays(
              customWorkoutPattern,
              customStartDate,
              customDurationMode,
              customDurationValue,
            ),
          },
        });
      } else {
        await coachApi.createProposal({
          clientId: clientNumericId,
          type: "workout",
          sourceId: Number(selectedTemplateId),
          payload: { mode: "quick", weekdays, months, overwrite },
        });
      }
      await load();
    } finally {
      setSending(null);
    }
  };

  const sendMealProposal = async () => {
    if (mealMode === "existing" && !selectedMealPlanId) return;
    if (mealMode === "scratch" && !hasScratchMealItems) return;
    setSending("meal");
    try {
      if (mealMode === "scratch") {
        await coachApi.createProposal({
          clientId: clientNumericId,
          type: "meal",
          sourceId: 0,
          payload: {
            mode: "scratch",
            mealPlan: {
              name: scratchMealName,
              weekStart: scratchWeekStart,
              durationWeeks: mealDurationWeeks,
              days: buildScratchMealPlanDays(),
            },
          },
        });
      } else {
        await coachApi.createProposal({
          clientId: clientNumericId,
          type: "meal",
          sourceId: Number(selectedMealPlanId),
          payload: { mode: "existing", durationWeeks: mealDurationWeeks },
        });
      }
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

  const handleProposalComment = async (proposalId: number) => {
    const body = (proposalCommentDrafts[proposalId] ?? "").trim();
    if (!body) return;
    setCommentingProposalId(proposalId);
    try {
      await coachApi.addProposalComment(proposalId, body);
      setProposalCommentDrafts((prev) => ({ ...prev, [proposalId]: "" }));
      await load();
      emitDataChanged("coach-proposal");
    } finally {
      setCommentingProposalId(null);
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

  const latestWeeklyReview = weeklyReviews[0] ?? null;
  const formatPercent = (value?: number | null) => (value == null ? "--" : `${Math.round(value)}%`);
  const formatWeightDelta = (value?: number | null) =>
    value == null ? "--" : `${value >= 0 ? "+" : ""}${value.toFixed(1)} kg`;
  const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "--");
  const visibility = clientVisibility ?? client?.coachVisibility ?? null;
  const visibilityItems = visibility
    ? [
        { key: "workouts", label: t("settings.coachVisibilityWorkouts"), visible: visibility.workouts },
        { key: "nutrition", label: t("settings.coachVisibilityNutrition"), visible: visibility.nutrition },
        { key: "weight", label: t("settings.coachVisibilityWeight"), visible: visibility.weight },
        { key: "goals", label: t("settings.coachVisibilityGoals"), visible: visibility.goals },
        { key: "mealPlans", label: t("settings.coachVisibilityMealPlans"), visible: visibility.mealPlans },
        { key: "calendar", label: t("settings.coachVisibilityCalendar"), visible: visibility.calendar },
      ]
    : [];
  const latestTrendSummary = adherenceSummary
    ? [
        adherenceSummary.workoutAdherence != null
          ? `${t("coach.workoutWidget")}: ${formatPercent(adherenceSummary.workoutAdherence)}`
          : null,
        adherenceSummary.proteinAdherence != null
          ? `${t("coach.proteinWidget")}: ${formatPercent(adherenceSummary.proteinAdherence)}`
          : null,
        adherenceSummary.weightDelta != null
          ? `${t("coach.weightWidget")}: ${formatWeightDelta(adherenceSummary.weightDelta)}`
          : null,
      ]
        .filter(Boolean)
        .join(" / ")
    : t("coach.noWeeklyCheckIns");
  const currentGoalSummary = activeGoal
    ? `${Math.round(activeGoal.dailyCalories)} kcal / ${Math.round(activeGoal.proteinGrams)}P / ${Math.round(activeGoal.carbsGrams)}C / ${Math.round(activeGoal.fatsGrams)}F`
    : t("coach.noActiveCalorieGoal");
  const trainingFrequencySummary =
    client?.trainingDaysPerWeek != null
      ? t("coach.trainingDaysSummary", { count: client.trainingDaysPerWeek })
      : t("coach.noTrainingFrequency");
  const attentionSummary = weeklyReviews.filter(
    (review) => !review.adjustmentStatus || review.adjustmentStatus === "saved",
  ).length;
  const checkInScore = (review: WeeklyReview) => {
    const values = [review.calorieAdherence, review.proteinAdherence].filter(
      (value): value is number => typeof value === "number",
    );
    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
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

      <Card className="overflow-hidden border-brand-100 bg-gradient-to-br from-brand-50/80 via-white to-amber-50/70 dark:from-brand-900/20 dark:via-gray-800 dark:to-gray-900">
        <div className="grid gap-5 lg:grid-cols-[1.3fr,0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-300">
                  {t("coach.clientSnapshot")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {client?.firstName || client?.username} {client?.lastName || ""}
                  </h2>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm dark:bg-gray-800/80 dark:text-gray-200">
                    @{client?.username}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {t("coach.clientSnapshotBody")}
                </p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-right shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">{t("coach.latestTrendSummary")}</p>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-200">{latestTrendSummary}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">{t("coach.currentGoal")}</p>
                <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{client?.goal || "-"}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{currentGoalSummary}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">{t("coach.trainingFrequency")}</p>
                <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{trainingFrequencySummary}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("coach.recentWorkouts")}: {recentWorkouts.length}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">{t("coach.recentCalories")}</p>
                <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{Math.round(nutritionSummary.calories)} kcal</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("coach.recentProtein")}: {Math.round(nutritionSummary.protein)} g</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">{t("coach.pendingProposals")}</p>
                <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{pendingCount}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("coach.overdueCheckIns")}: {attentionSummary}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/85">
            <CardHeader title={t("coach.visibilityConsent")} subtitle={t("settings.coachPrivacyHelp")} />
            <div className="flex flex-wrap gap-2">
              {visibilityItems.length === 0 ? (
                <p className="text-sm text-gray-400">{t("coach.noVisibilityData")}</p>
              ) : (
                visibilityItems.map((item) => (
                  <VisibilityChip
                    key={item.key}
                    state={item.visible ? "visible" : "private"}
                    audienceLabel={item.label}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
            {t("coach.thisWeek")}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{t("coach.checkInSummary")}</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
          <CardHeader title={t("coach.adherenceWidgets")} subtitle={latestWeeklyReview ? `${latestWeeklyReview.weekStart} - ${latestWeeklyReview.weekEnd}` : t("coach.noWeeklyCheckIns")} />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 dark:border-rose-900/40 dark:bg-rose-900/20">
              <p className="text-[11px] uppercase tracking-wide text-rose-500">Kcal / {t("coach.calorieWidget")}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatPercent(adherenceSummary?.calorieAdherence ?? latestWeeklyReview?.calorieAdherence ?? null)}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
              <p className="text-[11px] uppercase tracking-wide text-emerald-600">Prot / {t("coach.proteinWidget")}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatPercent(adherenceSummary?.proteinAdherence ?? latestWeeklyReview?.proteinAdherence ?? null)}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 dark:border-sky-900/40 dark:bg-sky-900/20">
              <p className="text-[11px] uppercase tracking-wide text-sky-600">Move / {t("coach.workoutWidget")}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatPercent(adherenceSummary?.workoutAdherence ?? null)}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
              <p className="text-[11px] uppercase tracking-wide text-amber-600">Trend / {t("coach.weightWidget")}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatWeightDelta(adherenceSummary?.weightDelta ?? null)}
              </p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {adherenceSummary
              ? `${adherenceSummary.workoutsCompleted ?? 0}${adherenceSummary.plannedWorkouts ? ` / ${adherenceSummary.plannedWorkouts}` : ""} ${t("coach.workoutWidget").toLowerCase()}`
              : t("coach.noWeeklyCheckIns")}
          </div>
        </Card>

        <Card className="border-l-4 border-l-brand-500 bg-white dark:bg-gray-800">
          <CardHeader title={t("coach.weeklyCheckIns")} subtitle={latestWeeklyReview ? t("coach.checkInSummary") : t("coach.noWeeklyCheckIns")} />
          <div className="space-y-3">
            {weeklyReviews.length === 0 ? (
              <p className="text-sm text-gray-400">{t("coach.noWeeklyCheckIns")}</p>
            ) : (
              weeklyReviews.slice(0, 3).map((review) => (
                <div key={review.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {review.weekStart} - {review.weekEnd}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("coach.loggedAtLabel")}: {formatDateTime(review.updatedAt)}
                      </p>
                    </div>
                    {(!review.adjustmentStatus || review.adjustmentStatus === "saved" || (checkInScore(review) != null && checkInScore(review)! < 85)) ? (
                      <StatusChip status="needs_attention" label={t("coach.needsFollowUp")} />
                    ) : (
                      <StatusChip status="accepted" label={review.adjustmentStatus ?? "saved"} />
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <div>{t("coach.calorieWidget")}: {formatPercent(review.calorieAdherence ?? null)}</div>
                    <div>{t("coach.proteinWidget")}: {formatPercent(review.proteinAdherence ?? null)}</div>
                    <div>{t("coach.workoutWidget")}: {review.workoutsCompleted ?? 0}{review.plannedWorkouts ? ` / ${review.plannedWorkouts}` : ""}</div>
                    <div>{t("coach.weightWidget")}: {review.averageWeight != null ? `${review.averageWeight} kg` : "--"}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-gray-50/90 p-3 dark:bg-gray-900/40">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t("coach.planStatusLabel")}</p>
                      <p className="mt-1 text-sm font-medium capitalize text-gray-800 dark:text-gray-100">
                        {review.planStatus.replaceAll("_", " ")}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                      {checkInScore(review) == null ? "--" : `${checkInScore(review)}%`}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">{review.recommendation}</p>
                  <div className="mt-3 rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        {t("coach.coachNote")}
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={savingReviewNoteKey === review.weekStart}
                        onClick={() => void saveReviewNote(review.weekStart)}
                      >
                        {t("coach.saveNote")}
                      </Button>
                    </div>
                    <textarea
                      className="w-full min-h-20 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs"
                      placeholder={t("coach.notePlaceholder")}
                      value={weeklyReviewNotes[review.weekStart] ?? ""}
                      onChange={(e) => setWeeklyReviewNotes((prev) => ({ ...prev, [review.weekStart]: e.target.value }))}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{t("coach.fatigue")}: {review.fatigue ?? "--"}</span>
                    <span>{t("coach.soreness")}: {review.soreness ?? "--"}</span>
                    <span>{t("coach.hunger")}: {review.hunger ?? "--"}</span>
                    <span>{t("coach.sleepQuality")}: {review.sleepQuality ?? "--"}</span>
                    <span>{t("coach.performance")}: {review.perceivedPerformance ?? "--"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
            {t("coach.plansAndProposals")}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{t("coach.clientActivity")}</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          <CardHeader title={t("coach.reusableLibraries")} subtitle={t("coach.reusableLibrariesSub")} />
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("coach.workoutLibraries")}</p>
              <div className="mt-2 space-y-2">
                {libraryTemplates.length === 0 ? (
                  <p className="text-sm text-gray-400">{t("coach.noWorkoutLibraries")}</p>
                ) : (
                  libraryTemplates.slice(0, 5).map((template) => (
                    <div key={template.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{template.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{template.splitType}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={isFavorite("template", template.id) ? "primary" : "secondary"}
                          loading={togglingFavorite === `template:${template.id}`}
                          onClick={() => void toggleFavorite("template", template.id)}
                        >
                          {isFavorite("template", template.id) ? "â˜…" : "â˜†"}
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setWorkoutMode("quick");
                            setSelectedTemplateId(template.id);
                          }}
                        >
                          {t("coach.swapWorkout")}
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
                {libraryMealPlans.length === 0 ? (
                  <p className="text-sm text-gray-400">{t("coach.noMealLibraries")}</p>
                ) : (
                  libraryMealPlans.slice(0, 5).map((plan) => (
                    <div key={plan.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{plan.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t("coach.weekCount", { count: plan.durationWeeks })}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={isFavorite("meal", plan.id) ? "primary" : "secondary"}
                          loading={togglingFavorite === `meal:${plan.id}`}
                          onClick={() => void toggleFavorite("meal", plan.id)}
                        >
                          {isFavorite("meal", plan.id) ? "â˜…" : "â˜†"}
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setMealMode("existing");
                            setSelectedMealPlanId(plan.id);
                          }}
                        >
                          {t("coach.swapMeal")}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-2 border-dashed border-brand-200 bg-white dark:border-brand-900/40 dark:bg-gray-800">
          <CardHeader title={t("coach.quickActionsLabel")} subtitle={t("coach.createZone")} />
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>{t("coach.notificationsSub")}</p>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-xs text-gray-400">{t("coach.totalClients")}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {adherenceSummary?.checkInCount ?? weeklyReviews.length}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-xs text-gray-400">{t("coach.overdueCheckIns")}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {weeklyReviews.filter((review) => !review.adjustmentStatus || review.adjustmentStatus === "saved").length}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("coach.noNotifications")}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={() => setMealMode("existing")}>
                {t("coach.swapMeal")}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setWorkoutMode("quick")}>
                {t("coach.swapWorkout")}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setMealMode("scratch")}>
                {t("coach.reusePlan")}
              </Button>
            </div>
          </div>
        </Card>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
            {t("coach.coachTools")}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{t("coach.publishDrafts")}</h2>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
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
                  <p>{Math.round(activeGoal.dailyCalories)} kcal / {Math.round(activeGoal.proteinGrams)}p / {Math.round(activeGoal.carbsGrams)}c / {Math.round(activeGoal.fatsGrams)}f</p>
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
                    {plan.name} / {t("coach.weekCount", { count: plan.durationWeeks })}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-2 border-brand-100 bg-brand-50/30 dark:border-brand-900/40 dark:bg-brand-900/10">
          <CardHeader title={t("coach.publishDrafts")} subtitle={t("coach.createZone")} />
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 text-xs">
                <button
                  className={`flex-1 rounded-md px-2 py-1.5 ${workoutMode === "quick" ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300"}`}
                  onClick={() => setWorkoutMode("quick")}
                >
                  {t("coach.quickSchedule")}
                </button>
                <button
                  className={`flex-1 rounded-md px-2 py-1.5 ${workoutMode === "custom" ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300"}`}
                  onClick={() => setWorkoutMode("custom")}
                >
                  {t("coach.advancedPerDay")}
                </button>
              </div>

              {workoutMode === "quick" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("coach.workoutTemplate")}</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
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
                  <select
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  >
                    <option value={1}>{t("coach.oneMonth")}</option>
                    <option value={2}>{t("coach.twoMonths")}</option>
                    <option value={3}>{t("coach.threeMonths")}</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-gray-500">
                      {t("coach.startDate")}
                      <input className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2 text-sm" type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                    </label>
                    <label className="text-xs text-gray-500">
                      {t("coach.duration")}
                      <div className="mt-1 flex gap-1">
                        <input className="w-16 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2 text-sm" type="number" min={1} max={customDurationMode === "weeks" ? 52 : 12} value={customDurationValue} onChange={(e) => setCustomDurationValue(Number(e.target.value))} />
                        <select className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2 text-sm" value={customDurationMode} onChange={(e) => setCustomDurationMode(e.target.value as DurationMode)}>
                          <option value="weeks">{t("coach.weeks")}</option>
                          <option value="months">{t("coach.months")}</option>
                        </select>
                      </div>
                    </label>
                  </div>
                  <div className="space-y-2">
                    {customWorkoutPattern.map((day) => (
                      <div key={day.dayIndex} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold">{WEEKDAYS[day.dayIndex].label}</span>
                          <label className="flex items-center gap-1 text-xs text-gray-500">
                            <input type="checkbox" checked={day.isRestDay} onChange={(e) => updateWorkoutPattern(day.dayIndex, { isRestDay: e.target.checked })} />
                            {t("coach.restDay")}
                          </label>
                        </div>
                        {!day.isRestDay && (
                          <>
                            <input className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm" placeholder={t("coach.workoutNamePlaceholder")} value={day.workoutName} onChange={(e) => updateWorkoutPattern(day.dayIndex, { workoutName: e.target.value })} />
                            <input className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm" placeholder={t("coach.muscleGroupsPlaceholder")} value={day.muscleGroups} onChange={(e) => updateWorkoutPattern(day.dayIndex, { muscleGroups: e.target.value })} />
                          </>
                        )}
                        <input className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm" placeholder={t("coach.notesPlaceholder")} value={day.notes} onChange={(e) => updateWorkoutPattern(day.dayIndex, { notes: e.target.value })} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                {t("coach.overwrite")}
              </label>
              <Button className="w-full" loading={sending === "workout"} onClick={sendWorkoutProposal}>
                {t("coach.sendWorkoutDraft")}
              </Button>
            </section>

            <section className="space-y-3">
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 text-xs">
                <button
                  className={`flex-1 rounded-md px-2 py-1.5 ${mealMode === "existing" ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300"}`}
                  onClick={() => setMealMode("existing")}
                >
                  {t("coach.existingPlan")}
                </button>
                <button
                  className={`flex-1 rounded-md px-2 py-1.5 ${mealMode === "scratch" ? "bg-brand-600 text-white" : "text-gray-600 dark:text-gray-300"}`}
                  onClick={() => setMealMode("scratch")}
                >
                  {t("coach.createFromScratch")}
                </button>
              </div>

              {mealMode === "existing" ? (
                <select
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  value={selectedMealPlanId}
                  onChange={(e) => setSelectedMealPlanId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">{t("coach.selectMealPlan")}</option>
                  {myMealPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <input className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm" value={scratchMealName} onChange={(e) => setScratchMealName(e.target.value)} />
                  <input className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm" type="date" value={scratchWeekStart} onChange={(e) => setScratchWeekStart(e.target.value)} />
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t("coach.searchMealBuilderHint")}</p>
                  <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                    {WEEKDAYS.map((day) => (
                      <div key={day.value} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold">{day.label}</p>
                          {(() => {
                            const dayItems = MEALS.flatMap((meal) => scratchMeals[scratchKey(day.value, meal)] ?? []);
                            const totals = sumScratchItems(dayItems);
                            return (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {t("coach.dayTotal")}: {Math.round(totals.calories)} kcal / {Math.round(totals.protein)}P / {Math.round(totals.carbs)}C / {Math.round(totals.fats)}F
                              </p>
                            );
                          })()}
                        </div>
                        <div className="space-y-3">
                          {MEALS.map((meal) => {
                            const items = scratchMeals[scratchKey(day.value, meal)] ?? [];
                            const totals = sumScratchItems(items);
                            return (
                              <div key={meal} className="rounded-lg bg-gray-50 dark:bg-gray-800/70 p-2 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{(t as (k: string) => string)(`mealPlanner.${meal}`)}</p>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                    {Math.round(totals.calories)} kcal / {Math.round(totals.protein)}P / {Math.round(totals.carbs)}C / {Math.round(totals.fats)}F
                                  </p>
                                </div>
                                {items.length === 0 ? (
                                  <p className="text-[11px] text-gray-400">{t("coach.emptyMealHint")}</p>
                                ) : (
                                  <div className="space-y-2">
                                    {items.map((item) => (
                                      <div key={item.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{item.foodName}</p>
                                          <button
                                            type="button"
                                            className="text-xs text-red-500 hover:text-red-600"
                                            onClick={() => removeScratchMealItem(day.value, meal, item.id)}
                                          >
                                            {t("common.delete")}
                                          </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1">
                                          <input className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs" type="number" min={0} step="any" value={item.quantity} onChange={(e) => updateScratchMealItem(day.value, meal, item.id, { quantity: Number(e.target.value) })} />
                                          <input className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs" value={item.unit} onChange={(e) => updateScratchMealItem(day.value, meal, item.id, { unit: e.target.value })} />
                                          <input className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs" type="number" min={0} step="any" value={item.calories} onChange={(e) => updateScratchMealItem(day.value, meal, item.id, { calories: Number(e.target.value) })} />
                                          <input className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs" type="number" min={0} step="any" value={item.protein} onChange={(e) => updateScratchMealItem(day.value, meal, item.id, { protein: Number(e.target.value) })} />
                                          <input className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs" type="number" min={0} step="any" value={item.carbs} onChange={(e) => updateScratchMealItem(day.value, meal, item.id, { carbs: Number(e.target.value) })} />
                                          <input className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs" type="number" min={0} step="any" value={item.fats} onChange={(e) => updateScratchMealItem(day.value, meal, item.id, { fats: Number(e.target.value) })} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <FoodPicker
                                  compact
                                  allowMacroEdit
                                  addLabel={t("coach.addFoodToMeal")}
                                  onAdd={(food) => addScratchMealItem(day.value, meal, food)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">{t("coach.duration")}</label>
                <div className="flex gap-2">
                  <input
                    className="w-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    type="number"
                    min={1}
                    max={mealDurationMode === "weeks" ? 52 : 12}
                    value={mealDurationValue}
                    onChange={(e) => setMealDurationValue(Number(e.target.value))}
                  />
                  <select
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    value={mealDurationMode}
                    onChange={(e) => setMealDurationMode(e.target.value as DurationMode)}
                  >
                    <option value="weeks">{t("coach.weeks")}</option>
                    <option value="months">{t("coach.months")}</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("coach.computedDuration", { count: mealDurationWeeks })}
                </p>
              </div>
              <Button
                className="w-full"
                loading={sending === "meal"}
                disabled={mealMode === "scratch" ? !hasScratchMealItems : !selectedMealPlanId}
                onClick={sendMealProposal}
              >
                {t("coach.sendMealDraft")}
              </Button>
            </section>

            <section className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("coach.goalMacros")}</label>
              <select
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
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
            </section>
          </div>
        </Card>
        </div>
      </div>

      <Card className="border-2 border-brand-100 bg-brand-50/30 dark:border-brand-900/40 dark:bg-brand-900/10">
        <CardHeader title={t("coach.proposalHistory")} subtitle={t("coach.reviewZone")} />
        <div className="space-y-3">
          {proposals.length === 0 ? (
            <p className="text-sm text-gray-400">{t("coach.noCoachProposals")}</p>
          ) : proposals.map((proposal) => (
            <div key={proposal.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <OwnershipChip owner="coach" />
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {proposalLabel(proposal)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {proposalStatusLabel(proposal.status)} / {new Date(proposal.createdAt).toLocaleString()}
                  </p>
                </div>
                <StatusChip
                  status={
                    proposal.status === "accepted"
                      ? "accepted"
                      : proposal.status === "rejected"
                        ? "rejected"
                        : "pending"
                  }
                  label={proposalStatusLabel(proposal.status)}
                />
              </div>
              {proposal.diffSummary?.length ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {t("coach.proposalDiff")}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    {proposal.diffSummary.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-brand-500">-</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {t("coach.proposalComments")}
                </p>
                <div className="mt-2 space-y-2">
                  {(proposal.comments ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400">{t("coach.noProposalComments")}</p>
                  ) : (
                    proposal.comments?.map((comment) => (
                      <div key={comment.id} className="rounded-lg bg-gray-50 dark:bg-gray-800/70 px-3 py-2">
                        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                          {comment.author?.firstName || comment.author?.username || t("coach.title")}{" "}
                          <UserRoleBadge role={comment.author?.role} className="ml-1" />
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">{comment.body}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={proposalCommentDrafts[proposal.id] ?? ""}
                    onChange={(e) => setProposalCommentDrafts((prev) => ({ ...prev, [proposal.id]: e.target.value }))}
                    placeholder={t("coach.commentPlaceholder")}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={commentingProposalId === proposal.id}
                    onClick={() => void handleProposalComment(proposal.id)}
                  >
                    {t("coach.sendComment")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
