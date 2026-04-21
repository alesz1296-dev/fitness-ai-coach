import { useState, useEffect, useCallback } from "react";
import { format, parseISO, addDays, subDays } from "date-fns";
import { foodApi, searchApi } from "../../api";
import type { FoodLog, FoodTotals } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";

const MEAL_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch",     label: "Lunch" },
  { value: "dinner",    label: "Dinner" },
  { value: "snack",     label: "Snack" },
];

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎",
};

// ── Food search combobox ──────────────────────────────────────────────────────
function FoodSearch({ onSelect }: { onSelect: (item: any) => void }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      searchApi.foods(query).then((r) => { setResults(r.data.results); setOpen(true); });
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search food (e.g. chicken breast, oats)…"
        label="Search Food"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {results.map((f) => (
            <li
              key={f.id}
              onMouseDown={() => { onSelect(f); setQuery(""); setOpen(false); }}
              className="px-4 py-2.5 hover:bg-brand-50 cursor-pointer"
            >
              <p className="text-sm font-medium text-gray-800">{f.name}</p>
              <p className="text-xs text-gray-400">{Math.round(f.calories * f.defaultQty / 100)} kcal · {f.defaultQty}{f.defaultUnit} | P:{Math.round(f.protein * f.defaultQty / 100)}g C:{Math.round(f.carbs * f.defaultQty / 100)}g F:{Math.round(f.fats * f.defaultQty / 100)}g</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Log food form ─────────────────────────────────────────────────────────────
function LogFoodForm({ selectedDate, onSave, onClose, editItem }: {
  selectedDate: string;
  onSave: () => void;
  onClose: () => void;
  editItem?: FoodLog | null;
}) {
  const [foodName, setFoodName] = useState(editItem?.foodName ?? "");
  const [calories, setCalories] = useState(String(editItem?.calories ?? ""));
  const [protein,  setProtein]  = useState(String(editItem?.protein  ?? ""));
  const [carbs,    setCarbs]    = useState(String(editItem?.carbs    ?? ""));
  const [fats,     setFats]     = useState(String(editItem?.fats     ?? ""));
  const [quantity, setQuantity] = useState(String(editItem?.quantity ?? "100"));
  const [unit,     setUnit]     = useState(editItem?.unit ?? "g");
  const [meal,     setMeal]     = useState<string>(editItem?.meal ?? "");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const fillFromSearch = (item: any) => {
    const qty = item.defaultQty;
    setFoodName(item.name);
    setQuantity(String(qty));
    setUnit(item.defaultUnit);
    setCalories(String(Math.round(item.calories * qty / 100)));
    setProtein(String(Math.round(item.protein  * qty / 100)));
    setCarbs(String(Math.round(item.carbs    * qty / 100)));
    setFats(String(Math.round(item.fats     * qty / 100)));
  };

  const submit = async () => {
    if (!foodName.trim() || !calories || !quantity || !unit) {
      setError("Food name, calories, quantity, and unit are required"); return;
    }
    setLoading(true); setError("");
    try {
      const payload = {
        foodName: foodName.trim(),
        calories: Number(calories),
        protein:  protein  ? Number(protein)  : undefined,
        carbs:    carbs    ? Number(carbs)    : undefined,
        fats:     fats     ? Number(fats)     : undefined,
        quantity: Number(quantity),
        unit,
        meal:     meal || undefined,
        date:     selectedDate,
      };
      if (editItem) { await foodApi.update(editItem.id, payload); }
      else          { await foodApi.log(payload); }
      onSave();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to save");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {!editItem && <FoodSearch onSelect={fillFromSearch} />}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

      <Input label="Food Name" value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="e.g. Chicken Breast" />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <Input label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, ml, cups…" />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Input label="Calories" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} />
        <Input label="Protein (g)" type="number" value={protein} onChange={(e) => setProtein(e.target.value)} />
        <Input label="Carbs (g)" type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
        <Input label="Fats (g)" type="number" value={fats} onChange={(e) => setFats(e.target.value)} />
      </div>

      <Select
        label="Meal"
        value={meal}
        onChange={(e) => setMeal(e.target.value)}
        options={MEAL_OPTIONS}
        placeholder="Select meal (optional)"
      />

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={loading} onClick={submit}>{editItem ? "Save Changes" : "Log Food"}</Button>
      </div>
    </div>
  );
}

// ── Macro ring ────────────────────────────────────────────────────────────────
function MacroRing({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
          {Math.round(pct)}%
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{Math.round(value)}g</p>
    </div>
  );
}

// ── Main Nutrition page ───────────────────────────────────────────────────────
export default function NutritionPage() {
  const [date,     setDate]     = useState(new Date().toISOString().split("T")[0]);
  const [logs,     setLogs]     = useState<FoodLog[]>([]);
  const [totals,   setTotals]   = useState<FoodTotals>({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<FoodLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await foodApi.getToday(date);
      setLogs(res.data.logs);
      setTotals(res.data.totals);
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const deleteLog = async (id: number) => {
    if (!confirm("Remove this entry?")) return;
    await foodApi.delete(id);
    load();
  };

  const totalMacroG = totals.protein + totals.carbs + totals.fats;

  // Group by meal
  const grouped: Record<string, FoodLog[]> = {};
  for (const log of logs) {
    const key = log.meal ?? "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(log);
  }
  const mealOrder = ["breakfast", "lunch", "dinner", "snack", "other"];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header + Date nav */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nutrition</h1>
          <p className="text-gray-500 text-sm mt-1">{format(parseISO(date), "EEEE, MMMM d")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDate(subDays(parseISO(date), 1).toISOString().split("T")[0])}>←</Button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <Button variant="secondary" size="sm"
            disabled={date >= new Date().toISOString().split("T")[0]}
            onClick={() => setDate(addDays(parseISO(date), 1).toISOString().split("T")[0])}>→</Button>
          <Button onClick={() => setShowForm(true)}>+ Log Food</Button>
        </div>
      </div>

      {/* Daily summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calorie count */}
        <Card className="lg:col-span-1">
          <CardHeader title="Calories" />
          <div className="text-center py-2">
            <p className="text-4xl font-bold text-gray-900">{Math.round(totals.calories)}</p>
            <p className="text-sm text-gray-400 mt-1">kcal consumed</p>
          </div>
          <div className="flex justify-around pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-400">Entries</p>
              <p className="font-bold text-gray-800">{logs.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Per meal</p>
              <p className="font-bold text-gray-800">
                {logs.length > 0 ? Math.round(totals.calories / Object.keys(grouped).length) : "—"}
              </p>
            </div>
          </div>
        </Card>

        {/* Macro breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader title="Macronutrients" />
          {totalMacroG > 0 ? (
            <div className="flex items-center justify-around">
              <MacroRing label="Protein" value={totals.protein} total={totalMacroG} color="#3b82f6" />
              <MacroRing label="Carbs"   value={totals.carbs}   total={totalMacroG} color="#f59e0b" />
              <MacroRing label="Fats"    value={totals.fats}    total={totalMacroG} color="#ef4444" />
              <div className="text-center">
                <p className="text-xs text-gray-400">Calories from macros</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {Math.round(totals.protein * 4 + totals.carbs * 4 + totals.fats * 9)}
                </p>
                <p className="text-xs text-gray-400">kcal</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">Log food to see macro breakdown</div>
          )}
        </Card>
      </div>

      {/* Food log by meal */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>
      ) : logs.length === 0 ? (
        <Card className="text-center py-14">
          <div className="text-5xl mb-3">🥗</div>
          <h3 className="font-semibold text-gray-800 mb-2">Nothing logged yet</h3>
          <p className="text-sm text-gray-400 mb-4">Log your first meal to track your nutrition</p>
          <Button onClick={() => setShowForm(true)}>Log First Meal</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {mealOrder
            .filter((m) => grouped[m])
            .map((meal) => (
              <Card key={meal}>
                <CardHeader
                  title={`${MEAL_ICONS[meal] ?? "🍽️"} ${meal === "other" ? "Other" : meal.charAt(0).toUpperCase() + meal.slice(1)}`}
                  subtitle={`${Math.round(grouped[meal].reduce((s, l) => s + l.calories, 0))} kcal`}
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 text-xs text-gray-400 font-medium">Food</th>
                        <th className="text-right py-2 text-xs text-gray-400 font-medium">Qty</th>
                        <th className="text-right py-2 text-xs text-gray-400 font-medium">Kcal</th>
                        <th className="text-right py-2 text-xs text-gray-400 font-medium">P</th>
                        <th className="text-right py-2 text-xs text-gray-400 font-medium">C</th>
                        <th className="text-right py-2 text-xs text-gray-400 font-medium">F</th>
                        <th className="text-right py-2 text-xs text-gray-400 font-medium w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[meal].map((log) => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 font-medium text-gray-800">{log.foodName}</td>
                          <td className="py-2.5 text-right text-gray-500">{log.quantity}{log.unit}</td>
                          <td className="py-2.5 text-right font-semibold text-gray-800">{Math.round(log.calories)}</td>
                          <td className="py-2.5 text-right text-blue-600">{log.protein != null ? Math.round(log.protein) : "—"}</td>
                          <td className="py-2.5 text-right text-yellow-600">{log.carbs  != null ? Math.round(log.carbs)   : "—"}</td>
                          <td className="py-2.5 text-right text-red-600">{log.fats    != null ? Math.round(log.fats)    : "—"}</td>
                          <td className="py-2.5 text-right">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => { setEditItem(log); setShowForm(true); }}
                                className="text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">✏️</button>
                              <button onClick={() => deleteLog(log.id)}
                                className="text-xs px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Log / Edit modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        title={editItem ? "Edit Food Entry" : "Log Food"}
        size="md"
      >
        <LogFoodForm
          selectedDate={date}
          editItem={editItem}
          onSave={() => { setShowForm(false); setEditItem(null); load(); }}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      </Modal>
    </div>
  );
}
