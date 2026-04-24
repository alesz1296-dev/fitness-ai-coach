import { useState, useEffect, useCallback } from "react";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { mealPlansApi, searchApi } from "../../api";
import type { MealPlan, MealPlanDay, MealPlanEntry } from "../../types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";

// ── Constants ─────────────────────────────────────────────────────────────────
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = typeof MEALS[number];

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: "🌅",
  lunch:     "☀️",
  dinner:    "🌙",
  snack:     "🍎",
};

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "border-l-amber-400",
  lunch:     "border-l-green-400",
  dinner:    "border-l-indigo-400",
  snack:     "border-l-pink-400",
};

function getMondayOfWeek(date: Date): string {
  const d = startOfWeek(date, { weekStartsOn: 1 });
  return format(d, "yyyy-MM-dd");
}

// ── Macro summary bar ────────────────────────────────────────────────────────
function MacroBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-sm font-bold ${color}`}>{Math.round(value)}{label === "kcal" ? "" : "g"}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

// ── Day totals ────────────────────────────────────────────────────────────────
function dayTotals(day: MealPlanDay) {
  return day.entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein:  acc.protein  + e.protein,
      carbs:    acc.carbs    + e.carbs,
      fats:     acc.fats     + e.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

// ── Food search modal ─────────────────────────────────────────────────────────
function FoodSearchModal({
  onSelect,
  onClose,
}: {
  onSelect: (food: any, meal: MealType) => void;
  onClose: () => void;
}) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [meal, setMeal]         = useState<MealType>("breakfast");
  const [qty, setQty]           = useState("100");
  const [unit, setUnit]         = useState("g");
  const [selected, setSelected] = useState<any | null>(null);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchApi.foods(query, 20);
      setResults(res.data.results);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (query.length > 1) {
      const t = setTimeout(search, 400);
      return () => clearTimeout(t);
    } else {
      setResults([]);
    }
  }, [query, search]);

  const scale = selected ? (Number(qty) / (selected.servingSize || 100)) : 1;

  const handleAdd = () => {
    if (!selected) return;
    onSelect(
      {
        foodName: selected.name,
        calories: Math.round(selected.calories * scale),
        protein:  Math.round((selected.protein  ?? 0) * scale * 10) / 10,
        carbs:    Math.round((selected.carbs     ?? 0) * scale * 10) / 10,
        fats:     Math.round((selected.fats      ?? 0) * scale * 10) / 10,
        quantity: Number(qty),
        unit,
      },
      meal
    );
    setSelected(null);
    setQuery("");
    setResults([]);
  };

  return (
    <Modal open={true} title="Add Food to Plan" onClose={onClose}>
      <div className="space-y-4">
        {/* Meal selector */}
        <div className="flex gap-2">
          {MEALS.map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-medium capitalize border transition ${
                meal === m
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-gray-200 text-gray-600 hover:border-brand-300"
              }`}
            >
              {MEAL_ICONS[m]} {m}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            label="Search food"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. chicken breast, oats…"
          />
          {loading && (
            <div className="absolute right-3 top-9">
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && !selected && (
          <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => { setSelected(r); setQuery(r.name); setResults([]); }}
                className="w-full text-left px-3 py-2 hover:bg-brand-50 flex justify-between items-center"
              >
                <span className="text-sm font-medium text-gray-800">{r.name}</span>
                <span className="text-xs text-gray-400 ml-2 shrink-0">{r.calories} kcal / {r.servingSize}g</span>
              </button>
            ))}
          </div>
        )}

        {/* Quantity + unit */}
        {selected && (
          <div className="bg-brand-50 rounded-xl p-3 space-y-3">
            <p className="font-semibold text-sm text-brand-800">{selected.name}</p>
            <div className="flex gap-2">
              <Input
                label="Quantity"
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="flex-1"
              />
              <Input
                label="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="flex-1"
                placeholder="g / ml / serving"
              />
            </div>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>🔥 {Math.round(selected.calories * scale)} kcal</span>
              <span>💪 {Math.round((selected.protein ?? 0) * scale)}g P</span>
              <span>🌾 {Math.round((selected.carbs ?? 0) * scale)}g C</span>
              <span>🥑 {Math.round((selected.fats ?? 0) * scale)}g F</span>
            </div>
            <Button onClick={handleAdd} className="w-full">
              Add to {meal.charAt(0).toUpperCase() + meal.slice(1)}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Entry row ─────────────────────────────────────────────────────────────────
function EntryRow({
  entry,
  onDelete,
}: {
  entry: MealPlanEntry;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate">{entry.foodName}</p>
        <p className="text-xs text-gray-400">
          {entry.quantity}{entry.unit} · {Math.round(entry.calories)} kcal
          <span className="ml-1.5 text-purple-500">{Math.round(entry.protein)}P</span>
          <span className="ml-1 text-green-500">{Math.round(entry.carbs)}C</span>
          <span className="ml-1 text-yellow-500">{Math.round(entry.fats)}F</span>
        </p>
      </div>
      <button
        onClick={onDelete}
        className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

// ── Meal section ─────────────────────────────────────────────────────────────
function MealSection({
  meal,
  entries,
  onAddClick,
  onDeleteEntry,
}: {
  meal: MealType;
  entries: MealPlanEntry[];
  onAddClick: () => void;
  onDeleteEntry: (id: number) => void;
}) {
  const total = entries.reduce((s, e) => s + e.calories, 0);
  return (
    <div className={`border-l-4 ${MEAL_COLORS[meal]} pl-3 py-1`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {MEAL_ICONS[meal]} {meal}
          {entries.length > 0 && (
            <span className="ml-1.5 text-gray-400 normal-case font-normal">
              {Math.round(total)} kcal
            </span>
          )}
        </span>
        <button
          onClick={onAddClick}
          className="text-brand-500 hover:text-brand-700 text-xs font-medium"
        >
          + Add
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-300 italic">No foods yet</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} onDelete={() => onDeleteEntry(e.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Day column ────────────────────────────────────────────────────────────────
function DayColumn({
  day,
  dayName,
  date,
  isToday,
  onAddFood,
  onDeleteEntry,
}: {
  day: MealPlanDay;
  dayName: string;
  date: Date;
  isToday: boolean;
  onAddFood: (meal: MealType) => void;
  onDeleteEntry: (entryId: number) => void;
}) {
  const totals = dayTotals(day);

  return (
    <div className={`min-w-[260px] md:min-w-0 flex-1 rounded-2xl border ${
      isToday ? "border-brand-400 bg-brand-50/30" : "border-gray-100 bg-white"
    } p-3 space-y-3`}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${isToday ? "text-brand-700" : "text-gray-800"}`}>
            {dayName}
          </span>
          {isToday && <span className="text-xs bg-brand-600 text-white px-1.5 py-0.5 rounded-full">Today</span>}
        </div>
        <p className="text-xs text-gray-400">{format(date, "MMM d")}</p>
      </div>

      {/* Meals */}
      <div className="space-y-3">
        {MEALS.map((meal) => {
          const entries = day.entries.filter((e) => e.meal === meal);
          return (
            <MealSection
              key={meal}
              meal={meal}
              entries={entries}
              onAddClick={() => onAddFood(meal)}
              onDeleteEntry={onDeleteEntry}
            />
          );
        })}
      </div>

      {/* Daily totals */}
      {day.entries.length > 0 && (
        <div className="border-t border-gray-100 pt-2 grid grid-cols-4 gap-1">
          <MacroBar label="kcal" value={totals.calories} color="text-orange-600" />
          <MacroBar label="protein" value={totals.protein} color="text-purple-600" />
          <MacroBar label="carbs" value={totals.carbs} color="text-green-600" />
          <MacroBar label="fat" value={totals.fats} color="text-yellow-600" />
        </div>
      )}
    </div>
  );
}

// ── Plan list ─────────────────────────────────────────────────────────────────
function PlanList({
  plans,
  activePlanId,
  onSelect,
  onCreate,
  onDelete,
  loading,
}: {
  plans: MealPlan[];
  activePlanId: number | null;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onDelete: (id: number) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">My Plans</h2>
        <Button size="sm" onClick={onCreate}>+ New Plan</Button>
      </div>
      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : plans.length === 0 ? (
        <div className="text-sm text-gray-400 italic">No plans yet. Create your first!</div>
      ) : (
        plans.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer border transition ${
              activePlanId === p.id
                ? "border-brand-400 bg-brand-50"
                : "border-gray-100 hover:border-gray-200 bg-white"
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-800">{p.name}</p>
              <p className="text-xs text-gray-400">Week of {p.weekStart}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
              className="text-gray-300 hover:text-red-400 text-lg ml-2"
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// ── Create plan modal ─────────────────────────────────────────────────────────
function CreatePlanModal({ onSave, onClose }: { onSave: (name: string, weekStart: string) => void; onClose: () => void }) {
  const [name, setName]           = useState("My Meal Plan");
  const [weekStart, setWeekStart] = useState(getMondayOfWeek(new Date()));

  return (
    <Modal open={true} title="Create Meal Plan" onClose={onClose}>
      <div className="space-y-4">
        <Input label="Plan name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cut Week 1" />
        <Input
          label="Week starting (Monday)"
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
        />
        <Button className="w-full" onClick={() => onSave(name, weekStart)} disabled={!name || !weekStart}>
          Create Plan
        </Button>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MealPlannerPage() {
  const [plans, setPlans]               = useState<MealPlan[]>([]);
  const [activePlan, setActivePlan]     = useState<MealPlan | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingPlan, setLoadingPlan]   = useState(false);
  const [showCreate, setShowCreate]     = useState(false);
  const [addFor, setAddFor]             = useState<{ dayId: number; defaultMeal: MealType } | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  // ── Load plan list ─────────────────────────────────────────────────────────
  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await mealPlansApi.getAll();
      setPlans(res.data.plans);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  // ── Select a plan ──────────────────────────────────────────────────────────
  const selectPlan = useCallback(async (id: number) => {
    setLoadingPlan(true);
    try {
      const res = await mealPlansApi.getOne(id);
      setActivePlan(res.data.plan);
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  // ── Create plan ────────────────────────────────────────────────────────────
  const handleCreate = async (name: string, weekStart: string) => {
    const res = await mealPlansApi.create({ name, weekStart });
    setPlans((prev) => [res.data.plan, ...prev]);
    setActivePlan(res.data.plan);
    setShowCreate(false);
  };

  // ── Delete plan ────────────────────────────────────────────────────────────
  const handleDeletePlan = async (id: number) => {
    if (!confirm("Delete this plan?")) return;
    await mealPlansApi.delete(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    if (activePlan?.id === id) setActivePlan(null);
  };

  // ── Add food entry ─────────────────────────────────────────────────────────
  const handleAddFood = async (food: any, meal: MealType) => {
    if (!addFor || !activePlan) return;
    const res = await mealPlansApi.addEntry(activePlan.id, addFor.dayId, { ...food, meal });
    // Update plan in state
    setActivePlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.id === addFor.dayId
            ? { ...d, entries: [...d.entries, res.data.entry] }
            : d
        ),
      };
    });
    setAddFor(null);
  };

  // ── Delete entry ───────────────────────────────────────────────────────────
  const handleDeleteEntry = async (dayId: number, entryId: number) => {
    if (!activePlan) return;
    await mealPlansApi.deleteEntry(activePlan.id, entryId);
    setActivePlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.id === dayId
            ? { ...d, entries: d.entries.filter((e) => e.id !== entryId) }
            : d
        ),
      };
    });
  };

  // ── Weekly plan dates ──────────────────────────────────────────────────────
  const weekDates = activePlan
    ? Array.from({ length: 7 }, (_, i) =>
        addDays(parseISO(activePlan.weekStart), i)
      )
    : [];

  // ── Weekly totals ──────────────────────────────────────────────────────────
  const weeklyTotals = activePlan?.days.reduce(
    (acc, d) => {
      const t = dayTotals(d);
      return {
        calories: acc.calories + t.calories,
        protein:  acc.protein  + t.protein,
        carbs:    acc.carbs    + t.carbs,
        fats:     acc.fats     + t.fats,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const avgCalories = weeklyTotals && activePlan?.days.length
    ? weeklyTotals.calories / 7
    : 0;

  return (
    <div className="p-4 md:p-6 max-w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🥗 Meal Planner</h1>
        <p className="text-gray-500 text-sm mt-1">
          Plan your meals week by week — build a template, track macros, stay on goal.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: plan list */}
        <div className="lg:w-64 shrink-0">
          <Card className="p-4">
            <PlanList
              plans={plans}
              activePlanId={activePlan?.id ?? null}
              onSelect={selectPlan}
              onCreate={() => setShowCreate(true)}
              onDelete={handleDeletePlan}
              loading={loadingPlans}
            />
          </Card>
        </div>

        {/* Main: plan editor */}
        <div className="flex-1 min-w-0">
          {!activePlan ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <span className="text-5xl mb-4">📅</span>
              <p className="text-gray-500">Select a plan or create a new one</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>+ New Plan</Button>
            </div>
          ) : loadingPlan ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Plan header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{activePlan.name}</h2>
                  <p className="text-sm text-gray-400">
                    {format(parseISO(activePlan.weekStart), "MMM d")} — {format(addDays(parseISO(activePlan.weekStart), 6), "MMM d, yyyy")}
                  </p>
                </div>
                {weeklyTotals && weeklyTotals.calories > 0 && (
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-sm font-bold text-orange-600">{Math.round(avgCalories)}</div>
                      <div className="text-xs text-gray-400">avg kcal/day</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-purple-600">{Math.round(weeklyTotals.protein / 7)}g</div>
                      <div className="text-xs text-gray-400">avg protein</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Day columns — horizontal scroll on mobile */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {activePlan.days.map((day, i) => {
                  const date = weekDates[i];
                  const dateStr = date ? format(date, "yyyy-MM-dd") : "";
                  return (
                    <DayColumn
                      key={day.id}
                      day={day}
                      dayName={DAY_NAMES[day.dayIndex]}
                      date={date ?? new Date()}
                      isToday={dateStr === today}
                      onAddFood={(meal) => setAddFor({ dayId: day.id, defaultMeal: meal })}
                      onDeleteEntry={(entryId) => handleDeleteEntry(day.id, entryId)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreatePlanModal onSave={handleCreate} onClose={() => setShowCreate(false)} />
      )}
      {addFor && (
        <FoodSearchModal
          onSelect={handleAddFood}
          onClose={() => setAddFor(null)}
        />
      )}
    </div>
  );
}
