import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { calendarApi, chatApi } from "../../api";
import type { Conversation, WorkoutTemplate } from "../../types";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useTranslation, t } from "../../i18n";
import type { TKey } from "../../i18n";
import { emitDataChanged } from "../../lib/appEvents";

type AgentType = "coach" | "nutritionist" | "general";
type ProposalKind = "workout" | "meal" | "goal" | null;
type ProposalState = "advice_only" | "plan_opportunity" | "plan_request";

interface ChatMessage {
  role: string;
  content: string;
  id?: number;
  proposalKind?: ProposalKind;
  proposalState?: ProposalState;
  saveableProposal?: boolean;
  suggestedWorkout?: Record<string, any>;
  suggestedPlan?: Record<string, any>;
  suggestedMealPlan?: Record<string, any>;
}

interface WorkoutScheduleState {
  template: WorkoutTemplate;
  workoutName: string;
  muscleGroups: string[];
}

interface PendingMealPlanState {
  plan: Record<string, any>;
  resolve: () => void;
  reject: (reason?: unknown) => void;
}

const AGENTS: { id: AgentType; label: string; icon: string; desc: string }[] = [
  {
    id: "coach",
    label: t("chat.workoutCoach"),
    icon: "🏋️",
    desc: t("chat.coachDesc"),
  },
  {
    id: "nutritionist",
    label: t("chat.nutritionist"),
    icon: "🥗",
    desc: t("chat.nutritionistDesc"),
  },
  {
    id: "general",
    label: t("chat.generalCoach"),
    icon: "🤖",
    desc: t("chat.generalDesc"),
  },
];

function getStarters(t: (k: TKey) => string): Record<AgentType, string[]> {
  return {
    coach: [
      t("chat.starterCoach1"),
      t("chat.starterCoach2"),
      t("chat.starterCoach3"),
      t("chat.starterCoach4"),
    ],
    nutritionist: [
      t("chat.starterNutri1"),
      t("chat.starterNutri2"),
      t("chat.starterNutri3"),
      t("chat.starterNutri4"),
    ],
    general: [
      t("chat.starterGeneral1"),
      t("chat.starterGeneral2"),
      t("chat.starterGeneral3"),
      t("chat.starterGeneral4"),
    ],
  };
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(startMonth: string, count: number): string[] {
  const [year, month] = startMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 1 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function getMondayIso(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  const { t } = useTranslation();
  return (
    <div className="flex items-end gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

// ── Suggestion action card ────────────────────────────────────────────────────
type CardState = "idle" | "saving" | "saved" | "dismissed";

function SuggestionCard({
  icon,
  title,
  question,
  confirmLabel,
  confirmStyle,
  onConfirm,
}: {
  icon: string;
  title: string;
  question: string;
  confirmLabel: string;
  confirmStyle: string;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<CardState>("idle");

  if (state === "dismissed") return null;

  const handleConfirm = async () => {
    setState("saving");
    try {
      await onConfirm();
      setState("saved");
    } catch {
      setState("idle");
    }
  };

  return (
    <div
      className={`mt-2 rounded-2xl border px-4 py-3 text-sm w-full max-w-sm transition-all ${
        state === "saved"
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
      }`}
    >
      {state === "saved" ? (
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
          <span>✅</span>
          <span>{t("chat.savedCheck", { title })}</span>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2 mb-3">
            <span className="text-xl shrink-0">{icon}</span>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight">
                {title}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                {question}
              </p>
            </div>
            <button
              onClick={() => setState("dismissed")}
              className="ml-auto text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 text-lg leading-none shrink-0"
              title="Dismiss"
            >
              ×
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={state === "saving"}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${confirmStyle} disabled:opacity-60`}
            >
              {state === "saving" ? t("chat.saving") : confirmLabel}
            </button>
            <button
              onClick={() => setState("dismissed")}
              className="px-3 py-2 rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t("chat.notNow")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function ChatBubble({
  msg,
  agentIcon,
  onSaveWorkout,
  onSavePlan,
  onSaveMealPlan,
}: {
  msg: ChatMessage;
  agentIcon: string;
  onSaveWorkout: (workout: Record<string, any>) => Promise<void>;
  onSavePlan: (plan: Record<string, any>) => Promise<void>;
  onSaveMealPlan: (plan: Record<string, any>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const isUser = msg.role === "user";

  // Strip all fenced JSON blocks from displayed text so users don't see raw JSON
  const displayText = msg.content
    .replace(/```workout-json[\s\S]*?```/g, "")
    .replace(/```nutrition-json[\s\S]*?```/g, "")
    .replace(/```meal-plan-json[\s\S]*?```/g, "")
    .trim();
  const canShowSaveCards = msg.saveableProposal === true;

  // Simple markdown-ish rendering: bold (**text**), line breaks
  const renderText = (raw: string) => {
    const lines = raw.split("\n");
    return lines.map((line, li) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((p, pi) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={pi}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={pi}>{p}</span>
        ),
      );
      return (
        <p
          key={li}
          className={
            line.startsWith("- ") || line.startsWith("• ") ? "ml-3" : ""
          }
        >
          {rendered}
        </p>
      );
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
          isUser ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-700"
        }`}
      >
        {isUser ? t("chat.meAvatar") : agentIcon}
      </div>

      {/* Bubble + action cards */}
      <div
        className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}
      >
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-1 ${
            isUser
              ? "bg-brand-600 text-white rounded-tr-sm"
              : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm shadow-sm"
          }`}
        >
          {renderText(displayText)}
        </div>

        {/* Prominent action cards — one per suggestion type */}
        {canShowSaveCards && msg.suggestedWorkout && (
          <SuggestionCard
            icon="💪"
            title={t("chat.workoutsTitle")}
            question={
              msg.suggestedWorkout.mode === "replace"
                ? t("chat.workoutReplaceQ")
                : t("chat.workoutSaveQ")
            }
            confirmLabel={
              msg.suggestedWorkout.mode === "replace"
                ? t("chat.workoutUpdateBtn")
                : t("chat.workoutAddBtn")
            }
            confirmStyle="bg-brand-600 hover:bg-brand-700 text-white"
            onConfirm={() => onSaveWorkout(msg.suggestedWorkout!)}
          />
        )}
        {canShowSaveCards && msg.suggestedMealPlan && (
          <SuggestionCard
            icon="🥗"
            title={t("chat.mealPlannerTitle")}
            question={
              msg.suggestedMealPlan.mode === "replace"
                ? t("chat.mealReplaceQ")
                : msg.suggestedMealPlan.mode === "append"
                  ? t("chat.mealAppendQ")
                  : t("chat.mealSaveQ")
            }
            confirmLabel={
              msg.suggestedMealPlan.mode === "replace"
                ? t("chat.mealUpdateBtn")
                : t("chat.mealSaveBtn")
            }
            confirmStyle="bg-orange-500 hover:bg-orange-600 text-white"
            onConfirm={() => onSaveMealPlan(msg.suggestedMealPlan!)}
          />
        )}
        {canShowSaveCards && msg.suggestedPlan && (
          <SuggestionCard
            icon="🎯"
            title={t("chat.goalsTitle")}
            question={t("chat.goalSaveQ")}
            confirmLabel={t("chat.goalSaveBtn")}
            confirmStyle="bg-green-600 hover:bg-green-700 text-white"
            onConfirm={() => onSavePlan(msg.suggestedPlan!)}
          />
        )}
      </div>
    </div>
  );
}

function WorkoutScheduleModal({
  plan,
  onClose,
  onConfirm,
}: {
  plan: WorkoutScheduleState | null;
  onClose: () => void;
  onConfirm: (payload: {
    weekdays: number[];
    months: number;
    overwrite: boolean;
  }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [weekdays, setWeekdays] = useState<number[]>([0]);
  const [months, setMonths] = useState(1);
  const [overwrite, setOverwrite] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plan) {
      setWeekdays([0]);
      setMonths(1);
      setOverwrite(false);
      setSaving(false);
    }
  }, [plan]);

  if (!plan) return null;

  const toggleDay = (dayIndex: number) => {
    setWeekdays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b),
    );
  };

  const labels = [
    t("mealPlanner.monday"),
    t("mealPlanner.tuesday"),
    t("mealPlanner.wednesday"),
    t("mealPlanner.thursday"),
    t("mealPlanner.friday"),
    t("mealPlanner.saturday"),
    t("mealPlanner.sunday"),
  ];

  return (
    <Modal open={true} onClose={onClose} title={t("chat.scheduleWorkoutTitle")}>
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {plan.workoutName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("chat.scheduleWorkoutBody")}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            {t("chat.scheduleWorkoutDays")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {labels.map((label, idx) => (
              <button
                key={label}
                onClick={() => toggleDay(idx)}
                className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                  weekdays.includes(idx)
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            {t("chat.scheduleWorkoutMonths")}
          </p>
          <div className="flex gap-2">
            {[1, 2, 3].map((value) => (
              <button
                key={value}
                onClick={() => setMonths(value)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  months === value
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                }`}
              >
                {t("chat.monthCount", { count: value })}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
          />
          <span>{t("chat.scheduleWorkoutOverwrite")}</span>
        </label>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {t("chat.notNow")}
          </Button>
          <Button
            className="flex-1"
            disabled={weekdays.length === 0 || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onConfirm({ weekdays, months, overwrite });
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? t("chat.saving") : t("chat.scheduleWorkoutConfirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MealPlanDurationModal({
  pending,
  onClose,
  onConfirm,
}: {
  pending: PendingMealPlanState | null;
  onClose: () => void;
  onConfirm: (durationWeeks: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [durationWeeks, setDurationWeeks] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pending) {
      const suggested = Number(pending.plan.durationWeeks ?? 1);
      setDurationWeeks([1, 4, 8, 12].includes(suggested) ? suggested : 1);
      setSaving(false);
    }
  }, [pending]);

  if (!pending) return null;

  return (
    <Modal open={true} onClose={onClose} title={t("chat.mealDurationTitle")}>
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {pending.plan.name || t("chat.mealPlannerTitle")}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("chat.mealDurationBody")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[1, 4, 8, 12].map((value) => (
            <button
              key={value}
              onClick={() => setDurationWeeks(value)}
              className={`rounded-xl border px-3 py-3 text-sm transition-colors ${
                durationWeeks === value
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              }`}
            >
              {t("chat.weekCount", { count: value })}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {t("chat.notNow")}
          </Button>
          <Button
            className="flex-1"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onConfirm(durationWeeks);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? t("chat.saving") : t("chat.mealDurationConfirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Chat page ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const STARTERS = getStarters(t);
  const [searchParams] = useSearchParams();
  const defaultAgent = (searchParams.get("agent") as AgentType) || "general";

  const [agent, setAgent] = useState<AgentType>(defaultAgent);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [pendingAgent, setPendingAgent] = useState<AgentType | null>(null);
  const [sidebarHistory, setSidebarHistory] = useState<Conversation[]>([]);
  const [pendingWorkoutSchedule, setPendingWorkoutSchedule] =
    useState<WorkoutScheduleState | null>(null);
  const [pendingMealPlan, setPendingMealPlan] =
    useState<PendingMealPlanState | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation history — metadata is parsed server-side and returned
  // alongside each entry so save buttons can be re-hydrated on old messages.
  const loadHistory = useCallback(async (a: AgentType) => {
    setLoading(true);
    try {
      const res = await chatApi.getHistory(a, 1, 30);
      const convs: ChatMessage[] = [];
      for (const c of res.data.conversations) {
        convs.push({ role: "user", content: c.message, id: c.id });
        if (c.response) {
          const meta = c.metadata ?? {};
          convs.push({
            role: "assistant",
            content: c.response,
            id: c.id,
            proposalKind: meta.proposalKind,
            proposalState: meta.proposalState,
            saveableProposal:
              typeof meta.saveableProposal === "boolean"
                ? meta.saveableProposal
                : Boolean(
                    meta.suggestedWorkout ||
                      meta.suggestedPlan ||
                      meta.suggestedMealPlan,
                  ),
            ...(meta.suggestedWorkout && {
              suggestedWorkout: meta.suggestedWorkout,
            }),
            ...(meta.suggestedPlan && { suggestedPlan: meta.suggestedPlan }),
            ...(meta.suggestedMealPlan && {
              suggestedMealPlan: meta.suggestedMealPlan,
            }),
          });
        }
      }
      setMessages(convs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(agent);
  }, [agent, loadHistory]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Sidebar: fetch recent messages across all agents
  const loadSidebarHistory = useCallback(async () => {
    try {
      const res = await chatApi.getHistory(undefined, 1, 30);
      setSidebarHistory(res.data.conversations);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadSidebarHistory();
  }, [loadSidebarHistory, messages.length]);

  const agentInfo = AGENTS.find((a) => a.id === agent)!;

  // Switch with confirmation if there's an active conversation
  const requestSwitchAgent = (next: AgentType) => {
    if (next === agent) return;
    if (messages.length > 0) {
      setPendingAgent(next);
    } else {
      setAgent(next);
    }
  };

  const confirmSwitch = () => {
    if (!pendingAgent) return;
    setAgent(pendingAgent);
    setPendingAgent(null);
  };

  // Sidebar helpers
  const relativeDay = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
    if (diff === 0) return t("chat.today");
    if (diff === 1) return t("chat.yesterday");
    if (diff < 7) return t("chat.daysAgo", { n: diff });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const showToast = (text: string, ok = true) => {
    setSaveMsg({ text, ok });
    setTimeout(() => setSaveMsg(null), 3500);
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setTyping(true);

    try {
      const res = await chatApi.send({ message: msg, agentType: agent });
      const {
        message: aiText,
        proposalKind,
        proposalState,
        saveableProposal,
        suggestedWorkout,
        suggestedPlan,
        suggestedMealPlan,
      } = res.data;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiText,
          proposalKind,
          proposalState,
          saveableProposal,
          ...(suggestedWorkout && { suggestedWorkout }),
          ...(suggestedPlan && { suggestedPlan }),
          ...(suggestedMealPlan && { suggestedMealPlan }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t("chat.errorMsg"),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm(t("chat.clearConfirm", { agent: agentInfo.label }))) return;
    await chatApi.clearHistory(agent);
    setMessages([]);
  };

  // Save workout template using the structured JSON the AI embedded
  // Returns a resolved promise on success, throws on failure (so SuggestionCard can track state)
  const handleSaveWorkout = async (
    workout: Record<string, any>,
  ): Promise<void> => {
    const res = await chatApi.saveWorkout({
      mode: workout.mode === "replace" ? "replace" : "create",
      targetTemplateId: workout.targetTemplateId ?? null,
      name: workout.name || `${agentInfo.label} Workout`,
      description: workout.description || "Suggested by AI Coach",
      splitType: workout.splitType || "Custom",
      objective: workout.objective || "general",
      frequency: workout.frequency ?? 3,
      dayLabel: workout.dayLabel || workout.name || "AI Workout",
      muscleGroups: workout.muscleGroups ?? [],
      exercises: workout.exercises ?? [],
    });
    setPendingWorkoutSchedule({
      template: res.data.template,
      workoutName: res.data.template.dayLabel || res.data.template.name,
      muscleGroups: Array.isArray(workout.muscleGroups)
        ? workout.muscleGroups
        : [],
    });
    showToast(
      workout.mode === "replace"
        ? t("chat.toastWorkoutUpdated")
        : t("chat.toastWorkoutSaved"),
    );
  };

  // Save/update a Meal Planner plan using the structured JSON the AI embedded.
  const handleSaveMealPlan = async (
    mealPlan: Record<string, any>,
  ): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      setPendingMealPlan({
        plan: mealPlan,
        resolve,
        reject,
      });
    });
  };

  // Save calorie / macro plan using the structured JSON the AI embedded
  const handleSavePlan = async (plan: Record<string, any>): Promise<void> => {
    await chatApi.saveCaloriePlan({
      name: plan.name,
      currentWeight: plan.currentWeight,
      targetWeight: plan.targetWeight,
      targetDate: plan.targetDate,
      dailyCalories: plan.dailyCalories,
      proteinGrams: plan.proteinGrams,
      carbsGrams: plan.carbsGrams,
      fatsGrams: plan.fatsGrams,
      notes: plan.notes,
    });
    showToast(t("chat.toastGoalSaved"));
  };

  const handleScheduleWorkout = async ({
    weekdays,
    months,
    overwrite,
  }: {
    weekdays: number[];
    months: number;
    overwrite: boolean;
  }) => {
    if (!pendingWorkoutSchedule) return;
    const startMonth = getCurrentMonth();
    const monthsToFill = getMonthRange(startMonth, months);
    const assignments = weekdays.map((dayOfWeek) => ({
      dayOfWeek,
      workoutName: pendingWorkoutSchedule.workoutName,
      muscleGroups: pendingWorkoutSchedule.muscleGroups,
      templateId: pendingWorkoutSchedule.template.id,
    }));

    for (const month of monthsToFill) {
      await calendarApi.populate({ month, assignments, overwrite });
    }

    emitDataChanged("workout");
    setPendingWorkoutSchedule(null);
    showToast(t("chat.toastWorkoutScheduled"));
    navigate("/workouts");
  };

  const closePendingMealPlan = () => {
    if (!pendingMealPlan) return;
    pendingMealPlan.reject(new Error("cancelled"));
    setPendingMealPlan(null);
  };

  const confirmPendingMealPlan = async (durationWeeks: number) => {
    if (!pendingMealPlan) return;
    const mealPlan = pendingMealPlan.plan;
    await chatApi.saveMealPlan({
      mode:
        mealPlan.mode === "replace" || mealPlan.mode === "append"
          ? mealPlan.mode
          : "create",
      targetPlanId: mealPlan.targetPlanId ?? null,
      name: mealPlan.name,
      weekStart: mealPlan.weekStart || getMondayIso(),
      durationWeeks,
      days: mealPlan.days,
      meals: mealPlan.meals,
    });
    emitDataChanged("meal-plan");
    showToast(
      mealPlan.mode === "replace"
        ? t("chat.toastMealUpdated")
        : t("chat.toastMealSaved"),
    );
    pendingMealPlan.resolve();
    setPendingMealPlan(null);
    navigate("/meal-planner");
  };

  return (
    <>
      {/* pb-14 on mobile reserves space above the fixed bottom nav bar (h-14 = 56px) */}
      <div className="flex h-screen max-h-screen bg-gray-50 dark:bg-gray-900 pb-14 md:pb-0">
        {/* ── History Sidebar ────────────────────────────────────────────────── */}
        <aside className="w-56 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex-col hidden lg:flex">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t("chat.recentChats")}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {sidebarHistory.length === 0 ? (
              <p className="text-xs text-gray-300 dark:text-gray-600 px-4 py-3">
                {t("chat.noHistory")}
              </p>
            ) : (
              sidebarHistory.map((c) => {
                const agentDef = AGENTS.find((a) => a.id === c.agentType);
                return (
                  <button
                    key={c.id}
                    onClick={() => requestSwitchAgent(c.agentType as AgentType)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group ${
                      c.agentType === agent
                        ? "bg-brand-50 dark:bg-brand-900/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base">
                        {agentDef?.icon ?? "🤖"}
                      </span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {agentDef?.label}
                      </span>
                      <span className="ml-auto text-[10px] text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500">
                        {relativeDay(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate pl-6">
                      {c.message}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Main chat column ───────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Agent switcher + header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {t("chat.title")}
                </h1>
                {messages.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                  >
                    {t("chat.clearHistory")}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {AGENTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => requestSwitchAgent(a.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      agent === a.id
                        ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    <span>{a.icon}</span>
                    <span className="hidden sm:inline">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-5">
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                /* Welcome / starter prompts */
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                    {agentInfo.icon}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {agentInfo.label}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                    {agentInfo.desc}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                    {STARTERS[agent].map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:border-brand-300 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors text-gray-700 dark:text-gray-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <ChatBubble
                    key={i}
                    msg={m}
                    agentIcon={agentInfo.icon}
                    onSaveWorkout={handleSaveWorkout}
                    onSavePlan={handleSavePlan}
                    onSaveMealPlan={handleSaveMealPlan}
                  />
                ))
              )}

              {typing && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm shrink-0">
                    {agentInfo.icon}
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Toast notification */}
          {saveMsg && (
            <div
              className={`fixed bottom-24 left-1/2 -translate-x-1/2 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50 transition-all ${
                saveMsg.ok ? "bg-gray-900" : "bg-red-600"
              }`}
            >
              {saveMsg.text}
            </div>
          )}

          {/* Input bar */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-4 shrink-0">
            <div className="max-w-3xl mx-auto flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={t("chat.inputPlaceholder", { agent: agentInfo.label })}
                rows={1}
                className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 max-h-40 overflow-y-auto"
                style={{ minHeight: "44px" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 160) + "px";
                }}
              />
              <Button
                onClick={() => send()}
                disabled={!input.trim() || typing}
                className="shrink-0 h-11 w-11 rounded-2xl p-0 flex items-center justify-center"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </div>
        {/* end main chat column */}
      </div>
      {/* end flex outer */}

      {/* ── Agent-switch confirmation modal (#15) ──────────────────────────── */}
      <WorkoutScheduleModal
        plan={pendingWorkoutSchedule}
        onClose={() => setPendingWorkoutSchedule(null)}
        onConfirm={handleScheduleWorkout}
      />

      <MealPlanDurationModal
        pending={pendingMealPlan}
        onClose={closePendingMealPlan}
        onConfirm={confirmPendingMealPlan}
      />

      {pendingAgent &&
        (() => {
          const next = AGENTS.find((a) => a.id === pendingAgent)!;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
                <div className="text-center mb-4">
                  <span className="text-4xl">{next.icon}</span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 text-center">
                  {t("chat.switchToAgent", { agent: next.label })}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 text-center">
                  {t("chat.switchBody")}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setPendingAgent(null)}
                  >
                    {t("chat.stayHere")}
                  </Button>
                  <Button className="flex-1" onClick={confirmSwitch}>
                    {t("chat.switchBtn")}
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}
