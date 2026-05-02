import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { workoutsApi, templatesApi, searchApi, foodApi, calorieGoalsApi, calendarApi, usersApi, chatApi, customExercisesApi } from "../../api";
import type { Workout, WorkoutExercise, PRResult, WorkoutTemplate, WorkoutCalendarDay } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { useTranslation, t as _t } from "../../i18n";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";

// ─────────────────────────────────────────────────────────────────────────────
// MET Activity data (Compendium of Physical Activities, Ainsworth et al.)
// ─────────────────────────────────────────────────────────────────────────────
interface METActivity {
  id: string; name: string; category: "weights" | "cardio" | "sports" | "daily";
  icon: string; met: number; intensity: string; notes?: string;
}
const MET_ACTIVITIES: METActivity[] = [
  // Weights
  { id: "weights_general",   name: "Weight training (general)",    category: "weights", icon: "🏋️",  met: 3.5,  intensity: "moderate" },
  { id: "weights_vigorous",  name: "Weight training (vigorous)",   category: "weights", icon: "🏋️",  met: 6.0,  intensity: "vigorous" },
  { id: "circuit_training",  name: "Circuit training",             category: "weights", icon: "🔄",  met: 8.0,  intensity: "high"     },
  { id: "powerlifting",      name: "Powerlifting",                 category: "weights", icon: "💪",  met: 6.0,  intensity: "vigorous" },
  { id: "crossfit",          name: "CrossFit / HIIT weights",      category: "weights", icon: "⚡",  met: 8.0,  intensity: "very high" },
  { id: "bodyweight",        name: "Calisthenics / bodyweight",    category: "weights", icon: "🤸",  met: 3.8,  intensity: "moderate" },
  // Running
  { id: "jogging",           name: "Jogging (easy, ~6–7 km/h)",    category: "cardio", icon: "🏃",  met: 7.0,  intensity: "moderate" },
  { id: "running_slow",      name: "Running (~8 km/h)",            category: "cardio", icon: "🏃",  met: 8.0,  intensity: "moderate", notes: "~8 km/h / 5 mph" },
  { id: "running_moderate",  name: "Running (~10 km/h)",           category: "cardio", icon: "🏃",  met: 10.0, intensity: "vigorous", notes: "~10 km/h / 6 mph" },
  { id: "running_fast",      name: "Running fast (~12 km/h)",      category: "cardio", icon: "🏃",  met: 11.5, intensity: "high",     notes: "~12 km/h / 7.5 mph" },
  { id: "treadmill",         name: "Treadmill (incline walk)",      category: "cardio", icon: "🏃",  met: 5.0,  intensity: "moderate" },
  // Walking / steps
  { id: "walking_slow",      name: "Walking slow (~3 km/h)",       category: "cardio", icon: "🚶",  met: 2.8,  intensity: "light" },
  { id: "walking_moderate",  name: "Walking brisk (~5 km/h)",      category: "cardio", icon: "🚶",  met: 3.5,  intensity: "moderate" },
  { id: "walking_fast",      name: "Walking fast (~6.5 km/h)",     category: "cardio", icon: "🚶",  met: 4.3,  intensity: "moderate" },
  { id: "walking_steps",     name: "Daily steps / commuting",      category: "daily",  icon: "👟",  met: 3.0,  intensity: "light",    notes: "everyday step count" },
  { id: "hiking",            name: "Hiking (trail)",               category: "cardio", icon: "🥾",  met: 6.0,  intensity: "moderate" },
  { id: "stair_climbing",    name: "Stair climbing",               category: "cardio", icon: "🪜",  met: 8.0,  intensity: "vigorous" },
  // Cycling
  { id: "cycling_leisure",   name: "Cycling leisure (<16 km/h)",   category: "cardio", icon: "🚴",  met: 4.0,  intensity: "light" },
  { id: "cycling_moderate",  name: "Cycling moderate (19–22 km/h)",category: "cardio", icon: "🚴",  met: 8.0,  intensity: "moderate" },
  { id: "cycling_vigorous",  name: "Cycling fast (>24 km/h)",      category: "cardio", icon: "🚴",  met: 10.0, intensity: "vigorous" },
  { id: "stationary_bike",   name: "Stationary bike (moderate)",   category: "cardio", icon: "🚴",  met: 6.8,  intensity: "moderate" },
  { id: "spinning",          name: "Indoor cycling / spinning",    category: "cardio", icon: "🚴",  met: 8.5,  intensity: "vigorous" },
  // Swimming
  { id: "swimming_leisure",  name: "Swimming leisurely",           category: "cardio", icon: "🏊",  met: 6.0,  intensity: "moderate" },
  { id: "swimming_laps",     name: "Swimming laps (moderate)",     category: "cardio", icon: "🏊",  met: 7.0,  intensity: "moderate" },
  { id: "swimming_vigorous", name: "Swimming vigorous",            category: "cardio", icon: "🏊",  met: 9.8,  intensity: "vigorous" },
  // Other cardio
  { id: "rowing_moderate",   name: "Rowing ergometer (moderate)",  category: "cardio", icon: "🚣",  met: 7.0,  intensity: "moderate" },
  { id: "rowing_vigorous",   name: "Rowing ergometer (vigorous)",  category: "cardio", icon: "🚣",  met: 8.5,  intensity: "vigorous" },
  { id: "jump_rope",         name: "Jump rope / skipping",         category: "cardio", icon: "⏭️",  met: 11.8, intensity: "vigorous" },
  { id: "elliptical",        name: "Elliptical trainer",           category: "cardio", icon: "🔄",  met: 5.0,  intensity: "moderate" },
  { id: "hiit",              name: "HIIT (general)",               category: "cardio", icon: "⚡",  met: 9.0,  intensity: "very high" },
  { id: "boxing",            name: "Boxing / kickboxing",          category: "cardio", icon: "🥊",  met: 9.0,  intensity: "vigorous" },
  // Sports
  { id: "basketball",        name: "Basketball",                   category: "sports", icon: "🏀",  met: 6.5,  intensity: "moderate" },
  { id: "soccer",            name: "Football / soccer",            category: "sports", icon: "⚽",  met: 7.0,  intensity: "moderate" },
  { id: "tennis",            name: "Tennis (singles)",             category: "sports", icon: "🎾",  met: 7.3,  intensity: "moderate" },
  { id: "yoga",              name: "Yoga / stretching",            category: "daily",  icon: "🧘",  met: 2.5,  intensity: "light" },
  { id: "pilates",           name: "Pilates",                      category: "daily",  icon: "🧘",  met: 3.0,  intensity: "light" },
  { id: "dancing",           name: "Dancing (aerobic)",            category: "cardio", icon: "💃",  met: 5.5,  intensity: "moderate" },
  { id: "martial_arts",      name: "Martial arts / karate",        category: "sports", icon: "🥋",  met: 10.5, intensity: "vigorous" },
];

const MET_CATEGORY_LABELS: Record<string, string> = {
  weights: "🏋️ Weights & Resistance",
  cardio:  "🏃 Cardio",
  sports:  "⚽ Sports",
  daily:   "👟 Daily Activity",
};

/** kcal = MET × weight_kg × hours */
function estimateKcal(activityId: string, durationMin: number, weightKg = 75): number {
  const act = MET_ACTIVITIES.find((a) => a.id === activityId);
  if (!act || durationMin <= 0) return 0;
  return Math.round(act.met * weightKg * (durationMin / 60));
}

/** Steps → approx kcal (0.04 kcal/step × weight_kg/70) */
function stepsToKcal(steps: number, weightKg = 75): number {
  return Math.round(steps * 0.04 * (weightKg / 70));
}

// MET quick-estimate for training type (mirrors backend workoutController.ts)
const QUICK_MET: Record<string, number> = {
  strength: 5.0, hypertrophy: 5.0, cardio: 8.0, endurance: 7.0, mobility: 2.5,
  hiit: 10.0, crossfit: 8.5, yoga: 2.5, flexibility: 2.5,
};
function quickEstimateKcal(trainingType: string, durationMin: number, weightKg: number): number {
  const met = QUICK_MET[trainingType.toLowerCase()] ?? 5.0;
  return Math.max(0, Math.round(met * weightKg * (durationMin / 60)));
}

// ─────────────────────────────────────────────────────────────────────────────
// MET Calorie Calculator sub-component (used inside WorkoutForm)
// ─────────────────────────────────────────────────────────────────────────────
function CalorieCalculator({
  durationMin,
  weightKg,
  onApply,
}: {
  durationMin: number;
  weightKg: number;
  onApply: (kcal: number) => void;
}) {
  const { t } = useTranslation();
  const [activityId, setActivityId] = useState("weights_general");
  const [steps, setSteps]           = useState("");
  const [open, setOpen]             = useState(false);

  const activity = MET_ACTIVITIES.find((a) => a.id === activityId)!;
  const isStepActivity = ["walking_steps", "walking_slow", "walking_moderate", "walking_fast"].includes(activityId);
  const estimated = isStepActivity && steps
    ? stepsToKcal(Number(steps), weightKg)
    : estimateKcal(activityId, durationMin, weightKg);

  // Group activities by category for the select
  const grouped = useMemo(() => {
    const map: Record<string, METActivity[]> = {};
    for (const a of MET_ACTIVITIES) {
      if (!map[a.category]) map[a.category] = [];
      map[a.category].push(a);
    }
    return map;
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1.5 py-1"
      >
        <span>🔥</span>
        <span>{t("workouts.calcCalories")}</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50 dark:bg-gray-700/60 dark:border-gray-600 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 uppercase tracking-wide">🔥 Calorie Calculator</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 dark:text-gray-300">✕ close</button>
      </div>

      {/* Activity selector */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("workouts.activityType")}</label>
        <select
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          {Object.entries(grouped).map(([cat, acts]) => (
            <optgroup key={cat} label={MET_CATEGORY_LABELS[cat] ?? cat}>
              {acts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name} ({a.intensity})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {activity.notes && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{activity.notes}</p>
        )}
      </div>

      {/* Steps input for walking activities */}
      {isStepActivity && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("workouts.stepsOptional")}</label>
          <input
            type="number"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder={t("workouts.stepsPlaceholder")}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">~0.04 kcal/step, adjusted for your weight</p>
        </div>
      )}

      {/* Estimate row */}
      <div className="flex items-center justify-between rounded-lg bg-white dark:bg-gray-800 border border-brand-200 dark:border-brand-700 px-3 py-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white dark:text-white">≈ {estimated} kcal</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">
            {isStepActivity && steps
              ? `${Number(steps).toLocaleString()} steps × 0.04 kcal (weight-adjusted)`
              : `MET ${activity.met} × ${weightKg} kg × ${durationMin} min`}
          </p>
        </div>
        <Button size="sm" onClick={() => { onApply(estimated); setOpen(false); }}>
          Apply
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cardio + Weights Suggestion Panel (goal-aware)
// ─────────────────────────────────────────────────────────────────────────────
interface CardioCombo {
  title: string; cardioId: string; cardioMin: number; weightsMin: number; rationale: string;
}
function getCardioSuggestions(goal?: string | null): CardioCombo[] {
  const g = goal?.toLowerCase() ?? "";
  if (g.includes("lose") || g.includes("fat")) return [
    { title: "Compound lifts + Steady-State Cardio", cardioId: "jogging",       cardioMin: 30, weightsMin: 40,
      rationale: "40 min compound lifts first depletes glycogen — the 30 min jog then burns fat more efficiently. 3–4×/week." },
    { title: "Weights + HIIT Finisher",              cardioId: "hiit",          cardioMin: 15, weightsMin: 45,
      rationale: "45 min weights + 15 min HIIT elevates calorie burn for hours after the session (EPOC effect). 2–3×/week." },
    { title: "Weights + Daily Step Goal",            cardioId: "walking_steps", cardioMin: 45, weightsMin: 45,
      rationale: "Aim for 8,000–10,000 steps/day through commuting or lunch walks. Add 3 lifting sessions/week. No extra cardio needed." },
  ];
  if (g.includes("muscle") || g.includes("recomp") || g.includes("strength") || g.includes("bulk")) return [
    { title: "Heavy Lifting + Minimal Cardio",       cardioId: "cycling_leisure", cardioMin: 20, weightsMin: 60,
      rationale: "Keep cardio ≤20 min at low intensity — aids recovery without interfering with muscle protein synthesis. Lift heavy 4–5×/week." },
    { title: "Strength + Zone-2 Conditioning",       cardioId: "jogging",         cardioMin: 25, weightsMin: 55,
      rationale: "Zone 2 (conversational pace) on non-lifting days improves heart health and insulin sensitivity without affecting muscle growth." },
    { title: "Lifting + Swimming Recovery",          cardioId: "swimming_leisure", cardioMin: 30, weightsMin: 60,
      rationale: "Swimming on rest days reduces soreness and keeps conditioning up with zero joint load." },
  ];
  if (g.includes("endurance") || g.includes("performance") || g.includes("run")) return [
    { title: "Long Run + Auxiliary Strength",        cardioId: "running_slow",   cardioMin: 45, weightsMin: 30,
      rationale: "Run 45 min for aerobic base; 30 min strength (lower body + core) to prevent overuse injury. 3 cardio + 2 strength/week." },
    { title: "Interval Run + Mobility Work",         cardioId: "running_moderate",cardioMin: 30, weightsMin: 20,
      rationale: "Interval sessions build speed; follow with 20 min mobility + light strength to recover properly." },
  ];
  // General / maintain
  return [
    { title: "Balanced 3+2 Split",                  cardioId: "jogging",         cardioMin: 30, weightsMin: 45,
      rationale: "3 lifting sessions + 2 cardio sessions per week. Keeps you fit, strong, and metabolically healthy." },
    { title: "Active Daily Lifestyle",               cardioId: "walking_steps",   cardioMin: 60, weightsMin: 45,
      rationale: "Walking to work/school counts! 8,000 steps/day + 2–3 lifting sessions is enough for most health goals." },
  ];
}

function CardioSuggestionsPanel({ goal }: { goal?: string | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const suggestions = getCardioSuggestions(goal);

  const getActivity = (id: string) => MET_ACTIVITIES.find((a) => a.id === id);

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">{t("workouts.weightsCardio")}</p>
            <p className="text-xs text-blue-500">{t("workouts.personalised")}</p>
          </div>
        </div>
        <span className="text-blue-400 text-lg">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-blue-100">
          {suggestions.map((s, i) => {
            const cardioAct = getActivity(s.cardioId);
            return (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-900/40 p-3 space-y-2">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100">{s.title}</p>
                <div className="flex gap-3 text-xs">
                  <span className="bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-2 py-1">
                    🏋️ {s.weightsMin} min weights
                  </span>
                  <span className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-2 py-1">
                    {cardioAct?.icon ?? "🏃"} {s.cardioMin} min {cardioAct?.name ?? s.cardioId}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 leading-relaxed">{s.rationale}</p>
              </div>
            );
          })}
          <p className="text-xs text-blue-400 text-center pt-1">
            Tip: Log cardio sessions as separate workouts to track calories burned accurately.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast notification
// ─────────────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (message: string) => {
    setMsg(message);
    setTimeout(() => setMsg(null), 3000);
  };
  return { msg, show };
}

function ToastBanner({ msg }: { msg: string | null }) {
  const { t } = useTranslation();
  if (!msg) return null;
  return (
    <div className="fixed bottom-20 right-4 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 md:bottom-6 md:right-6">
      <span className="text-green-400">✓</span>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────
interface ExRow {
  key: string; exerciseName: string; sets: string;
  reps: string; weight: string; rpe: string; notes: string; muscle: string;
}
interface WorkoutExerciseInput {
  exerciseName: string; sets: number; reps: number; order: number;
  weight?: number; rpe?: number; notes?: string;
}
interface WorkoutCreateInput {
  name: string; date: string; duration: number;
  caloriesBurned?: number; notes?: string; trainingType?: string; exercises: WorkoutExerciseInput[];
}

function newRow(): ExRow {
  return { key: Math.random().toString(36).slice(2), exerciseName: "", sets: "3", reps: "10", weight: "", rpe: "", notes: "", muscle: "" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Injury → exercises to avoid (partial name matches)
// ─────────────────────────────────────────────────────────────────────────────
const INJURY_RESTRICTIONS: Record<string, string[]> = {
  lower_back:      ["Deadlift","Romanian Deadlift","Barbell Row","T-Bar Row","Hyperextension","Barbell Squat","Good Morning","Leg Press"],
  upper_back:      ["Overhead Press","Arnold Press","Behind-Neck Press","Upright Row","Shrug","Pull-Up","Chin-Up","Lat Pulldown"],
  knee_left:       ["Barbell Squat","Hack Squat","Bulgarian Split Squat","Leg Extension","Walking Lunge","Jump Squat","Box Jump","Leg Press","Sissy Squat"],
  knee_right:      ["Barbell Squat","Hack Squat","Bulgarian Split Squat","Leg Extension","Walking Lunge","Jump Squat","Box Jump","Leg Press","Sissy Squat"],
  shoulder_left:   ["Overhead Press","Dumbbell Shoulder Press","Arnold Press","Lateral Raise","Front Raise","Bench Press","Incline Bench Press","Dips","Upright Row","Behind-Neck Press"],
  shoulder_right:  ["Overhead Press","Dumbbell Shoulder Press","Arnold Press","Lateral Raise","Front Raise","Bench Press","Incline Bench Press","Dips","Upright Row","Behind-Neck Press"],
  hip:             ["Barbell Squat","Hip Thrust","Bulgarian Split Squat","Walking Lunge","Deadlift","Romanian Deadlift","Leg Press","Cable Kickback","Step-Up"],
  elbow_left:      ["Dips","Close-Grip Bench Press","Skull Crusher","Barbell Curl","Preacher Curl","Cable Pushdown","Overhead Tricep Extension"],
  elbow_right:     ["Dips","Close-Grip Bench Press","Skull Crusher","Barbell Curl","Preacher Curl","Cable Pushdown","Overhead Tricep Extension"],
  wrist_left:      ["Barbell Curl","Wrist Curl","Overhead Press","Barbell Row","Bench Press","Push-Up","Front Raise"],
  wrist_right:     ["Barbell Curl","Wrist Curl","Overhead Press","Barbell Row","Bench Press","Push-Up","Front Raise"],
  ankle_left:      ["Jump Squat","Box Jump","Calf Raise","Walking Lunge","Bulgarian Split Squat"],
  ankle_right:     ["Jump Squat","Box Jump","Calf Raise","Walking Lunge","Bulgarian Split Squat"],
  rotator_cuff:    ["Overhead Press","Arnold Press","Lateral Raise","Upright Row","Behind-Neck Press","Dips","Bench Press","Push-Up"],
  hamstring:       ["Romanian Deadlift","Leg Curl","Stiff-Leg Deadlift","Nordic Curl","Deadlift"],
  it_band:         ["Running","Jump Squat","Walking Lunge","Box Jump","Barbell Squat"],
  plantar_fascia:  ["Jump Squat","Box Jump","Walking Lunge","Running","Jump Rope","Calf Raise"],
};

/** Return true if exerciseName should be avoided given the user's injuries */
function isContraindicated(exerciseName: string, injuries: string[]): boolean {
  const lower = exerciseName.toLowerCase();
  return injuries.some((inj) =>
    (INJURY_RESTRICTIONS[inj] ?? []).some((ex) => lower.includes(ex.toLowerCase()))
  );
}

/** Get label for an injury id */
const INJURY_LABELS: Record<string, string> = {
  lower_back: "Lower Back", upper_back: "Upper Back/Neck",
  knee_left: "Knee (L)", knee_right: "Knee (R)",
  shoulder_left: "Shoulder (L)", shoulder_right: "Shoulder (R)",
  hip: "Hip", elbow_left: "Elbow (L)", elbow_right: "Elbow (R)",
  wrist_left: "Wrist (L)", wrist_right: "Wrist (R)",
  ankle_left: "Ankle (L)", ankle_right: "Ankle (R)",
  rotator_cuff: "Rotator Cuff", hamstring: "Hamstring",
  it_band: "IT Band", plantar_fascia: "Plantar Fascia",
};

// ─────────────────────────────────────────────────────────────────────────────
// Exercise suggestion panel — shows alternatives for a muscle group,
// filtered against user injuries, prioritising similar exercises first
// ─────────────────────────────────────────────────────────────────────────────
function ExerciseSuggestPanel({
  currentExercise, muscle, injuries, onSelect, onClose,
}: {
  currentExercise?: string;
  muscle?: string;
  injuries: string[];
  onSelect: (name: string, item: any) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [searchQ, setSearchQ] = useState(currentExercise ?? "");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMuscle, setFilterMuscle] = useState(muscle ?? "");

  const MUSCLE_GROUPS = ["Push","Pull","Upper Body","Lower Body","Chest","Back","Shoulders","Biceps","Triceps","Brachialis","Forearms","Traps","Quads","Hamstrings","Glutes","Calves","Core","Full Body"];

  const search = useCallback(async (q: string, m: string) => {
    setLoading(true);
    try {
      const res = await searchApi.exercises(q, m ? { muscle: m } : {}, 20);
      let hits = res.data.results;
      // Sort: exercises similar to currentExercise first (shared muscle), then alpha
      if (currentExercise) {
        const cur = currentExercise.toLowerCase();
        hits = [...hits].sort((a, b) => {
          const aScore = a.name.toLowerCase().includes(cur.split(" ")[0]) ? -1 : 0;
          const bScore = b.name.toLowerCase().includes(cur.split(" ")[0]) ? -1 : 0;
          return aScore - bScore;
        });
      }
      setResults(hits);
    } finally { setLoading(false); }
  }, [currentExercise]);

  useEffect(() => { search(searchQ, filterMuscle); }, [filterMuscle]);

  const handleSearch = (q: string) => {
    setSearchQ(q);
    const t = setTimeout(() => search(q, filterMuscle), 250);
    return () => clearTimeout(t);
  };

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 dark:bg-gray-700/60 dark:border-gray-600 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-brand-700">💡 Exercise Suggestions</p>
        <button type="button" onClick={onClose} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 dark:text-gray-300">✕ close</button>
      </div>

      {injuries.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            ⚠️ Avoiding: {injuries.map((i) => INJURY_LABELS[i] ?? i).join(", ")}
          </span>
        </div>
      )}

      {/* Muscle filter chips */}
      <div className="flex flex-wrap gap-1">
        {["", ...MUSCLE_GROUPS].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setFilterMuscle(m)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
              filterMuscle === m
                ? "border-brand-400 bg-brand-500 text-white"
                : "border-gray-200 bg-white text-gray-600 dark:text-gray-300 hover:border-brand-300"
            }`}
          >
            {m || "All"}
          </button>
        ))}
      </div>

      {/* Search input */}
      <input
        value={searchQ}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={t("workouts.searchByNameMuscle")}
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
      />

      {/* Results */}
      <div className="max-h-56 overflow-y-auto space-y-1">
        {loading && <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">{t("workouts.searching")}</p>}
        {!loading && results.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">{t("workouts.noResultsTry")}</p>
        )}
        {results.map((ex) => {
          const banned = isContraindicated(ex.name, injuries);
          return (
            <div
              key={ex.id}
              className={`flex items-start justify-between rounded-lg px-3 py-2 text-sm ${
                banned ? "opacity-40 bg-red-50 border border-red-100" : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-brand-300 cursor-pointer"
              }`}
              onClick={() => !banned && onSelect(ex.name, ex)}
            >
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${banned ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-100"}`}>
                  {ex.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">{ex.primaryMuscle} · {ex.equipment} · {ex.difficulty}</p>
              </div>
              {banned ? (
                <span className="text-xs text-red-400 ml-2 shrink-0">⚠️ injury</span>
              ) : (
                <span className="text-xs text-brand-500 ml-2 shrink-0">{t("workouts.selectBtn")}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise search combobox (supports optional muscle-group filter)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Create Custom Exercise Modal
// ─────────────────────────────────────────────────────────────────────────────
const MUSCLE_OPTIONS = [
  "Chest","Back","Shoulders","Biceps","Triceps","Forearms",
  "Quads","Hamstrings","Glutes","Calves","Core","Traps",
  "Full Body","Cardio","Stretching","Adductors","Abductors",
];
const EQUIPMENT_OPTIONS = [
  "Bodyweight","Barbell","Dumbbell","Cable","Machine","Kettlebell","Plate","Ab Wheel","Other",
];

function CreateCustomExerciseModal({
  initialName = "",
  onCreated,
  onClose,
}: {
  initialName?: string;
  onCreated: (ex: any) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name,          setName]          = useState(initialName);
  const [muscle,        setMuscle]        = useState("Chest");
  const [equipment,     setEquipment]     = useState("Bodyweight");
  const [difficulty,    setDifficulty]    = useState<"beginner"|"intermediate"|"advanced">("beginner");
  const [instructions,  setInstructions]  = useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const save = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    try {
      const res = await customExercisesApi.create({
        name: name.trim(), primaryMuscle: muscle, secondaryMuscles: [],
        equipment, difficulty, instructions: instructions.trim(),
      });
      onCreated(res.data.exercise);
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to create exercise");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{error}</p>}

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Exercise Name *</label>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Banded Pull-Apart"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Primary Muscle *</label>
          <select value={muscle} onChange={(e) => setMuscle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {MUSCLE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t("settings.equipment")}</label>
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {EQUIPMENT_OPTIONS.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t("workouts.difficultyLabel")}</label>
        <div className="flex gap-2">
          {(["beginner","intermediate","advanced"] as const).map((d) => (
            <button key={d} onClick={() => setDifficulty(d)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                difficulty === d ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-brand-400"
              }`}
            >{d}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Instructions (optional)</label>
        <textarea
          value={instructions} onChange={(e) => setInstructions(e.target.value)}
          rows={3} placeholder={t("workouts.describeExercise")}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">{t("common.cancel")}</button>
        <Button className="flex-1" loading={saving} onClick={save}>{t("workouts.createExercise")}</Button>
      </div>
    </div>
  );
}

function ExerciseSearch({
  value, onChange, muscle, placeholder = "Search exercise…",
}: {
  value: string; onChange: (v: string, item?: any) => void;
  muscle?: string; placeholder?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const calcPos = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  };

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const t = setTimeout(() => {
      searchApi.exercises(query, muscle ? { muscle } : {}, 10)
        .then((r) => {
          if (r.data.results.length > 0 || query.trim()) {
            setResults(r.data.results);
            calcPos();
            setOpen(true);
          }
        })
        .catch((_err) => { console.error("Exercise search failed:", _err); });
    }, 200);
    return () => clearTimeout(t);
  }, [query, muscle]);

  // Recalculate portal position on scroll/resize so it tracks the input
  useEffect(() => {
    if (!open) return;
    const update = () => calcPos();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
        onFocus={() => { if (query && results.length > 0) { calcPos(); setOpen(true); } }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {open && createPortal(
        <div
          style={{ position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 99999 }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-52 overflow-y-auto"
        >
          {results.length > 0 ? (
            results.map((ex) => (
              <div
                key={ex.id ?? ex.name}
                onMouseDown={() => { setQuery(ex.name); onChange(ex.name, ex); setOpen(false); }}
                className="px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer"
              >
                <span className="font-medium">{ex.name}</span>
                {(ex.primaryMuscle || ex.equipment) && (
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{ex.primaryMuscle}{ex.primaryMuscle && ex.equipment ? " · " : ""}{ex.equipment}</span>
                )}
              </div>
            ))
          ) : (
            <div className="px-3 py-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t("workouts.noExercisesFound")}</p>
              <button
                onMouseDown={() => { setOpen(false); onChange("__create_custom__:" + query); }}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                + Create &quot;{query}&quot; as custom exercise
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise rows (reused in create & edit forms)
// ─────────────────────────────────────────────────────────────────────────────
const BUILDER_MUSCLE_GROUPS = [
  // Compound groupings (shown first for quick filtering)
  "Any", "Push", "Pull", "Upper Body", "Lower Body",
  // Specific muscles
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Brachialis",
  "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Traps",
];

const TRAINING_TYPES: { value: string; label: string; icon: string; color: string }[] = [
  { value: "strength",    label: _t("workouts.strength"),    icon: "🏋️", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "hypertrophy", label: _t("workouts.hypertrophy"), icon: "📈", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "endurance",   label: _t("workouts.endurance"),   icon: "🏃", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "cardio",      label: _t("workouts.cardio"),      icon: "❤️", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "mobility",    label: _t("workouts.mobility"),    icon: "🧘", color: "bg-amber-100 text-amber-700 border-amber-200" },
];

function ExerciseRows({ rows, setRows, injuries = [], defaultMuscle = "" }: {
  rows: ExRow[];
  setRows: Dispatch<SetStateAction<ExRow[]>>;
  injuries?: string[];
  defaultMuscle?: string;
}) {
  const { t } = useTranslation();
  const [suggestKey,       setSuggestKey]       = useState<string | null>(null);
  const [customCreateKey,  setCustomCreateKey]  = useState<string | null>(null);
  const [customInitName,   setCustomInitName]   = useState("");

  const updateRow = (key: string, field: keyof ExRow, val: string) =>
    setRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: val } : r));
  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const handleExerciseChange = (rowKey: string, val: string) => {
    if (val.startsWith("__create_custom__:")) {
      setCustomInitName(val.replace("__create_custom__:", ""));
      setCustomCreateKey(rowKey);
    } else {
      updateRow(rowKey, "exerciseName", val);
    }
  };

  // Per-row muscle overrides the global filter chip
  const globalMuscle = defaultMuscle && defaultMuscle !== "Any" ? defaultMuscle : undefined;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 dark:text-gray-200">{t("workouts.exercises")}</p>
        <Button size="sm" variant="secondary" onClick={() => setRows((p) => [...p, newRow()])}>+ Add</Button>
      </div>
      <div className="space-y-3 pr-1">
        {rows.map((r) => {
          const banned = r.exerciseName ? isContraindicated(r.exerciseName, injuries) : false;
          return (
            <div key={r.key} className="space-y-1">
              <div className="grid grid-cols-12 gap-1.5 items-start">
                <div className="col-span-4">
                  <select
                    value={r.muscle}
                    onChange={(e) => updateRow(r.key, "muscle", e.target.value)}
                    className="w-full mb-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                  >
                    <option value="">{t("workouts.anyMuscle")}</option>
                    {BUILDER_MUSCLE_GROUPS.filter(m => m !== "Any").map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ExerciseSearch
                    value={r.exerciseName}
                    muscle={r.muscle || globalMuscle}
                    onChange={(v) => handleExerciseChange(r.key, v)}
                  />
                  {banned && (
                    <p className="text-[10px] text-red-500 mt-0.5">⚠️ May stress injured area</p>
                  )}
                </div>
                <div className="col-span-2"><input value={r.sets} onChange={(e) => updateRow(r.key, "sets", e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-2 text-sm text-center" placeholder="Sets" /></div>
                <div className="col-span-2"><input value={r.reps} onChange={(e) => updateRow(r.key, "reps", e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-2 text-sm text-center" placeholder="Reps" /></div>
                <div className="col-span-2"><input value={r.weight} onChange={(e) => updateRow(r.key, "weight", e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-2 text-sm text-center" placeholder="kg" /></div>
                <div className="col-span-1"><input value={r.rpe} onChange={(e) => updateRow(r.key, "rpe", e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-2 text-sm text-center" placeholder="RPE" /></div>
                <div className="col-span-1 flex flex-col items-center gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setSuggestKey(suggestKey === r.key ? null : r.key)}
                    className={`text-xs px-1 py-0.5 rounded transition-colors ${suggestKey === r.key ? "text-brand-600" : "text-gray-300 hover:text-brand-400"}`}
                    title={t("workouts.suggestExercises")}
                  >💡</button>
                  <button type="button" onClick={() => removeRow(r.key)} className="text-gray-300 hover:text-red-400 transition-colors text-xs">✕</button>
                </div>
              </div>
              {/* Suggestion panel for this row */}
              {suggestKey === r.key && (
                <ExerciseSuggestPanel
                  currentExercise={r.exerciseName || undefined}
                  injuries={injuries}
                  onSelect={(name, _item) => {
                    updateRow(r.key, "exerciseName", name);
                    setSuggestKey(null);
                  }}
                  onClose={() => setSuggestKey(null)}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-12 gap-1.5 mt-1">
        <p className="col-span-4 text-xs text-gray-400 dark:text-gray-500 pl-2">Exercise (💡 = suggest)</p>
        <p className="col-span-2 text-xs text-gray-400 dark:text-gray-500 text-center">{t("workouts.sets")}</p>
        <p className="col-span-2 text-xs text-gray-400 dark:text-gray-500 text-center">{t("workouts.reps")}</p>
        <p className="col-span-2 text-xs text-gray-400 dark:text-gray-500 text-center">kg</p>
        <p className="col-span-1 text-xs text-gray-400 dark:text-gray-500 text-center">{t("workouts.rpe")}</p>
      </div>

      {customCreateKey && (
        <Modal open={!!customCreateKey} onClose={() => setCustomCreateKey(null)} title={t("workouts.createCustomExercise")} size="sm">
          <CreateCustomExerciseModal
            initialName={customInitName}
            onCreated={(ex) => { updateRow(customCreateKey, "exerciseName", ex.name); setCustomCreateKey(null); }}
            onClose={() => setCustomCreateKey(null)}
          />
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create workout form
// ─────────────────────────────────────────────────────────────────────────────
function WorkoutForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState("60");
  const [calories, setCalories] = useState("");
  const [caloriesIsAuto, setCaloriesIsAuto] = useState(true);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ExRow[]>([newRow()]);
  const [loading, setLoading] = useState(false);
  const [newPRs, setNewPRs] = useState<PRResult[]>([]);
  const [error, setError] = useState("");
  const [builderMuscle, setBuilderMuscle] = useState("Any");
  const [trainingType, setTrainingType] = useState<string>("");
  const weightKg  = user?.weight ?? 75;
  const injuries  = user?.injuries ?? [];

  // Auto-estimate calories when duration or training type changes
  useEffect(() => {
    if (!caloriesIsAuto) return;
    const dur = Number(duration);
    if (dur <= 0) return;
    const estimate = trainingType
      ? quickEstimateKcal(trainingType, dur, weightKg)
      : Math.round(5.0 * weightKg * (dur / 60));
    setCalories(String(estimate));
  }, [duration, trainingType, weightKg, caloriesIsAuto]);

  const submit = async () => {
    if (!name.trim()) { setError("Workout name is required"); return; }
    if (Number(duration) < 1) { setError("Duration must be at least 1 minute"); return; }
    setLoading(true); setError("");
    try {
      const payload: WorkoutCreateInput = {
        name: name.trim(), date,
        duration: Number(duration),
        ...(calories && { caloriesBurned: Number(calories) }),
        ...(notes && { notes }),
        ...(trainingType && { trainingType }),
        exercises: rows.filter((r) => r.exerciseName.trim()).map((r, i) => ({
          exerciseName: r.exerciseName.trim(),
          sets: Number(r.sets) || 3, reps: Number(r.reps) || 10, order: i,
          ...(r.weight && { weight: Number(r.weight) }),
          ...(r.rpe && { rpe: Number(r.rpe) }),
          ...(r.notes && { notes: r.notes }),
        })),
      };
      const res = await workoutsApi.create(payload);
      if (res.data.newPRs?.length) setNewPRs(res.data.newPRs);
      else onSave();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to save workout");
    } finally { setLoading(false); }
  };

  if (newPRs.length) return (
    <div className="text-center space-y-4">
      <div className="text-5xl">🏆</div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white dark:text-white">New Personal Records!</h3>
      <div className="space-y-2">
        {newPRs.map((pr) => (
          <div key={pr.exerciseName} className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl px-4 py-3">
            <div className="text-left">
              <p className="font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100">{pr.exerciseName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">Previous best: {pr.previousBest > 0 ? `${pr.previousBest} kg` : "First time"}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-yellow-600">{pr.weight} kg</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">× {pr.reps} reps</p>
            </div>
          </div>
        ))}
      </div>
      <Button className="w-full" onClick={onSave}>{t("workouts.doneBtn")}</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Input label={t("workouts.workoutName")} value={name} onChange={(e) => setName(e.target.value)} placeholder="Push Day" className="col-span-2" />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Duration (min)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              🔥 Calories Burned
            </label>
            {caloriesIsAuto && trainingType && (
              <span className="text-xs text-orange-500 font-medium">auto-estimated</span>
            )}
            {!caloriesIsAuto && (
              <button
                type="button"
                className="text-xs text-brand-600 hover:text-brand-700"
                onClick={() => { setCaloriesIsAuto(true); }}
              >
                ↩ reset estimate
              </button>
            )}
          </div>
          <input
            type="number"
            value={calories}
            onChange={(e) => { setCalories(e.target.value); setCaloriesIsAuto(false); }}
            placeholder={trainingType ? "auto-estimated from training type" : "optional — or use calculator ↓"}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <Textarea label={t("workouts.notesLabel")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="How did it go?" className="col-span-2" />
        <div className="col-span-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1.5">{t("workouts.trainingTypeOptional")}</p>
          <div className="flex flex-wrap gap-1.5">
            {TRAINING_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTrainingType(trainingType === t.value ? "" : t.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  trainingType === t.value
                    ? t.color + " ring-2 ring-offset-1 ring-current"
                    : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MET calorie calculator */}
      <CalorieCalculator
        durationMin={Number(duration) || 60}
        weightKg={weightKg}
        onApply={(kcal) => setCalories(String(kcal))}
      />

      {/* Muscle-group filter chips — filters ExerciseSearch results in all rows */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1.5">{t("workouts.filterByMuscle")}</p>
        <div className="flex flex-wrap gap-1.5">
          {BUILDER_MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              type="button"
              onClick={() => setBuilderMuscle(mg)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                builderMuscle === mg
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 border border-gray-200 text-gray-600 dark:text-gray-300 hover:border-brand-400"
              }`}
            >
              {mg}
            </button>
          ))}
        </div>
      </div>

      <ExerciseRows rows={rows} setRows={setRows} injuries={injuries} defaultMuscle={builderMuscle} />
      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" onClick={onClose}>{t("common.cancel")}</Button>
        <Button className="flex-1" loading={loading} onClick={submit}>{t("workouts.saveWorkout")}</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit workout form (header fields only)
// ─────────────────────────────────────────────────────────────────────────────
function EditWorkoutForm({ workout, onSave, onClose }: { workout: Workout; onSave: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(workout.name);
  const [date, setDate] = useState(workout.date.split("T")[0]);
  const [duration, setDuration] = useState(String(workout.duration));
  const [calories, setCalories] = useState(workout.caloriesBurned ? String(Math.round(workout.caloriesBurned)) : "");
  const [notes, setNotes] = useState(workout.notes ?? "");
  const [trainingType, setTrainingType] = useState(workout.trainingType ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Workout name is required"); return; }
    setLoading(true); setError("");
    try {
      await workoutsApi.update(workout.id, {
        name: name.trim(), date, duration: Number(duration),
        caloriesBurned: calories ? Number(calories) : undefined,
        notes: notes || undefined,
        trainingType: trainingType || undefined,
      });
      onSave();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to update workout");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Input label={t("workouts.workoutName")} value={name} onChange={(e) => setName(e.target.value)} className="col-span-2" />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Duration (min)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <Input label="Calories Burned" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="optional" className="col-span-2" />
        <Textarea label={t("workouts.notesLabel")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="col-span-2" />
        <div className="col-span-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1.5">{t("workouts.trainingType")}</p>
          <div className="flex flex-wrap gap-1.5">
            {TRAINING_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTrainingType(trainingType === t.value ? "" : t.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  trainingType === t.value
                    ? t.color + " ring-2 ring-offset-1 ring-current"
                    : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" onClick={onClose}>{t("common.cancel")}</Button>
        <Button className="flex-1" loading={loading} onClick={submit}>{t("workouts.saveChanges")}</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add exercise panel — expanded muscle groups + full exercise list
// ─────────────────────────────────────────────────────────────────────────────
const MUSCLE_GROUPS = [
  // Compound
  "Any", "Push", "Pull", "Upper Body", "Lower Body",
  // Specific
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Brachialis",
  "Forearms", "Traps", "Quads", "Hamstrings", "Glutes", "Calves", "Core",
];

interface ExerciseItem { name: string; muscleGroup?: string; equipment?: string }

function AddExercisePanel({
  workoutId, onAdded, onCancel,
}: {
  workoutId: number; onAdded: (ex: WorkoutExercise) => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [muscle, setMuscle] = useState("Any");
  const [exerciseList, setExerciseList] = useState<ExerciseItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [filter, setFilter] = useState("");

  // Queued exercise to add
  const [selected, setSelected] = useState<string | null>(null);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");
  const [rpe, setRpe] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load exercises when muscle group changes
  useEffect(() => {
    setListLoading(true);
    setFilter(""); setSelected(null);
    searchApi.exercises("", { muscle: muscle === "Any" ? undefined : muscle }, 80)
      .then((res) => setExerciseList(res.data.results ?? []))
      .catch(() => setExerciseList([]))
      .finally(() => setListLoading(false));
  }, [muscle]);

  const displayed = filter.trim()
    ? exerciseList.filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()))
    : exerciseList;

  const submit = async () => {
    if (!selected) { setError("Select an exercise first"); return; }
    if (!sets || !reps) { setError("Sets and reps are required"); return; }
    setSaving(true); setError("");
    try {
      const res = await workoutsApi.addExercise(workoutId, {
        exerciseName: selected,
        sets: Number(sets),
        reps: Number(reps),
        ...(weight && { weight: Number(weight) }),
        ...(rpe    && { rpe:    Number(rpe) }),
      });
      onAdded(res.data.exercise);
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to add exercise");
    } finally { setSaving(false); }
  };

  return (
    <div className="mt-4 border border-brand-200 bg-brand-50 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-brand-800">{t("workouts.addExercise")}</p>

      {/* Muscle group chips */}
      <div className="flex flex-wrap gap-1.5">
        {MUSCLE_GROUPS.map((mg) => (
          <button
            key={mg}
            onClick={() => setMuscle(mg)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              muscle === mg
                ? "bg-brand-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 dark:text-gray-300 hover:border-brand-400"
            }`}
          >
            {mg}
          </button>
        ))}
      </div>

      {/* Exercise list with filter */}
      <div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Filter ${muscle !== "Any" ? muscle : ""} exercises…`}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white mb-2"
        />
        <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-50 dark:divide-gray-700">
          {listLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">{t("workouts.noExercisesFound")}</p>
          ) : displayed.map((ex) => (
            <button
              key={ex.name}
              onClick={() => setSelected(ex.name === selected ? null : ex.name)}
              className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                selected === ex.name
                  ? "bg-brand-50 text-brand-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700"
              }`}
            >
              <span className="text-sm font-medium">{ex.name}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">{ex.equipment || ex.muscleGroup || ""}</span>
            </button>
          ))}
        </div>
        {selected && (
          <p className="text-xs text-brand-700 mt-1.5 font-medium">Selected: {selected}</p>
        )}
      </div>

      {/* Sets / Reps / Weight / RPE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Sets", value: sets, onChange: setSets },
          { label: "Reps", value: reps, onChange: setReps },
          { label: "kg",   value: weight, onChange: setWeight, placeholder: "opt." },
          { label: "RPE",  value: rpe,    onChange: setRpe,    placeholder: "opt." },
        ].map(({ label, value, onChange, placeholder }) => (
          <div key={label}>
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">{label}</p>
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder ?? ""}
              type="number"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button size="sm" className="flex-1" loading={saving} onClick={submit}>{t("workouts.addToWorkout")}</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workout detail modal — view, edit exercises inline, add exercises
// ─────────────────────────────────────────────────────────────────────────────
function WorkoutDetail({
  workout, onClose, onEdit, onDelete, onRefresh, onToast,
}: {
  workout: Workout; onClose: () => void; onEdit: () => void;
  onDelete: () => void; onRefresh: () => void; onToast?: (msg: string) => void;
}) {
  const { t } = useTranslation();
  type ExerciseEditData = Pick<WorkoutExercise, "sets" | "reps"> & { exerciseName?: string; weight: number | null; rpe: number | null };

  const [exercises, setExercises] = useState<WorkoutExercise[]>(workout.exercises);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<ExerciseEditData | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editingKcal, setEditingKcal] = useState(false);
  const [kcalDraft, setKcalDraft] = useState(workout.caloriesBurned ? String(Math.round(workout.caloriesBurned)) : "");
  const [kcalValue, setKcalValue] = useState(workout.caloriesBurned ?? null);
  const [savingKcal, setSavingKcal] = useState(false);

  const saveKcal = async () => {
    setSavingKcal(true);
    try {
      await workoutsApi.update(workout.id, { caloriesBurned: kcalDraft ? Number(kcalDraft) : undefined });
      setKcalValue(kcalDraft ? Number(kcalDraft) : null);
      setEditingKcal(false);
    } finally { setSavingKcal(false); }
  };

  // ── Rest timer ───────────────────────────────────────────────────────────────
  const REST_DEFAULT = 90; // seconds
  const [timerExId,   setTimerExId]   = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (timerExId === null) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { setTimerExId(null); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerExId]);

  const startRestTimer = (exId: number) => {
    setTimerExId(exId);
    setSecondsLeft(REST_DEFAULT);
  };

  const updateEditData = (patch: Partial<ExerciseEditData>) =>
    setEditData((current) => current ? { ...current, ...patch } : current);

  const saveEdit = async (id: number) => {
    if (!editData) return;
    setSaving(true);
    try {
      await workoutsApi.updateExercise(id, { ...(editData.exerciseName && { exerciseName: editData.exerciseName }), sets: editData.sets, reps: editData.reps, weight: editData.weight ?? undefined, rpe: editData.rpe ?? undefined });
      setExercises((prev) => prev.map((e) => e.id === id ? { ...e, ...editData } : e));
      setEditing(null); setEditData(null);
      onRefresh();
      onToast?.("Exercise updated ✓");
    } finally { setSaving(false); }
  };

  const deleteExercise = async (id: number) => {
    if (!confirm("Remove this exercise from the workout?")) return;
    await workoutsApi.deleteExercise(id);
    setExercises((prev) => prev.filter((e) => e.id !== id));
    onRefresh();
    onToast?.("Exercise removed");
  };

  const handleDeleteWorkout = async () => {
    if (!confirm(`Delete "${workout.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try { await workoutsApi.delete(workout.id); onDelete(); }
    finally { setDeleting(false); }
  };

  const handleExerciseAdded = (ex: WorkoutExercise) => {
    setExercises((prev) => [...prev, ex]);
    setShowAddPanel(false);
    onRefresh();
    onToast?.("Exercise added ✓");
  };

  return (
    <div className="space-y-4">
      {/* Meta row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span>{format(parseISO(workout.date), "EEEE, MMMM d, yyyy")}</span>
            <span className="mx-2">·</span>
            <span>{workout.duration} min</span>
          </p>
          {/* Calories burned — editable pill */}
          {editingKcal ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🔥</span>
              <input
                type="number"
                value={kcalDraft}
                onChange={(e) => setKcalDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveKcal(); if (e.key === "Escape") setEditingKcal(false); }}
                autoFocus
                placeholder="kcal"
                className="w-24 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 text-orange-800 dark:text-orange-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="button"
                disabled={savingKcal}
                onClick={saveKcal}
                className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium px-2 py-1 rounded-lg disabled:opacity-50"
              >
                {savingKcal ? "…" : t("common.save")}
              </button>
              <button type="button" onClick={() => setEditingKcal(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingKcal(true)}
              className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
            >
              <span className="text-sm">🔥</span>
              <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                {kcalValue ? `${Math.round(kcalValue)} kcal burned` : "Add calories burned"}
              </span>
              <span className="text-xs text-orange-400 dark:text-orange-500 group-hover:text-orange-600 dark:group-hover:text-orange-300 ml-0.5">✏️</span>
            </button>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={onEdit}>✏️ Edit</Button>
          <Button size="sm" variant="danger" loading={deleting} onClick={handleDeleteWorkout}>🗑 Delete</Button>
        </div>
      </div>

      {workout.notes && <p className="text-sm text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2">{workout.notes}</p>}

      {/* Exercise list */}
      <div className="space-y-2">
        {exercises.map((ex) => (
          <div key={ex.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
            {editing === ex.id ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t("workouts.exercise")}</p>
                  <ExerciseSearch
                    value={editData?.exerciseName ?? ex.exerciseName}
                    onChange={(v) => updateEditData({ exerciseName: v } as any)}
                    placeholder={t("workouts.searchExercise")}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Sets",     defaultValue: ex.sets,        field: "sets"   as const },
                    { label: "Reps",     defaultValue: ex.reps,        field: "reps"   as const },
                    { label: "Weight kg",defaultValue: ex.weight ?? "",field: "weight" as const },
                    { label: "RPE",      defaultValue: ex.rpe ?? "",   field: "rpe"    as const },
                  ].map(({ label, defaultValue, field }) => (
                    <div key={field}>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
                      <input
                        defaultValue={String(defaultValue)}
                        onChange={(e) => updateEditData({
                          [field]: e.target.value === ""
                            ? null
                            : Number(e.target.value),
                        } as Partial<ExerciseEditData>)}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm text-center"
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" loading={saving} onClick={() => saveEdit(ex.id)} className="flex-1">Save</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setEditing(null); setEditData(null); }} className="flex-1">{t("common.cancel")}</Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100">{ex.exerciseName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">
                      {ex.sets} sets × {ex.reps} reps{ex.weight ? ` @ ${ex.weight} kg` : ""}
                      {ex.rpe ? ` · RPE ${ex.rpe}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startRestTimer(ex.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                        timerExId === ex.id
                          ? "bg-blue-100 text-blue-700 font-semibold"
                          : "bg-green-50 hover:bg-green-100 text-green-700"
                      }`}
                      title={t("workouts.markSetDone")}
                    >
                      ✓ Set done
                    </button>
                    <button
                      onClick={() => { setEditing(ex.id); setEditData({ exerciseName: ex.exerciseName, sets: ex.sets, reps: ex.reps, weight: ex.weight ?? null, rpe: ex.rpe ?? null }); }}
                      className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 dark:text-gray-300 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteExercise(ex.id)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {timerExId === ex.id && (
                  <div className="mt-2 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                    <span className="text-blue-600 font-mono font-bold text-base tabular-nums">
                      {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                    <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full transition-all duration-1000"
                        style={{ width: `${(secondsLeft / REST_DEFAULT) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-blue-400">rest</span>
                    <button
                      onClick={() => setTimerExId(null)}
                      className="text-xs text-blue-300 hover:text-blue-600 ml-1"
                      title={t("workouts.cancelTimer")}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {exercises.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{t("workouts.noExercisesLogged")}</p>}
      </div>

      {/* Add exercise */}
      {showAddPanel ? (
        <AddExercisePanel
          workoutId={workout.id}
          onAdded={handleExerciseAdded}
          onCancel={() => setShowAddPanel(false)}
        />
      ) : (
        <button
          onClick={() => setShowAddPanel(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-sm text-gray-400 dark:text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
        >
          + Add Exercise
        </button>
      )}

      <Button variant="secondary" className="w-full" onClick={onClose}>{t("workouts.closeBtn")}</Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates tab — Recommended & My Templates (merged from TemplatesPage)
// ─────────────────────────────────────────────────────────────────────────────
const OBJECTIVE_COLORS: Record<string, string> = {
  hypertrophy: "bg-blue-100 text-blue-700",
  strength:    "bg-purple-100 text-purple-700",
  fat_loss:    "bg-orange-100 text-orange-700",
  endurance:   "bg-green-100 text-green-700",
  general:     "bg-gray-100 text-gray-600",
};

const SPLIT_ICONS: Record<string, string> = {
  PPL: "🔄", Upper_Lower: "↕️", Bro_Split: "💪", Full_Body: "🏋️", Custom: "⚙️",
};

const SPLIT_LABELS: Record<string, string> = {
  Full_Body_3d:   "Full Body (3×/week)",
  PPL_6d:         "Push Pull Legs (6×/week)",
  Upper_Lower_4d: "Upper / Lower (4×/week)",
  Bro_Split_5d:   "Bro Split (5×/week)",
  Custom_4d:      "Fat Loss (4×/week)",
};

// ─────────────────────────────────────────────────────────────────────────────
// Smart plan suggestions — injury warnings, missing muscles, gender/goal advice
// ─────────────────────────────────────────────────────────────────────────────

interface Suggestion { type: "warning" | "tip" | "info"; text: string }

// Known high-spinal-load exercises (flag if overrepresented with no core work)
const SPINAL_LOAD_EXERCISES = new Set([
  "Barbell Squat", "Romanian Deadlift", "Deadlift", "Good Morning", "Barbell Row",
  "T-Bar Row", "Barbell Shoulder Press", "Overhead Press",
]);

// Core exercises
const CORE_EXERCISES = new Set([
  "Plank", "Ab Wheel Rollout", "Cable Crunch", "Hanging Leg Raise", "Side Plank",
  "Dead Bug", "Leg Raise", "Russian Twist", "Crunch", "Sit-Up", "Bird Dog",
]);

// Primary muscle group map — categorise each exercise name by muscle
const MUSCLE_MAP: Record<string, string> = {
  // Chest
  "Bench Press": "Chest", "Incline Bench Press": "Chest", "Decline Bench Press": "Chest",
  "Dumbbell Chest Press": "Chest", "Push-Up": "Chest", "Dips": "Chest",
  // Back
  "Barbell Row": "Back", "Dumbbell Row": "Back", "Pull-Up": "Back", "Chin-Up": "Back",
  "Lat Pulldown": "Back", "Seated Cable Row": "Back", "T-Bar Row": "Back",
  "Deadlift": "Back", "Romanian Deadlift": "Back",
  // Shoulders
  "Overhead Press": "Shoulders", "Dumbbell Shoulder Press": "Shoulders",
  "Lateral Raise": "Shoulders", "Front Raise": "Shoulders", "Face Pull": "Shoulders",
  // Biceps
  "Barbell Curl": "Biceps", "Dumbbell Curl": "Biceps", "Hammer Curl": "Biceps",
  "Cable Curl": "Biceps", "Preacher Curl": "Biceps", "Concentration Curl": "Biceps",
  // Triceps
  "Skull Crusher": "Triceps", "Tricep Pushdown": "Triceps", "Close-Grip Bench": "Triceps",
  "Overhead Tricep Extension": "Triceps", "Tricep Dips": "Triceps",
  // Legs/Quads
  "Barbell Squat": "Quads", "Goblet Squat": "Quads", "Leg Press": "Quads",
  "Leg Extension": "Quads", "Bulgarian Split Squat": "Quads", "Walking Lunge": "Quads",
  "Front Squat": "Quads",
  // Hamstrings
  "Leg Curl": "Hamstrings",
  // Glutes
  "Hip Thrust": "Glutes", "Glute Bridge": "Glutes", "Sumo Deadlift": "Glutes",
};

function analyzeTemplate(
  exercises: WorkoutTemplate["exercises"],
  user?: { sex?: string | null; goal?: string | null; fitnessLevel?: string | null }
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const names = exercises.map((e) => e.exerciseName);
  const muscleCoverage = new Set<string>();

  names.forEach((n) => {
    const muscle = MUSCLE_MAP[n];
    if (muscle) muscleCoverage.add(muscle);
  });

  // ── Spinal load warning ────────────────────────────────────────────────────
  const spinalLoadCount = names.filter((n) => SPINAL_LOAD_EXERCISES.has(n)).length;
  const hasCoreWork     = names.some((n) => CORE_EXERCISES.has(n));
  if (spinalLoadCount >= 2 && !hasCoreWork) {
    suggestions.push({
      type: "warning",
      text: "⚠️ Lower back load: this plan includes multiple spinal-loading movements without dedicated core work. Adding a Plank or Ab Wheel Rollout will improve lumbar stability and injury resilience.",
    });
  }

  // ── No posterior chain ─────────────────────────────────────────────────────
  const hasQuads  = muscleCoverage.has("Quads");
  const hasHamstrings = names.some((n) => ["Leg Curl", "Romanian Deadlift", "Hip Thrust", "Glute Bridge"].includes(n)) || muscleCoverage.has("Hamstrings");
  if (hasQuads && !hasHamstrings) {
    suggestions.push({
      type: "warning",
      text: "⚠️ Quad dominance: there is quad work but no hamstring/glute exercises. Add Leg Curls or Hip Thrusts to prevent knee imbalances.",
    });
  }

  // ── Missing muscle groups for full-body sessions ───────────────────────────
  const isFullBody = exercises.length >= 6 && !["PPL", "Bro_Split", "Upper_Lower"].some(() => false);
  if (isFullBody) {
    const important = ["Chest", "Back", "Quads", "Shoulders"] as const;
    const missing = important.filter((m) => !muscleCoverage.has(m));
    if (missing.length > 0) {
      suggestions.push({
        type: "tip",
        text: `💡 Missing muscle groups detected: ${missing.join(", ")}. Consider adding one exercise per group for a more complete session.`,
      });
    }
  }

  // ── Gender-aware suggestions ────────────────────────────────────────────────
  if (user?.sex === "female") {
    const hasGlutes = names.some((n) => ["Hip Thrust", "Glute Bridge", "Sumo Deadlift", "Bulgarian Split Squat"].includes(n));
    if (!hasGlutes) {
      suggestions.push({
        type: "tip",
        text: "💡 Female-specific tip: Hip Thrusts and Bulgarian Split Squats are highly effective for glute development. Consider adding one to this plan.",
      });
    }
  }

  if (user?.sex === "male") {
    const hasBack = muscleCoverage.has("Back");
    const hasChest = muscleCoverage.has("Chest");
    const chestToBackRatio = (names.filter((n) => MUSCLE_MAP[n] === "Chest").length) /
      Math.max(1, names.filter((n) => MUSCLE_MAP[n] === "Back").length);
    if (hasChest && hasBack && chestToBackRatio > 1.5) {
      suggestions.push({
        type: "tip",
        text: "💡 Push/pull balance: there's more chest work than back work. Add a row or pull-up variation to protect shoulder posture.",
      });
    }
  }

  // ── Goal-aware suggestions ─────────────────────────────────────────────────
  if (user?.goal === "lose_fat" || user?.goal?.toLowerCase().includes("lose")) {
    const hasCompound = names.some((n) =>
      ["Barbell Squat", "Deadlift", "Bench Press", "Overhead Press", "Barbell Row"].includes(n)
    );
    if (!hasCompound) {
      suggestions.push({
        type: "info",
        text: "ℹ️ Fat-loss tip: compound movements (squats, deadlifts, rows) burn significantly more calories and preserve muscle better than isolation exercises alone.",
      });
    }
  }

  if ((user?.goal === "build_muscle" || user?.goal === "body_recomp") && user?.fitnessLevel === "beginner") {
    suggestions.push({
      type: "info",
      text: "ℹ️ As a beginner, focus on progressive overload — small weight increases each week. Full-body or upper-lower splits produce faster results at this stage than bro splits.",
    });
  }

  return suggestions;
}

function SmartPlanSuggestions({ template, user }: {
  template: WorkoutTemplate;
  user?: { sex?: string | null; goal?: string | null; fitnessLevel?: string | null };
}) {
  const { t } = useTranslation();
  const suggestions = analyzeTemplate(template.exercises, user);
  if (suggestions.length === 0) return null;

  const colorMap = {
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    tip:     "border-blue-200  bg-blue-50  text-blue-800",
    info:    "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200",
  };

  return (
    <div className="space-y-2 mt-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t("workouts.smartSuggestions")}</p>
      {suggestions.map((s, i) => (
        <div key={i} className={`border rounded-xl px-3 py-2.5 text-xs leading-relaxed ${colorMap[s.type]}`}>
          {s.text}
        </div>
      ))}
    </div>
  );
}

function TemplateCard({ template, onStart, onView, onDelete }: {
  template: WorkoutTemplate;
  onStart: () => void; onView: () => void; onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const muscleGroups = Array.isArray(template.muscleGroups) ? template.muscleGroups : [];

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{SPLIT_ICONS[template.splitType] ?? "🏋️"}</span>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{template.name}</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">{template.dayLabel} · {template.frequency}×/week</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {template.isSystem && <Badge variant="info">{t("workouts.recommended")}</Badge>}
          {template.aiGenerated && !template.isSystem && <Badge variant="success">AI</Badge>}
        </div>
      </div>

      {template.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-3 leading-relaxed">{template.description}</p>
      )}

      <div className="flex gap-1.5 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${OBJECTIVE_COLORS[template.objective] ?? "bg-gray-100 text-gray-600"}`}>
          {template.objective.replace("_", " ")}
        </span>
        {muscleGroups.slice(0, 3).map((m) => (
          <span key={m} className="text-xs bg-gray-100 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{m}</span>
        ))}
      </div>

      {template.exercises.length > 0 && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 space-y-0.5">
          {template.exercises.slice(0, 4).map((e) => (
            <p key={e.id}>· {e.exerciseName} <span className="text-gray-300">({e.sets}×{e.reps})</span></p>
          ))}
          {template.exercises.length > 4 && <p className="text-gray-300">+{template.exercises.length - 4} more</p>}
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        {onDelete && (
          <button onClick={onDelete} className="px-2 text-xs text-red-400 hover:text-red-600 transition-colors">🗑</button>
        )}
        <Button variant="secondary" size="sm" className="flex-1" onClick={onView}>{t("workouts.viewBtn")}</Button>
        <Button size="sm" className="flex-1" onClick={onStart}>▶ Start</Button>
      </div>
    </Card>
  );
}

function TemplateDetail({ template, onStart, onClose, onFork, onRename, onUpdated }: {
  template: WorkoutTemplate; onStart: () => void; onClose: () => void;
  onFork?: () => void; onRename?: (name: string) => void;
  onUpdated?: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const injuries = user?.injuries ?? [];
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(template.name);
  const [forking, setForking] = useState(false);
  // Per-exercise replace suggestion panel
  const [suggestForId, setSuggestForId] = useState<number | null>(null);
  // Per-exercise edit mode (sets/reps)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSets, setEditSets] = useState("");
  const [editReps, setEditReps] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  // Local exercises state so UI updates without full reload
  const [exercises, setExercises] = useState(template.exercises);

  const saveExercise = async (ex: typeof exercises[0]) => {
    setSavingId(ex.id);
    try {
      await templatesApi.updateExercise(template.id, ex.id, {
        sets: Number(editSets) || ex.sets,
        reps: editReps ? String(editReps) : ex.reps,
      });
      setExercises((prev) => prev.map((e) => e.id === ex.id
        ? { ...e, sets: Number(editSets) || e.sets, reps: editReps ? String(editReps) : e.reps }
        : e
      ));
      setEditingId(null);
      onUpdated?.();
    } finally { setSavingId(null); }
  };

  const replaceExercise = async (exId: number, newName: string) => {
    setSavingId(exId);
    try {
      await templatesApi.updateExercise(template.id, exId, { exerciseName: newName });
      setExercises((prev) => prev.map((e) => e.id === exId ? { ...e, exerciseName: newName } : e));
      setSuggestForId(null);
      onUpdated?.();
    } finally { setSavingId(null); }
  };

  const removeExercise = async (exId: number) => {
    if (!confirm("Remove this exercise from the template?")) return;
    await templatesApi.removeExercise(template.id, exId);
    setExercises((prev) => prev.filter((e) => e.id !== exId));
    onUpdated?.();
  };

  const canEdit = !template.isSystem;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{SPLIT_ICONS[template.splitType] ?? "🏋️"}</span>
        <div className="flex-1 min-w-0">
          {renaming && !template.isSystem ? (
            <div className="flex gap-2 items-center">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) { onRename?.(newName.trim()); setRenaming(false); }
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="flex-1 rounded-lg border border-brand-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Button size="sm" onClick={() => { if (newName.trim()) { onRename?.(newName.trim()); setRenaming(false); } }}>Save</Button>
              <Button size="sm" variant="secondary" onClick={() => setRenaming(false)}>✕</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white truncate">{template.name}</h3>
              {!template.isSystem && onRename && (
                <button onClick={() => setRenaming(true)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-brand-600 transition-colors shrink-0">✏️</button>
              )}
            </div>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">{template.dayLabel} · {template.frequency}×/week · {template.objective}</p>
        </div>
      </div>

      {template.description && <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">{template.description}</p>}

      {/* System template fork notice */}
      {template.isSystem && onFork && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
          <span>🔧</span>
          <div className="flex-1">
            <p className="font-medium">{t("workouts.wantsCustomise")}</p>
            <p className="text-xs text-blue-600 mt-0.5">Fork it to My Templates — then you can rename it and adjust exercises.</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            loading={forking}
            onClick={async () => { setForking(true); try { await onFork(); } finally { setForking(false); } }}
          >
            Fork
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {exercises.map((ex, i) => {
          const banned = isContraindicated(ex.exerciseName, injuries);
          return (
            <div key={ex.id} className="space-y-1">
              <div className={`flex items-center gap-3 p-3 rounded-xl ${banned ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  {editingId === ex.id ? (
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100">{ex.exerciseName}</p>
                      <div className="flex gap-2">
                        <input
                          value={editSets}
                          onChange={(e) => setEditSets(e.target.value)}
                          placeholder={`${ex.sets} sets`}
                          className="w-20 border rounded-lg px-2 py-1 text-sm text-center"
                        />
                        <span className="self-center text-gray-400 dark:text-gray-500 text-xs">×</span>
                        <input
                          value={editReps}
                          onChange={(e) => setEditReps(e.target.value)}
                          placeholder={`${ex.reps} reps`}
                          className="w-20 border rounded-lg px-2 py-1 text-sm text-center"
                        />
                        <Button size="sm" loading={savingId === ex.id} onClick={() => saveExercise(ex)}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>✕</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={`text-sm font-semibold ${banned ? "text-red-700" : "text-gray-800 dark:text-gray-100"}`}>{ex.exerciseName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">{ex.sets} sets × {ex.reps} reps{ex.restSeconds ? ` · ${ex.restSeconds}s rest` : ""}</p>
                      {banned && <p className="text-[10px] text-red-500">⚠️ May stress injured area — consider replacing</p>}
                    </>
                  )}
                </div>
                {canEdit && editingId !== ex.id && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setEditSets(""); setEditReps(""); setEditingId(ex.id); setSuggestForId(null); }}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:border-brand-300 text-gray-600 dark:text-gray-300 transition-colors"
                    >Edit</button>
                    <button
                      type="button"
                      onClick={() => { setSuggestForId(suggestForId === ex.id ? null : ex.id); setEditingId(null); }}
                      className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                        suggestForId === ex.id
                          ? "border-brand-400 bg-brand-50 text-brand-700"
                          : banned
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-gray-200 bg-white text-gray-600 dark:text-gray-300 hover:border-brand-300"
                      }`}
                    >{banned ? "⚠️ Replace" : "💡 Replace"}</button>
                    <button
                      type="button"
                      onClick={() => removeExercise(ex.id)}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-600 text-gray-400 dark:text-gray-500 transition-colors"
                    >✕</button>
                  </div>
                )}
              </div>
              {/* Suggestion panel for replacement */}
              {suggestForId === ex.id && (
                <ExerciseSuggestPanel
                  currentExercise={ex.exerciseName}
                  injuries={injuries}
                  onSelect={(name) => replaceExercise(ex.id, name)}
                  onClose={() => setSuggestForId(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Smart suggestions panel */}
      <SmartPlanSuggestions template={{ ...template, exercises }} user={user ?? undefined} />

      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" onClick={onClose}>{t("workouts.closeBtn")}</Button>
        <Button className="flex-1" onClick={onStart}>▶ Start Workout</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile-aware recommended routine banner
// ─────────────────────────────────────────────────────────────────────────────
const GOAL_OBJECTIVE_MAP: Record<string, string> = {
  "lose weight": "fat_loss",
  "lose_fat": "fat_loss",
  "build muscle": "hypertrophy",
  "build_muscle": "hypertrophy",
  "body_recomp": "hypertrophy",
  "gain muscle, maintain fat %": "hypertrophy",
  "get stronger": "strength",
  "improve endurance": "endurance",
  "performance": "endurance",
  "maintain": "general",
};

function RecommendedBanner({ goal }: { goal?: string | null }) {
  const { t } = useTranslation();
  if (!goal) return null;
  const objective = GOAL_OBJECTIVE_MAP[goal.toLowerCase()];
  if (!objective) return null;

  const labels: Record<string, string> = {
    fat_loss: "Your goal is weight loss — templates below are sorted by fat-loss focus.",
    hypertrophy: "Your goal is muscle building — hypertrophy templates are highlighted first.",
    strength: "Your goal is strength — strength-focused programs are at the top.",
    endurance: "Your goal is endurance — cardio and full-body templates are prioritized.",
  };

  return (
    <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-sm text-brand-800">
      <span className="text-lg">🎯</span>
      <p>{labels[objective]}</p>
    </div>
  );
}

function TemplatesTab({ onWorkoutStarted, trainingDays }: { onWorkoutStarted: () => void; trainingDays: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [subTab, setSubTab] = useState<"recommended" | "mine">("recommended");
  const [grouped, setGrouped] = useState<Record<string, WorkoutTemplate[]>>({});
  const [mine, setMine] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [detail, setDetail] = useState<WorkoutTemplate | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [scheduling, setScheduling] = useState<WorkoutTemplate | null>(null);
  const [planToCalendar, setPlanToCalendar] = useState<WorkoutTemplate | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, mineRes] = await Promise.all([
        templatesApi.getRecommended(),
        templatesApi.getAll(),
      ]);
      // Sort recommended groups so user's objective comes first
      const userObjective = user?.goal ? GOAL_OBJECTIVE_MAP[user.goal.toLowerCase()] : null;
      const raw = recRes.data.grouped;
      if (userObjective) {
        // Templates matching objective get boosted within each group
        for (const key of Object.keys(raw)) {
          raw[key] = [
            ...raw[key].filter((t) => t.objective === userObjective),
            ...raw[key].filter((t) => t.objective !== userObjective),
          ];
        }
      }
      setGrouped(raw);
      setMine(mineRes.data.templates.filter((t) => !t.isSystem));
    } finally { setLoading(false); }
  }, [user?.goal]);

  useEffect(() => { load(); }, [load]);

  const startFromTemplate = async (template: WorkoutTemplate) => {
    setStarting(template.id);
    try {
      await workoutsApi.startFromTemplate(template.id);
      onWorkoutStarted();
    } catch { alert("Failed to start workout"); }
    finally { setStarting(null); }
  };

  // Schedule workouts for this week — one per training day, evenly spaced
  const DAY_PATTERNS: Record<number, number[]> = {
    1: [1],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
  };

  const scheduleWeek = async (template: WorkoutTemplate) => {
    setScheduling(template);
    const capped = Math.max(1, Math.min(7, trainingDays));
    const pattern = DAY_PATTERNS[capped] ?? DAY_PATTERNS[4];
    // Get Monday of current week (ISO: Mon=0)
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // Mon=0 … Sun=6
    const monday = new Date(today);
    monday.setDate(today.getDate() - dow);
    monday.setHours(0, 0, 0, 0);

    try {
      for (const dayOffset of pattern) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + dayOffset);
        const dateStr = d.toISOString().split("T")[0];
        await workoutsApi.startFromTemplate(template.id, dateStr);
      }
      onWorkoutStarted();
      toast.show(`Scheduled ${pattern.length} workouts this week!`);
    } catch {
      alert("Failed to schedule workouts");
    } finally { setScheduling(null); }
  };

  const seedTemplates = async () => {
    setSeeding(true);
    try { await templatesApi.seed(); await load(); }
    finally { setSeeding(false); }
  };

  const deleteMyTemplate = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    await templatesApi.delete(id);
    setMine((prev) => prev.filter((t) => t.id !== id));
    toast.show("Template deleted.");
  };

  const forkTemplate = async (template: WorkoutTemplate) => {
    const res = await templatesApi.create({
      name: `${template.name} (My Copy)`,
      description: template.description,
      splitType: template.splitType,
      objective: template.objective,
      frequency: template.frequency,
      dayLabel: template.dayLabel,
      muscleGroups: Array.isArray(template.muscleGroups) ? template.muscleGroups : [],
      isSystem: false,
      exercises: template.exercises.map((e) => ({
        exerciseName: e.exerciseName,
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
        notes: e.notes,
        order: e.order,
      })),
    });
    const forked = res.data.template;
    setMine((prev) => [...prev, forked]);
    setDetail(forked);
    setSubTab("mine");
    toast.show(`"${forked.name}" added to My Templates. You can rename it now.`);
  };

  const renameTemplate = async (id: number, name: string) => {
    await templatesApi.update(id, { name });
    setMine((prev) => prev.map((t) => t.id === id ? { ...t, name } : t));
    setDetail((d) => d?.id === id ? { ...d, name } : d);
    toast.show("Template renamed.");
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["recommended", "mine"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${subTab === t ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700"}`}
          >
            {t === "recommended" ? "📋 Recommended" : `⚙️ My Templates${mine.length ? ` (${mine.length})` : ""}`}
          </button>
        ))}
      </div>

      {subTab === "recommended" ? (
        Object.keys(grouped).length === 0 ? (
          <Card className="text-center py-14">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t("workouts.noRecommendedTemplates")}</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{t("workouts.seedDesc")}</p>
            <Button loading={seeding} onClick={seedTemplates}>{t("workouts.seedTemplates")}</Button>
          </Card>
        ) : (
          <div className="space-y-8">
            <RecommendedBanner goal={user?.goal} />
            {Object.entries(grouped).map(([groupKey, templates]) => (
              <div key={groupKey}>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">{SPLIT_LABELS[groupKey] ?? groupKey}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onStart={() => startFromTemplate(t)}
                      onView={() => setDetail(t)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        mine.length === 0 ? (
          <Card className="text-center py-14">
            <div className="text-5xl mb-4">⚙️</div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t("workouts.noPersonalTemplates")}</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Save a logged workout as a template, or ask the AI Coach to generate one.</p>
            <Button variant="secondary" onClick={() => navigate("/chat?agent=coach")}>🤖 Ask AI Coach</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mine.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onStart={() => startFromTemplate(t)}
                onView={() => setDetail(t)}
                onDelete={() => deleteMyTemplate(t.id)}
              />
            ))}
          </div>
        )
      )}

      {/* Template detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name} size="md">
        {detail && (
          <>
            <TemplateDetail
              template={detail}
              onStart={() => { setDetail(null); startFromTemplate(detail); }}
              onClose={() => setDetail(null)}
              onFork={detail.isSystem ? () => forkTemplate(detail) : undefined}
              onRename={!detail.isSystem ? (name) => renameTemplate(detail.id, name) : undefined}
            />
            <div className="px-4 pb-4 mt-2 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
              {/* Add to Calendar — populate month */}
              <Button
                className="w-full"
                onClick={() => { setDetail(null); setPlanToCalendar(detail); }}
              >
                📆 Add to Monthly Calendar
              </Button>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Fills your training calendar for 1–3 months. Fully editable afterwards.
              </p>
              {/* Schedule actual logged workouts this week */}
              <Button
                variant="secondary"
                className="w-full mt-1"
                loading={scheduling?.id === detail.id}
                onClick={() => { setDetail(null); scheduleWeek(detail); }}
              >
                📅 Log Workouts for This Week ({trainingDays} days)
              </Button>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Creates {trainingDays} logged workouts in your history</p>
            </div>
          </>
        )}
      </Modal>

      {/* Plan-to-calendar modal */}
      {planToCalendar && (
        <PlanToCalendarModal
          template={planToCalendar}
          trainingDays={trainingDays}
          onClose={() => setPlanToCalendar(null)}
          onApplied={(msg) => { setPlanToCalendar(null); toast.show(msg); }}
        />
      )}

      <ToastBanner msg={toast.msg} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan-to-calendar modal (from TemplatesTab → t("workouts.addToMonthlyCalendar"))
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_DAY_PATTERNS: Record<number, number[]> = {
  1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
};

function PlanToCalendarModal({
  template, trainingDays, onClose, onApplied,
}: {
  template: WorkoutTemplate;
  trainingDays: number;
  onClose: () => void;
  onApplied: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const today = new Date();
  const thisMonth = format(today, "yyyy-MM");
  const nextMonth = format(new Date(today.getFullYear(), today.getMonth() + 1, 1), "yyyy-MM");
  const twoMonths = format(new Date(today.getFullYear(), today.getMonth() + 2, 1), "yyyy-MM");

  // Pre-fill weekdays based on the template's frequency and user's training days
  const capped = Math.max(1, Math.min(7, trainingDays));
  const defaultDays = new Set<number>(
    (DEFAULT_DAY_PATTERNS[Math.min(capped, template.frequency)] ?? DEFAULT_DAY_PATTERNS[capped]).slice(0, template.frequency)
  );
  const [weekdays, setWeekdays]   = useState<Set<number>>(defaultDays);
  const [duration, setDuration]   = useState<"1" | "2" | "3">("1");
  const [overwrite, setOverwrite] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const toggleDay = (d: number) => {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  };

  const months = [thisMonth, nextMonth, twoMonths].slice(0, Number(duration));

  const handleApply = async () => {
    if (weekdays.size === 0) { setError("Select at least one weekday."); return; }
    setError("");
    setSaving(true);
    const muscleGroups = Array.isArray(template.muscleGroups) ? template.muscleGroups : [];
    const assignments = [...weekdays].map((dow) => ({
      dayOfWeek:    dow,
      workoutName:  template.dayLabel || template.name,
      muscleGroups,
      templateId:   template.id,
      isRestDay:    false,
    }));
    try {
      let total = 0;
      for (const month of months) {
        const res = await calendarApi.populate({ month, assignments, overwrite });
        total += res.data.count;
      }
      onApplied(`Added ${total} planned day${total !== 1 ? "s" : ""} across ${months.length} month${months.length !== 1 ? "s" : ""}! Check the Calendar tab.`);
    } catch {
      setError("Failed to populate calendar.");
      setSaving(false);
    }
  };

  return (
    <Modal open title={t("workouts.addToMonthlyCalendar")} onClose={onClose} size="md">
      <div className="space-y-5 p-1">
        {/* Template info */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-brand-800">{template.dayLabel || template.name}</p>
          {Array.isArray(template.muscleGroups) && template.muscleGroups.length > 0 && (
            <p className="text-xs text-brand-600 mt-0.5">{(template.muscleGroups as string[]).join(" · ")}</p>
          )}
        </div>

        {/* Weekday picker */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Which days of the week? <span className="text-gray-400 dark:text-gray-500 text-xs">(template frequency: {template.frequency}x/week)</span>
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAY_LABELS.map((label, dow) => (
              <button
                key={dow}
                type="button"
                onClick={() => toggleDay(dow)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition
                  ${weekdays.has(dow)
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-gray-600 dark:text-gray-300 border-gray-200 hover:border-brand-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {weekdays.size !== template.frequency && (
            <p className="text-xs text-amber-500 mt-1">
              ⚠️ You've selected {weekdays.size} day{weekdays.size !== 1 ? "s" : ""} but this template is designed for {template.frequency}x/week.
            </p>
          )}
        </div>

        {/* Duration picker */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">How many months to fill?</p>
          <div className="flex gap-2">
            {([
              { val: "1", label: "This month", sub: thisMonth },
              { val: "2", label: "+ Next month", sub: nextMonth },
              { val: "3", label: "+ 2 months", sub: twoMonths },
            ] as const).map(({ val, label, sub }) => (
              <button
                key={val}
                onClick={() => setDuration(val)}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition
                  ${duration === val
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-gray-600 dark:text-gray-300 border-gray-200 hover:border-brand-300"}`}
              >
                <div>{label}</div>
                <div className="text-[10px] opacity-75 mt-0.5">{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Overwrite toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            className="w-4 h-4 accent-brand-600"
          />
          Replace days that already have a plan
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">
          📆 Fills <strong>{weekdays.size} day{weekdays.size !== 1 ? "s" : ""}/week × {months.length} month{months.length !== 1 ? "s" : ""}</strong> on the Calendar tab.
          You can edit, move, or delete any individual day afterwards.
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">{t("common.cancel")}</Button>
          <Button onClick={handleApply} loading={saving} className="flex-1">
            Add to Calendar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar view — full monthly planner
// ─────────────────────────────────────────────────────────────────────────────
const WEEKDAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function CalendarTab({ allWorkouts, trainingDays }: { allWorkouts: Workout[]; trainingDays: number }) {
  const { t } = useTranslation();
  const [month, setMonth] = useState(new Date());
  const [cheatDays, setCheatDays]         = useState<Set<string>>(new Set());
  const [calendarDays, setCalendarDays]   = useState<WorkoutCalendarDay[]>([]);
  const [loadingCal, setLoadingCal]       = useState(false);
  // selected date for detail panel
  const [selected, setSelected]           = useState<string | null>(null);
  // swap mode: first click picks a date, second click swaps
  const [swapMode, setSwapMode]           = useState(false);
  const [swapFrom, setSwapFrom]           = useState<string | null>(null);
  const [swapping, setSwapping]           = useState(false);
  // apply template modal
  const [showApply, setShowApply]         = useState(false);
  const [showBuilder, setShowBuilder]     = useState(false);
  // edit day modal (full editor with notes, bulk apply)
  const [editDay, setEditDay]             = useState<string | null>(null);
  const [editWorking, setEditWorking]     = useState(false);
  // inline day editor state (fast single-day edits directly in the panel)
  const [inlineName, setInlineName]       = useState("");
  const [inlineRest, setInlineRest]       = useState(false);
  const [inlineSaving, setInlineSaving]   = useState(false);
  // available templates
  const [templates, setTemplates]         = useState<WorkoutTemplate[]>([]);
  const useToastInCal                     = useToast();

  const monthKey = format(month, "yyyy-MM");

  // ── Load calendar plan + cheat days whenever month changes ────────────────
  const loadCalendar = useCallback(async () => {
    setLoadingCal(true);
    try {
      const res = await calendarApi.getMonth(monthKey);
      // Parse muscleGroups from JSON string
      const parsed = res.data.days.map((d) => ({
        ...d,
        muscleGroups: d.muscleGroups
          ? (typeof d.muscleGroups === "string"
              ? JSON.parse(d.muscleGroups as unknown as string)
              : d.muscleGroups)
          : [],
      }));
      setCalendarDays(parsed);
    } catch { /* silent */ }
    finally { setLoadingCal(false); }
  }, [monthKey]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);
  useEffect(() => {
    foodApi.getCheatDates(90).then((r) => setCheatDays(new Set(r.data.dates))).catch(() => {});
  }, [monthKey]);
  useEffect(() => {
    templatesApi.getAll().then((r) => setTemplates(r.data.templates)).catch(() => {});
  }, []);

  // ── Derived maps ────────────────────────────────────────────────────────────
  const workoutDayMap = useMemo(() => {
    const map: Record<string, Workout[]> = {};
    for (const w of allWorkouts) {
      const d = new Date(w.date).toISOString().split("T")[0];
      if (!map[d]) map[d] = [];
      map[d].push(w);
    }
    return map;
  }, [allWorkouts]);

  const calendarDayMap = useMemo(() => {
    const map: Record<string, WorkoutCalendarDay> = {};
    for (const d of calendarDays) map[d.date] = d;
    return map;
  }, [calendarDays]);

  // ── Calendar grid ───────────────────────────────────────────────────────────
  const days = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  }, [month]);

  const firstDayOffset = useMemo(() => {
    const dow = getDay(startOfMonth(month));
    return (dow + 6) % 7; // Mon=0
  }, [month]);

  const todayStr = new Date().toISOString().split("T")[0];

  // ── Swap handler ─────────────────────────────────────────────────────────────
  const handleDayClick = async (str: string) => {
    if (swapMode) {
      if (!swapFrom) {
        setSwapFrom(str);
      } else if (swapFrom === str) {
        setSwapFrom(null);
      } else {
        setSwapping(true);
        try {
          await calendarApi.swap(swapFrom, str);
          await loadCalendar();
          useToastInCal.show("Days swapped!");
        } catch { useToastInCal.show("Swap failed"); }
        setSwapFrom(null);
        setSwapping(false);
      }
      return;
    }
    setSelected((s) => (s === str ? null : str));
  };

  // ── Clear month ──────────────────────────────────────────────────────────────
  const handleClearMonth = async () => {
    if (!confirm(`Clear all planned days for ${format(month, "MMMM yyyy")}?`)) return;
    try {
      await calendarApi.clearMonth(monthKey);
      await loadCalendar();
      useToastInCal.show("Month cleared");
    } catch { useToastInCal.show("Clear failed"); }
  };

  // ── Delete a single planned day ──────────────────────────────────────────────
  const handleDeleteDay = async (date: string) => {
    try {
      await calendarApi.deleteDay(date);
      await loadCalendar();
      setSelected(null);
      useToastInCal.show("Day cleared");
    } catch { useToastInCal.show("Failed to clear day"); }
  };

  // ── Mark as rest day ────────────────────────────────────────────────────────
  const handleMarkRest = async (date: string) => {
    try {
      await calendarApi.updateDay(date, { workoutName: "Rest", muscleGroups: [], isRestDay: true });
      await loadCalendar();
      setSelected(null);
    } catch { useToastInCal.show("Failed"); }
  };

  const selectedWorkouts   = selected ? (workoutDayMap[selected] ?? []) : [];
  const selectedCalDay     = selected ? calendarDayMap[selected] : null;

  // Sync inline editor whenever selected day or its calendar data changes
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (selected === prevSelectedRef.current) return;
    prevSelectedRef.current = selected;
    const cal = selected ? calendarDayMap[selected] : null;
    setInlineRest(cal?.isRestDay ?? false);
    setInlineName(cal?.workoutName ?? "");
  }, [selected, calendarDayMap]);

  const saveInline = async (overrideRest?: boolean, overrideName?: string) => {
    if (!selected) return;
    setInlineSaving(true);
    const isRest   = overrideRest  ?? inlineRest;
    const name     = overrideName  ?? inlineName;
    try {
      await calendarApi.updateDay(selected, {
        workoutName:  isRest ? "Rest" : (name.trim() || "Workout"),
        muscleGroups: [],
        isRestDay:    isRest,
      });
      await loadCalendar();
      useToastInCal.show(isRest ? "Marked as rest day 😴" : `Saved: ${name.trim() || "Workout"}`);
    } catch { useToastInCal.show("Failed to save"); }
    finally { setInlineSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => { setMonth((m) => subMonths(m, 1)); setSelected(null); }}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 dark:text-gray-300 font-bold text-lg leading-none">‹</button>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg min-w-[160px] text-center">{format(month, "MMMM yyyy")}</h3>
          <button onClick={() => { setMonth((m) => addMonths(m, 1)); setSelected(null); }}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 dark:text-gray-300 font-bold text-lg leading-none">›</button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowBuilder(true)}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition">
            🗓 Build Plan
          </button>
          <button onClick={() => setShowApply(true)}
            className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-brand-300 text-brand-700 dark:text-brand-400 text-xs font-semibold px-3 py-1.5 rounded-xl transition hover:bg-brand-50">
            📋 Apply Template
          </button>
          <button
            onClick={() => { setSwapMode((v) => !v); setSwapFrom(null); setSelected(null); }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition
              ${swapMode ? "bg-amber-100 border-amber-400 text-amber-700" : "bg-white border-gray-200 text-gray-600 dark:text-gray-300 hover:border-gray-400"}`}>
            🔄 {swapMode ? "Swapping…" : "Swap Days"}
          </button>
          {calendarDays.length > 0 && (
            <button onClick={handleClearMonth}
              className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 hover:border-red-400 text-red-600 dark:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-xl transition">
              🗑 Clear Month
            </button>
          )}
        </div>
      </div>

      {/* Swap hint banner */}
      {swapMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700 flex items-center gap-2">
          🔄 {swapFrom
            ? `First day selected: ${format(new Date(swapFrom + "T12:00:00"), "MMM d")} — now click the day to swap it with`
            : "Click a day to start swapping, then click another day"}
          <button onClick={() => { setSwapMode(false); setSwapFrom(null); }} className="ml-auto text-xs underline">{t("common.cancel")}</button>
        </div>
      )}

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e${i}`} />)}
        {days.map((day) => {
          const str        = format(day, "yyyy-MM-dd");
          const logged     = workoutDayMap[str] ?? [];
          const planned    = calendarDayMap[str];
          const isToday    = str === todayStr;
          const isSelected = str === selected;
          const isCheat    = cheatDays.has(str);
          const isSwapFrom = str === swapFrom;

          // Colour priority: logged > planned workout > planned rest > cheat > empty
          let bg = "bg-gray-50 hover:bg-gray-100 text-gray-500";
          if (logged.length)          bg = "bg-brand-100 hover:bg-brand-200 text-brand-800 font-semibold";
          else if (planned?.isRestDay) bg = "bg-green-50 hover:bg-green-100 text-green-600";
          else if (planned)            bg = "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold";

          const label = logged.length
            ? logged[0].name
            : planned?.workoutName ?? null;

          return (
            <button
              key={str}
              disabled={swapping}
              onClick={() => handleDayClick(str)}
              className={`relative rounded-xl flex flex-col items-center justify-start pt-1 pb-1 min-h-[64px] text-xs transition
                ${bg}
                ${isToday    ? "border-2 border-brand-400" : "border border-transparent"}
                ${isSelected ? "ring-2 ring-brand-500" : ""}
                ${isSwapFrom ? "ring-2 ring-amber-400 ring-offset-1" : ""}
              `}
            >
              <span className="font-bold">{format(day, "d")}</span>
              {label && (
                <span className="text-[9px] leading-tight text-center px-0.5 mt-0.5 line-clamp-2 w-full">
                  {label}
                </span>
              )}
              {/* Dots / badges */}
              <div className="flex gap-0.5 mt-auto items-center pb-0.5">
                {logged.length > 0 && Array.from({ length: Math.min(logged.length, 3) }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                ))}
                {planned && !logged.length && !planned.isRestDay && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}
                {planned?.isRestDay && !logged.length && <span className="text-[8px]">😴</span>}
                {isCheat && <span className="text-[8px]">🍕</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-100 inline-block" /> Logged workout</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-50 inline-block" /> Planned workout</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-50 inline-block" /> 😴 Rest day</span>
        <span className="flex items-center gap-1.5">🍕 Cheat meal</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-brand-400 inline-block" /> Today</span>
        {loadingCal && <span className="text-gray-400 dark:text-gray-500 italic">{t("workouts.loading")}</span>}
      </div>

      {/* ── Inline day editor ── */}
      {selected && !swapMode && (
        <div className={`rounded-2xl border-2 p-4 space-y-3 transition
          ${inlineRest
            ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
            : "bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-700"}`}>

          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-gray-900 dark:text-white text-base">
              {format(new Date(selected + "T12:00:00"), "EEEE, MMMM d")}
            </h4>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditDay(selected)}
                className="text-xs text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 px-2 py-1 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900 transition"
                title={t("workouts.fullEditor")}
              >⚙️ More</button>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1">✕</button>
            </div>
          </div>

          {/* Workout / Rest toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setInlineRest(false); if (inlineRest) saveInline(false, inlineName); }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition
                ${!inlineRest
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-600 hover:border-brand-300"}`}
            >
              💪 Workout
            </button>
            <button
              type="button"
              onClick={() => { setInlineRest(true); saveInline(true, "Rest"); }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition
                ${inlineRest
                  ? "bg-green-500 text-white border-green-500"
                  : "bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-600 hover:border-green-300"}`}
            >
              😴 Rest Day
            </button>
          </div>

          {/* Workout name input (only when not rest) */}
          {!inlineRest && (
            <div className="flex gap-2">
              <input
                value={inlineName}
                onChange={(e) => setInlineName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveInline()}
                placeholder={t("workouts.workoutNamePlaceholder")}
                className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-brand-400"
              />
              <button
                onClick={() => saveInline()}
                disabled={inlineSaving}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50"
              >
                {inlineSaving ? "…" : t("common.save")}
              </button>
            </div>
          )}

          {/* Logged workouts (read-only) */}
          {selectedWorkouts.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("workouts.logged")}</p>
              {selectedWorkouts.map((w) => (
                <div key={w.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border border-brand-100 dark:border-brand-900">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">✅ {w.name}</span>
                  <span className="text-xs text-gray-400">{w.duration}min{w.caloriesBurned ? ` · 🔥${Math.round(w.caloriesBurned)}` : ""}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions footer */}
          <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-700 flex-wrap">
            <button
              onClick={async () => {
                if (!selected) return;
                const rawDay = getDay(new Date(selected + "T12:00:00"));
                const weekday = rawDay === 0 ? 6 : rawDay - 1;
                const wd = WEEKDAY_LABELS[weekday];
                const isRest = inlineRest;
                const name   = isRest ? "Rest" : (inlineName.trim() || "Workout");
                setInlineSaving(true);
                try {
                  const res = await calendarApi.populate({
                    month: monthKey,
                    overwrite: true,
                    assignments: [{ dayOfWeek: weekday, workoutName: name, muscleGroups: [], isRestDay: isRest }],
                  });
                  await loadCalendar();
                  useToastInCal.show(`Applied to all ${wd}s this month (${res.data.count} days)`);
                } catch { useToastInCal.show("Failed"); }
                finally { setInlineSaving(false); }
              }}
              disabled={inlineSaving}
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:border-brand-300 transition disabled:opacity-50"
            >
              🔁 Apply to all {WEEKDAY_LABELS[(() => { const r = getDay(new Date((selected ?? "2000-01-01") + "T12:00:00")); return r === 0 ? 6 : r - 1; })()]}s
            </button>
            {selectedCalDay && (
              <button
                onClick={() => handleDeleteDay(selected!)}
                className="text-xs bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-500 px-3 py-1.5 rounded-lg hover:border-red-400 transition"
              >
                🗑 Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state — show plan builder CTA when no plan exists */}
      {!loadingCal && calendarDays.length === 0 && !swapMode && (
        <div className="border-2 border-dashed border-brand-200 dark:border-brand-800 rounded-2xl p-6 text-center space-y-3">
          <p className="text-2xl">🗓</p>
          <p className="font-bold text-gray-700 dark:text-gray-200 text-base">No plan for {format(month, "MMMM yyyy")}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Build a full monthly workout schedule in seconds — pick your workout days, rest days, and how many months to fill.</p>
          <button
            onClick={() => setShowBuilder(true)}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition"
          >
            🗓 Build My Monthly Plan
          </button>
        </div>
      )}

      {/* Plan Builder Modal */}
      {showBuilder && (
        <MonthlyPlanBuilderModal
          month={monthKey}
          trainingDays={trainingDays}
          templates={templates}
          onClose={() => setShowBuilder(false)}
          onBuilt={(msg) => { setShowBuilder(false); loadCalendar(); useToastInCal.show(msg); }}
        />
      )}

      {/* Apply Template Modal */}
      {showApply && (
        <ApplyTemplateModal
          month={monthKey}
          templates={templates}
          onClose={() => setShowApply(false)}
          onApplied={(msg) => { setShowApply(false); loadCalendar(); useToastInCal.show(msg); }}
        />
      )}

      {/* Edit Day Modal */}
      {editDay && (
        <EditCalendarDayModal
          date={editDay}
          month={monthKey}
          current={calendarDayMap[editDay] ?? null}
          templates={templates}
          working={editWorking}
          setWorking={setEditWorking}
          onClose={() => setEditDay(null)}
          onSaved={(msg) => { setEditDay(null); setSelected(null); loadCalendar(); useToastInCal.show(msg); }}
        />
      )}

      <ToastBanner msg={useToastInCal.msg} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Monthly Plan Builder Modal
// ─────────────────────────────────────────────────────────────────────────────
type BuilderDay = {
  dayIndex: number;   // 0=Mon...6=Sun
  isRest: boolean;
  workoutName: string;
  templateId: number | "";
};

const BUILDER_PRESETS: Record<string, string[]> = {
  "Push — Chest · Shoulders · Triceps": ["Chest", "Shoulders", "Triceps"],
  "Pull — Back · Biceps":              ["Back", "Biceps"],
  "Legs — Quads · Hamstrings · Glutes":["Quads", "Hamstrings", "Glutes"],
  "Upper Body":                        ["Chest", "Back", "Shoulders"],
  "Lower Body":                        ["Quads", "Hamstrings", "Glutes"],
  "Full Body":                         [],
  "Cardio":                            [],
  "Core & Abs":                        ["Abs", "Core"],
  "Arms":                              ["Biceps", "Triceps"],
};

function MonthlyPlanBuilderModal({
  month, trainingDays, templates, onClose, onBuilt,
}: {
  month: string;
  trainingDays: number;
  templates: WorkoutTemplate[];
  onClose: () => void;
  onBuilt: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const defaultPattern = DEFAULT_DAY_PATTERNS[Math.min(trainingDays, 7)] ?? DEFAULT_DAY_PATTERNS[4];

  const [days, setDays] = useState<BuilderDay[]>(
    WEEKDAY_LABELS.map((_, i) => ({
      dayIndex:    i,
      isRest:      !defaultPattern.includes(i),
      workoutName: "",
      templateId:  "" as number | "",
    }))
  );
  const [duration, setDuration] = useState(1);
  const [overwrite, setOverwrite] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const toggle = (i: number) =>
    setDays((prev) => prev.map((d, idx) => idx === i ? { ...d, isRest: !d.isRest } : d));

  const setName = (i: number, name: string) =>
    setDays((prev) => prev.map((d, idx) => idx === i ? { ...d, workoutName: name } : d));

  const setTpl = (i: number, tplId: number | "") =>
    setDays((prev) => prev.map((d, idx) => {
      if (idx !== i) return d;
      const tpl = templates.find((t) => t.id === Number(tplId));
      return { ...d, templateId: tplId, workoutName: tplId ? (tpl?.dayLabel || tpl?.name || d.workoutName) : d.workoutName };
    }));

  const workoutDays = days.filter((d) => !d.isRest);

  const handleBuild = async () => {
    if (workoutDays.length === 0) { setError("Mark at least one day as a workout day."); return; }
    setError("");
    setSaving(true);
    const assignments = workoutDays.map((d) => {
      const tpl = templates.find((t) => t.id === Number(d.templateId));
      return {
        dayOfWeek:    d.dayIndex,
        workoutName:  d.workoutName.trim() || tpl?.dayLabel || tpl?.name || WEEKDAY_LABELS[d.dayIndex] + " Workout",
        muscleGroups: Array.isArray(tpl?.muscleGroups) ? (tpl!.muscleGroups as string[]) : [],
        templateId:   d.templateId ? Number(d.templateId) : undefined,
        isRestDay:    false,
      };
    });

    // Also add explicit rest day entries so rest days show on calendar
    const restAssignments = days.filter((d) => d.isRest).map((d) => ({
      dayOfWeek:    d.dayIndex,
      workoutName:  "Rest",
      muscleGroups: [] as string[],
      isRestDay:    true,
    }));

    const allAssignments = [...assignments, ...restAssignments];
    const months = getMonthRange(month, duration);
    let total = 0;

    try {
      for (const m of months) {
        const res = await calendarApi.populate({ month: m, assignments: allAssignments, overwrite });
        total += res.data.count ?? 0;
      }
      const label = months.length === 1 ? months[0] : `${months[0]} – ${months[months.length - 1]}`;
      onBuilt(`Plan built! ${total} days scheduled across ${label} 🎉`);
    } catch {
      setError("Failed to build plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const restDayCount = days.filter((d) => d.isRest).length;

  return (
    <Modal open title={t("workouts.buildMonthlyPlan")} onClose={onClose} size="lg">
      <div className="space-y-5 p-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Set each day as a workout or rest, name your sessions, then choose how many months to fill.
          Every matching weekday across the range will be scheduled automatically.
        </p>

        {/* Duration picker */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">{t("workouts.duration")}</label>
          <div className="flex gap-2">
            {[
              { n: 1, label: "1 Month" },
              { n: 2, label: "2 Months" },
              { n: 3, label: "3 Months" },
            ].map(({ n, label }) => (
              <button key={n} type="button" onClick={() => setDuration(n)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition
                  ${duration === n
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-brand-300"}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Range: <strong>{getMonthRange(month, duration).join(" → ")}</strong>
            {" · "}{workoutDays.length} workout day{workoutDays.length !== 1 ? "s" : ""}, {restDayCount} rest day{restDayCount !== 1 ? "s" : ""}/week
          </p>
        </div>

        {/* Day grid */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">{t("workouts.weeklySchedule")}</label>
          {days.map((d, i) => (
            <div key={i}
              className={`rounded-xl border p-3 transition
                ${d.isRest
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800"}`}>
              <div className="flex items-center gap-3">
                {/* Day label + toggle */}
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={`w-14 text-center py-1.5 rounded-lg text-xs font-bold border transition flex-shrink-0
                    ${d.isRest
                      ? "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 border-green-300"
                      : "bg-brand-600 text-white border-brand-600"}`}
                  title={t("workouts.clickToggle")}
                >
                  {WEEKDAY_LABELS[i]}
                </button>

                {d.isRest ? (
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium flex-1">😴 Rest Day <span className="text-xs text-gray-400 font-normal">(click day to make it a workout)</span></span>
                ) : (
                  <div className="flex gap-2 flex-1 min-w-0">
                    {/* Quick presets */}
                    <select
                      value={d.templateId}
                      onChange={(e) => setTpl(i, e.target.value === "" ? "" : Number(e.target.value))}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-brand-400 w-44 flex-shrink-0"
                    >
                      <option value="">— No template —</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.dayLabel || t.name}</option>
                      ))}
                    </select>
                    {/* Custom name */}
                    <input
                      value={d.workoutName}
                      onChange={(e) => setName(i, e.target.value)}
                      placeholder={`e.g. Push Day, Leg Day…`}
                      className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-brand-400 min-w-0"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Overwrite toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="w-4 h-4 accent-brand-600" />
          Overwrite days that already have a plan
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">{t("common.cancel")}</Button>
          <Button onClick={handleBuild} loading={saving} className="flex-1 bg-brand-600">
            🗓 Build {duration} Month{duration > 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Apply Template Modal
// ─────────────────────────────────────────────────────────────────────────────
interface TemplateAssignment {
  template: WorkoutTemplate | null;
  weekdays: Set<number>;   // 0=Mon…6=Sun
}

/** Returns an array of N month strings starting from `startMonth` ("YYYY-MM"). */
function getMonthRange(startMonth: string, count: number): string[] {
  const months: string[] = [];
  const [y, m] = startMonth.split("-").map(Number);
  for (let i = 0; i < count; i++) {
    const d = new Date(y, m - 1 + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function ApplyTemplateModal({
  month, templates, onClose, onApplied,
}: {
  month: string;
  templates: WorkoutTemplate[];
  onClose: () => void;
  onApplied: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([
    { template: null, weekdays: new Set() },
  ]);
  const [duration, setDuration] = useState(1);   // 1 | 2 | 3 months
  const [overwrite, setOverwrite] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const addRow = () =>
    setAssignments((prev) => [...prev, { template: null, weekdays: new Set() }]);

  const removeRow = (i: number) =>
    setAssignments((prev) => prev.filter((_, idx) => idx !== i));

  const setRowTemplate = (i: number, t: WorkoutTemplate | null) =>
    setAssignments((prev) => prev.map((a, idx) => idx === i ? { ...a, template: t } : a));

  const toggleWeekday = (i: number, day: number) =>
    setAssignments((prev) =>
      prev.map((a, idx) => {
        if (idx !== i) return a;
        const next = new Set(a.weekdays);
        if (next.has(day)) next.delete(day); else next.add(day);
        return { ...a, weekdays: next };
      })
    );

  const handleApply = async () => {
    setError("");
    const payload: Array<{
      dayOfWeek: number;
      workoutName: string;
      muscleGroups: string[];
      templateId?: number;
      isRestDay: boolean;
    }> = [];

    for (const a of assignments) {
      if (!a.template) { setError("Select a template for every row (or remove it)."); return; }
      if (a.weekdays.size === 0) { setError("Select at least one weekday per template row."); return; }
      for (const dow of a.weekdays) {
        payload.push({
          dayOfWeek:    dow,
          workoutName:  a.template.dayLabel || a.template.name,
          muscleGroups: Array.isArray(a.template.muscleGroups) ? a.template.muscleGroups : [],
          templateId:   a.template.id,
          isRestDay:    false,
        });
      }
    }

    // Check duplicates within the payload
    const dowCounts = new Map<number, number>();
    for (const p of payload) dowCounts.set(p.dayOfWeek, (dowCounts.get(p.dayOfWeek) ?? 0) + 1);
    for (const [dow, count] of dowCounts) {
      if (count > 1) { setError(`${WEEKDAY_LABELS[dow]} is assigned more than once.`); return; }
    }

    setSaving(true);
    const months = getMonthRange(month, duration);
    let totalCount = 0;
    try {
      for (const m of months) {
        const res = await calendarApi.populate({ month: m, assignments: payload, overwrite });
        totalCount += res.data.count ?? 0;
      }
      const label = months.length === 1 ? months[0] : `${months[0]} – ${months[months.length - 1]}`;
      onApplied(`Applied ${totalCount} day(s) across ${label}`);
    } catch {
      setError("Failed to populate calendar.");
    } finally {
      setSaving(false);
    }
  };

  const months = getMonthRange(month, duration);
  const rangeLabel = months.length === 1
    ? months[0]
    : `${months[0]} – ${months[months.length - 1]}`;

  return (
    <Modal open title={t("workouts.applyTemplateCalendar")} onClose={onClose} size="lg">
      <div className="space-y-5 p-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Assign workout templates to weekdays. Every matching day in the selected range will be populated.
        </p>

        {/* Duration picker */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">{t("workouts.duration")}</label>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDuration(n)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition
                  ${duration === n
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-brand-300"}`}
              >
                {n} month{n > 1 ? "s" : ""}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Range: <strong>{rangeLabel}</strong></p>
        </div>

        {assignments.map((a, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 space-y-3 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Assignment {i + 1}</span>
              {assignments.length > 1 && (
                <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 text-xs">✕ Remove</button>
              )}
            </div>

            {/* Template picker */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">{t("workouts.templateDay")}</label>
              <select
                value={a.template?.id ?? ""}
                onChange={(e) => {
                  const found = templates.find((t) => t.id === Number(e.target.value)) ?? null;
                  setRowTemplate(i, found);
                }}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              >
                <option value="">— Select template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.dayLabel || t.name}{t.muscleGroups?.length ? ` (${(t.muscleGroups as string[]).join(", ")})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Weekday checkboxes */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">{t("workouts.repeatWeekdays")}</label>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAY_LABELS.map((label, dow) => (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleWeekday(i, dow)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition
                      ${a.weekdays.has(dow)
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-brand-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addRow}
          className="text-sm text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
        >
          + Add another template
        </button>

        {/* Overwrite toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            className="w-4 h-4 accent-brand-600"
          />
          Overwrite days that already have a plan
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">{t("common.cancel")}</Button>
          <Button onClick={handleApply} loading={saving} className="flex-1">
            Populate {duration} month{duration > 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Calendar Day Modal
// ─────────────────────────────────────────────────────────────────────────────
function EditCalendarDayModal({
  date, month, current, templates, working, setWorking, onClose, onSaved,
}: {
  date: string;
  month: string;   // "YYYY-MM" — used for bulk-apply
  current: WorkoutCalendarDay | null;
  templates: WorkoutTemplate[];
  working: boolean;
  setWorking: Dispatch<SetStateAction<boolean>>;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const [isRest, setIsRest]           = useState(current?.isRestDay ?? false);
  const [workoutName, setWorkoutName] = useState(current?.workoutName ?? "");
  const [selectedTpl, setSelectedTpl] = useState<number | "">(current?.templateId ?? "");
  const [notes, setNotes]             = useState(current?.notes ?? "");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [bulkDuration, setBulkDuration] = useState(1);   // 1 | 2 | 3 months

  // Which ISO weekday (0=Mon…6=Sun) does this date fall on?
  const rawDay  = getDay(new Date(date + "T12:00:00")); // 0=Sun
  const weekday = rawDay === 0 ? 6 : rawDay - 1;        // 0=Mon…6=Sun
  const weekdayLabel = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][weekday];

  const buildPayload = () => {
    const tpl = templates.find((t) => t.id === Number(selectedTpl));
    return {
      workoutName:  isRest ? "Rest" : (workoutName.trim() || tpl?.dayLabel || tpl?.name || "Workout"),
      muscleGroups: isRest ? [] : (Array.isArray(tpl?.muscleGroups) ? tpl.muscleGroups : []),
      templateId:   isRest ? null : (selectedTpl ? Number(selectedTpl) : null),
      isRestDay:    isRest,
    };
  };

  const handleSave = async () => {
    setWorking(true);
    try {
      await calendarApi.updateDay(date, { ...buildPayload(), notes: notes.trim() || null });
      onSaved("Day updated");
    } catch { onSaved("Failed to save"); }
    finally { setWorking(false); }
  };

  const handleApplyAll = async () => {
    setBulkWorking(true);
    try {
      const p = buildPayload();
      const months = getMonthRange(month, bulkDuration);
      let total = 0;
      for (const m of months) {
        const res = await calendarApi.populate({
          month: m,
          overwrite: true,
          assignments: [{
            dayOfWeek:    weekday,
            workoutName:  p.workoutName,
            muscleGroups: p.muscleGroups,
            templateId:   p.templateId ?? undefined,
            isRestDay:    p.isRestDay,
          }],
        });
        total += res.data.count ?? 0;
      }
      const label = months.length === 1 ? months[0] : `${months[0]} – ${months[months.length - 1]}`;
      onSaved(`Applied to every ${weekdayLabel} in ${label} (${total} day${total !== 1 ? "s" : ""} updated)`);
    } catch { onSaved("Failed to apply to all days"); }
    finally { setBulkWorking(false); }
  };

  return (
    <Modal open title={`Edit — ${format(new Date(date + "T12:00:00"), "EEE, MMM d")}`} onClose={onClose}>
      <div className="space-y-4 p-1">
        {/* Rest toggle */}
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
          <input type="checkbox" checked={isRest} onChange={(e) => setIsRest(e.target.checked)}
            className="w-4 h-4 accent-brand-600" />
          😴 Mark as rest day
        </label>

        {!isRest && (
          <>
            {/* Template picker */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">Link to template (optional)</label>
              <select
                value={selectedTpl}
                onChange={(e) => {
                  setSelectedTpl(e.target.value === "" ? "" : Number(e.target.value));
                  if (e.target.value) {
                    const tpl = templates.find((t) => t.id === Number(e.target.value));
                    if (tpl) setWorkoutName(tpl.dayLabel || tpl.name);
                  }
                }}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              >
                <option value="">— None (custom) —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.dayLabel || t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Name override */}
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">Label (shown on calendar)</label>
              <Input
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder={t("workouts.workoutNamePlaceholder")}
              />
            </div>
          </>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block mb-1">{t("workouts.notesOptional")}</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("workouts.anyNotesDay")}
            rows={2}
          />
        </div>

        {/* Primary actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">{t("common.cancel")}</Button>
          <Button onClick={handleSave} loading={working} className="flex-1">{t("common.save")}</Button>
        </div>

        {/* Bulk-apply */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            🔁 Apply every {weekdayLabel} for…
          </p>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBulkDuration(n)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition
                  ${bulkDuration === n
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-brand-300"}`}
              >
                {n} month{n > 1 ? "s" : ""}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={handleApplyAll}
            loading={bulkWorking}
            className="w-full text-sm text-brand-700 border-brand-200 hover:bg-brand-50"
          >
            Apply to all {weekdayLabel}s ({bulkDuration} month{bulkDuration > 1 ? "s" : ""})
          </Button>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Overwrites every {weekdayLabel} across the selected range
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// AI Workout Builder
// ─────────────────────────────────────────────────────────────────────────────
function AIWorkoutBuilder({ onWorkoutLogged }: { onWorkoutLogged: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [muscles,  setMuscles]  = useState<string[]>([]);
  const [type,     setType]     = useState("hypertrophy");
  const [duration, setDuration] = useState(60);
  const [loading,  setLoading]  = useState(false);
  const [plan,     setPlan]     = useState<null | { name: string; exercises: Array<{ exerciseName: string; sets: number; reps: string; notes?: string }> }>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const MUSCLE_OPTS = ["Chest","Back","Shoulders","Biceps","Triceps","Legs","Glutes","Core","Full Body"];
  const TYPE_OPTS   = [
    { value: "strength",    label: _t("workouts.strength"),    icon: "🏋️" },
    { value: "hypertrophy", label: _t("workouts.hypertrophy"), icon: "📈" },
    { value: "endurance",   label: _t("workouts.endurance"),   icon: "🏃" },
    { value: "mobility",    label: _t("workouts.mobility"),    icon: "🧘" },
  ];

  const toggleMuscle = (m: string) => setMuscles((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m]);

  const generate = async () => {
    if (muscles.length === 0) { setError("Pick at least one muscle group."); return; }
    setError(""); setLoading(true); setPlan(null);
    try {
      const prompt = `Generate a ${type} workout targeting: ${muscles.join(", ")}. Duration: ~${duration} min. ${(user as any)?.injuries?.length ? `Avoid exercises for: ${(user as any).injuries.join(", ")}.` : ""} Return JSON only: { "name": "...", "exercises": [{ "exerciseName": "...", "sets": N, "reps": "N-N", "notes": "..." }] }`;
      const res = await chatApi.send({ message: prompt, agentType: "coach" });
      const text = (res.data as any).response ?? (res.data as any).message ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      const parsed = JSON.parse(match[0]);
      if (!parsed.exercises?.length) throw new Error("No exercises");
      setPlan(parsed);
    } catch (e: any) {
      setError("AI could not generate a plan. Try again or adjust your selections.");
    } finally { setLoading(false); }
  };

  const logWorkout = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await workoutsApi.create({
        name: plan.name,
        date: new Date().toISOString().split("T")[0],
        duration,
        trainingType: type,
        exercises: plan.exercises.map((e, i) => ({
          exerciseName: e.exerciseName,
          sets: e.sets,
          reps: parseInt(e.reps.split("-")[0]) || 10,
          order: i,
          notes: e.notes,
        })),
      });
      onWorkoutLogged();
    } catch { setError("Failed to save workout."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader title={t("workouts.aiBuilderTitle")} subtitle={t("workouts.pickTargets")} />

        {/* Muscle groups */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t("workouts.targetMuscleGroups")}</p>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_OPTS.map((m) => (
              <button
                key={m}
                onClick={() => toggleMuscle(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${muscles.includes(m) ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-brand-400"}`}
              >{m}</button>
            ))}
          </div>
        </div>

        {/* Training type */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t("workouts.trainingStyle")}</p>
          <div className="flex gap-2 flex-wrap">
            {TYPE_OPTS.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${type === t.value ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"}`}
              >{t.icon} {t.label}</button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Duration: {duration} min</p>
          <input type="range" min={20} max={120} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-3">{error}</p>}

        <Button loading={loading} onClick={generate} className="w-full">
          {loading ? "Generating..." : "Generate Workout"}
        </Button>
      </Card>

      {/* Generated plan */}
      {plan && (
        <Card>
          <CardHeader title={plan.name} subtitle={`${plan.exercises.length} exercises · ${type} · ${muscles.join(", ")}`} />
          <div className="space-y-2 mb-4">
            {plan.exercises.map((ex, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{ex.exerciseName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{ex.sets} sets × {ex.reps} reps{ex.notes ? ` · ${ex.notes}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setPlan(null); generate(); }}>{t("workouts.regenerate")}</Button>
            <Button loading={saving} className="flex-1" onClick={logWorkout}>{t("workouts.logThisWorkout")}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function WorkoutsPage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [tab, setTab] = useState<"history" | "calendar" | "templates" | "ai-build">(
    () => (sessionStorage.getItem("workouts_tab") as "history" | "calendar" | "templates" | "ai-build") ?? "calendar"
  );
  const switchTab = (tabKey: "history" | "calendar" | "templates" | "ai-build") => {
    sessionStorage.setItem("workouts_tab", tabKey);
    setTab(tabKey);
  };
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Workout | null>(null);
  const [editing, setEditing] = useState<Workout | null>(null);
  const toast = useToast();

  // Training days — SINGLE SOURCE OF TRUTH: user.trainingDaysPerWeek from auth store
  // Never use local state for the value; derive from store so Profile ↔ Workouts always match
  const trainingDays = user?.trainingDaysPerWeek ?? 4;
  const [activeGoalId, setActiveGoalId]   = useState<number | null>(null);
  const [editingDays,  setEditingDays]    = useState(false);
  const [daysInput,    setDaysInput]      = useState(String(trainingDays));

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await workoutsApi.getAll(p);
      setWorkouts(res.data.workouts);
      setTotal(res.data.total);
      setPage(res.data.page);
      setPages(res.data.pages);
    } finally { setLoading(false); }
  }, []);

  // Load all workouts for calendar (high limit)
  const loadAll = useCallback(async () => {
    try {
      const res = await workoutsApi.getAll(1, 500);
      setAllWorkouts(res.data.workouts);
    } catch { /* silent */ }
  }, []);

  // Load active goal ID on mount (still needed for calorie goal updates)
  useEffect(() => {
    calorieGoalsApi.getActive().then((res) => {
      if (res.data.goal?.id) setActiveGoalId(res.data.goal.id);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep daysInput in sync when the auth store value changes from outside (e.g. Profile saves)
  // Only update daysInput when NOT actively editing, and only show toast when value actually changed
  const prevDaysRef = useRef<number | null>(null);
  useEffect(() => {
    const n = user?.trainingDaysPerWeek ?? 4;
    if (!editingDays) setDaysInput(String(n));
    if (prevDaysRef.current !== null && prevDaysRef.current !== n) {
      toast.show(`Training days updated to ${n} 💪`);
    }
    prevDaysRef.current = n;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.trainingDaysPerWeek]);

  // Save training days — writes to BOTH user profile (auth store) AND calorie goal
  // This is the single write path from the Workouts tab, ensuring Profile always stays in sync
  const saveTrainingDays = async () => {
    const n = Math.max(1, Math.min(7, Number(daysInput) || trainingDays));
    setEditingDays(false);
    if (n === trainingDays) { setDaysInput(String(n)); return; } // no change
    try {
      const res = await usersApi.updateProfile({ trainingDaysPerWeek: n } as any);
      updateUser(res.data.user);                  // ← updates auth store → Profile re-syncs
      if (activeGoalId) {
        calorieGoalsApi.update(activeGoalId, { trainingDaysPerWeek: n }).catch(() => {});
      }
      toast.show(`Training days set to ${n} 💪`);
    } catch {
      setDaysInput(String(trainingDays));          // revert input on error
    }
  };

  // Callback for TemplatesTab — called after a workout is started from a template
  const onWorkoutStarted = useCallback(() => {
    load(1);
    loadAll();
    switchTab("history");
    toast.show("Workout logged from template!");
  }, [load, loadAll]);

  useEffect(() => { load(1); loadAll(); }, [load, loadAll]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{t("workouts.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-1">
            {tab === "history"   ? `${total} workout${total !== 1 ? "s" : ""} ${t("workouts.history").toLowerCase()}`
            : tab === "calendar" ? t("workouts.calendar")
            : tab === "ai-build" ? t("workouts.aiBuilder")
            :                      "Pre-built and custom workout splits"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Training days per week — clearly editable */}
          {editingDays ? (
            <div className="flex items-center gap-2 bg-brand-50 dark:bg-gray-700/60 border border-brand-300 dark:border-gray-600 rounded-xl px-3 py-1.5">
              <span className="text-sm text-brand-700 font-medium">🗓️ Days/week:</span>
              <input
                type="number" min={1} max={7}
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                onBlur={saveTrainingDays}
                onKeyDown={(e) => e.key === "Enter" && saveTrainingDays()}
                className="w-10 text-center text-sm font-bold border border-brand-300 rounded-lg px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                autoFocus
              />
              <button onClick={saveTrainingDays}
                className="text-xs bg-brand-600 text-white font-semibold px-2 py-0.5 rounded-lg hover:bg-brand-700">
                Save
              </button>
              <button onClick={() => setEditingDays(false)}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 dark:text-gray-300">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingDays(true)}
              title={t("workouts.clickTrainingDays")}
              className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-3 py-1.5 hover:bg-brand-100 hover:border-brand-400 transition group"
            >
              <span className="text-sm text-brand-700 font-medium hidden sm:inline">🗓️ Training days/week</span>
              <span className="text-sm text-brand-700 font-medium sm:hidden">🗓️</span>
              <span className="text-sm font-bold text-brand-900 bg-brand-200 px-2 py-0.5 rounded-lg group-hover:bg-brand-300 transition">
                {trainingDays}
              </span>
              <span className="text-xs text-brand-500 group-hover:text-brand-700">✏️</span>
            </button>
          )}
          {tab === "history" && (
            <Button onClick={() => setShowForm(true)}>+ {t("workouts.logWorkout")}</Button>
          )}
        </div>
      </div>

      {/* Main tabs — full width on mobile */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-fit">
        {([
          { key: "history",   label: `🏋️ ${t("workouts.history")}` },
          { key: "calendar",  label: `📅 ${t("workouts.calendar")}` },
          { key: "templates", label: `📋 ${t("workouts.templates")}` },
          { key: "ai-build",  label: "🤖 AI Build" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === key ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Calendar tab */}
      {tab === "calendar" && (
        <Card className="p-4">
          <CalendarTab allWorkouts={allWorkouts} trainingDays={trainingDays} />
        </Card>
      )}

      {/* History tab */}
      {tab === "history" && (
        loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : workouts.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-5xl mb-4">🏋️</div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t("workouts.noWorkouts")}</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{t("workouts.logFirst")}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setShowForm(true)}>{t("workouts.logWorkout")}</Button>
              <Button variant="secondary" onClick={() => switchTab("templates")}>{t("workouts.templates")}</Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Cardio + Weights combo suggestions */}
            <CardioSuggestionsPanel goal={user?.goal} />

            <div className="space-y-3">
              {workouts.map((w) => (
                <Card key={w.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(w)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 text-lg font-bold shrink-0">
                        {w.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">{w.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">
                          {format(parseISO(w.date), "MMM d, yyyy")} · {w.duration} min · {w.exercises.length} exercises
                        </p>
                        {w.exercises.length > 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {w.exercises.slice(0, 3).map((e) => e.exerciseName).join(" · ")}
                            {w.exercises.length > 3 ? ` +${w.exercises.length - 3} more` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {w.trainingType && (() => {
                        const tt = TRAINING_TYPES.find((t) => t.value === w.trainingType);
                        return tt ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tt.color}`}>
                            {tt.icon} {tt.label}
                          </span>
                        ) : null;
                      })()}
                      {w.caloriesBurned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 text-xs font-semibold">
                          🔥 {Math.round(w.caloriesBurned)} kcal
                        </span>
                      ) : null}
                      <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">
                        {w.exercises.reduce((s, e) => s + e.sets * e.reps * (e.weight ?? 0), 0).toLocaleString()} kg vol
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex justify-center gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</Button>
                <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 py-1.5">Page {page} of {pages}</span>
                <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => load(page + 1)}>{t("workouts.nextBtn")}</Button>
              </div>
            )}
          </>
        )
      )}

      {/* Templates tab */}
      {tab === "templates" && <TemplatesTab onWorkoutStarted={onWorkoutStarted} trainingDays={trainingDays} />}

      {/* AI Workout Builder tab */}
      {tab === "ai-build" && <AIWorkoutBuilder onWorkoutLogged={() => { switchTab("history"); }} />}

      {/* Create modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={t("workouts.logWorkout")} size="lg">
        <WorkoutForm
          onSave={() => { setShowForm(false); load(1); loadAll(); toast.show("Workout logged!"); }}
          onClose={() => setShowForm(false)}
        />
      </Modal>

      {/* Detail modal */}
      <Modal open={!!selected && !editing} onClose={() => setSelected(null)} title={selected?.name} size="lg">
        {selected && (
          <WorkoutDetail
            workout={selected}
            onClose={() => setSelected(null)}
            onEdit={() => { setEditing(selected); setSelected(null); }}
            onDelete={() => { setSelected(null); load(page > 1 && workouts.length === 1 ? page - 1 : page); toast.show("Workout deleted."); }}
            onRefresh={() => load(page)}
            onToast={toast.show}
          />
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={t("workouts.editWorkout")} size="md">
        {editing && (
          <EditWorkoutForm
            workout={editing}
            onSave={() => { setEditing(null); load(page); toast.show("Workout updated!"); }}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>

      <ToastBanner msg={toast.msg} />
    </div>
  );
}
