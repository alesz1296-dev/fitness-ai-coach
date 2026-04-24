import { useState, useEffect, useRef, useCallback } from "react";
import { format, parseISO, addDays, subDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { foodApi, chatApi, searchApi, calorieGoalsApi } from "../../api";
import type { FoodLog, FoodTotals, CalorieGoal } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";

const MEAL_OPTIONS = [
  { value: "breakfast", label: "🌅 Breakfast" },
  { value: "lunch",     label: "☀️  Lunch" },
  { value: "dinner",    label: "🌙 Dinner" },
  { value: "snack",     label: "🍎 Snack" },
];

// Cooking oil presets — kcal and fat grams added on top of the food's macros
const COOKING_OILS: Record<string, { label: string; kcal: number; fat: number }> = {
  none:          { label: "No oil",             kcal: 0,   fat: 0    },
  spray:         { label: "Spray oil (~1 sec)", kcal: 10,  fat: 1.1  },
  olive_tsp:     { label: "Olive oil – 1 tsp",  kcal: 40,  fat: 4.5  },
  olive_tbsp:    { label: "Olive oil – 1 tbsp", kcal: 119, fat: 13.4 },
  oil_tsp:       { label: "Oil – 1 tsp",        kcal: 35,  fat: 4.0  },
  oil_tbsp:      { label: "Oil – 1 tbsp",       kcal: 106, fat: 12.0 },
};

// Breading presets — kcal and carbs added on top of the food's macros (per serving coated)
const BREADING_OPTIONS: Record<string, { label: string; kcal: number; carbs: number; fat: number }> = {
  none:          { label: "No breading",                  kcal: 0,  carbs: 0,  fat: 0   },
  flour_light:   { label: "Flour coat (light dusting)",   kcal: 28, carbs: 6,  fat: 0.3 },
  breadcrumbs:   { label: "Breadcrumbs (standard)",       kcal: 65, carbs: 13, fat: 1   },
  panko:         { label: "Panko breadcrumbs",            kcal: 60, carbs: 12, fat: 0.8 },
  beer_batter:   { label: "Beer batter",                  kcal: 90, carbs: 16, fat: 3   },
  tempura:       { label: "Tempura batter",               kcal: 75, carbs: 14, fat: 2.5 },
  cornmeal:      { label: "Cornmeal / polenta crust",     kcal: 55, carbs: 12, fat: 0.5 },
};

// Quantity reference — common household measures → approximate grams
const UNIT_REFERENCE: { unit: string; approxG: number; note: string }[] = [
  { unit: "1 teaspoon (tsp)",   approxG: 5,   note: "liquids / powders" },
  { unit: "1 tablespoon (tbsp)",approxG: 15,  note: "liquids / powders" },
  { unit: "1 cup",              approxG: 240, note: "liquids ≈ 240 ml; flour ≈ 120g; oats ≈ 90g" },
  { unit: "1 bowl",             approxG: 300, note: "cereal/soup bowl — varies 250–400 g" },
  { unit: "1 glass",            approxG: 250, note: "standard drinking glass ≈ 250 ml" },
  { unit: "1 handful",          approxG: 35,  note: "nuts/seeds — small hand ~30g, large ~40g" },
  { unit: "1 scoop (ice cream)",approxG: 90,  note: "standard ice-cream scoop" },
  { unit: "1 scoop (protein)",  approxG: 30,  note: "typical protein powder scoop" },
  { unit: "1 plate (main)",     approxG: 350, note: "full meal plate — varies widely" },
  { unit: "1 slice (bread)",    approxG: 30,  note: "standard sandwich slice" },
  { unit: "1 slice (cake/pie)", approxG: 100, note: "roughly 1/8 of a 9-inch cake" },
  { unit: "1 egg (large)",      approxG: 60,  note: "whole egg with shell ≈ 60g; shelled ≈ 50g" },
  { unit: "1 can (tuna/beans)", approxG: 240, note: "drained net weight ≈ 150–170g" },
];

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calculate scaled macros from food DB values.
 * The DB stores all nutrition per 100g.
 * - For gram / ml units: scale linearly against 100.
 * - For count-based units (slices, large, medium, cups…): treat the DB value
 *   as the nutrition for `defaultQty` units and scale against that.
 */
function calcMacro(
  valuePer100g: number,
  qty: number,
  unit: string,
  defaultQty: number,
): number {
  const isWeightUnit = /^(g|ml|kg|oz|lb)$/i.test(unit.trim());
  return isWeightUnit
    ? Math.round(valuePer100g * qty / 100)
    : Math.round(valuePer100g * qty / defaultQty);
}

// ── Food tag filter chips ─────────────────────────────────────────────────────
const TAG_FILTERS = [
  { tag: "",             label: "All",          emoji: "🍽️" },
  { tag: "keto",         label: "Keto",         emoji: "🥑" },
  { tag: "fit",          label: "Fit",          emoji: "💪" },
  { tag: "high-protein", label: "High-Protein", emoji: "🍗" },
  { tag: "vegan",        label: "Vegan",        emoji: "🌱" },
  { tag: "vegetarian",   label: "Vegetarian",   emoji: "🥦" },
  { tag: "integral",     label: "Whole Grain",  emoji: "🌾" },
  { tag: "fast-food",    label: "Fast Food",    emoji: "🍔" },
  { tag: "dessert",      label: "Desserts",     emoji: "🍰" },
  { tag: "high-sugar",   label: "High-Sugar",   emoji: "🍬" },
];

const TAG_COLORS: Record<string, string> = {
  keto:           "bg-yellow-100 text-yellow-700",
  fit:            "bg-blue-100 text-blue-700",
  "high-protein": "bg-red-100 text-red-700",
  "fast-food":    "bg-orange-100 text-orange-700",
  "high-fat":     "bg-rose-100 text-rose-700",
  "high-sugar":   "bg-pink-100 text-pink-700",
  dessert:        "bg-purple-100 text-purple-700",
  vegan:          "bg-green-100 text-green-700",
  vegetarian:     "bg-emerald-100 text-emerald-700",
  integral:       "bg-amber-100 text-amber-700",
  fruit:          "bg-pink-100 text-pink-600",
  vegetable:      "bg-lime-100 text-lime-700",
  legume:         "bg-orange-100 text-orange-700",
  dairy:          "bg-sky-100 text-sky-700",
  "low-carb":     "bg-violet-100 text-violet-700",
};

// ── Food search combobox ──────────────────────────────────────────────────────
function FoodSearch({ onSelect }: { onSelect: (item: any) => void }) {
  const [query,     setQuery]     = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [results,   setResults]   = useState<any[]>([]);
  const [open,      setOpen]      = useState(false);

  // Fetch whenever query or tag changes; if no query but tag active, show top tag foods
  useEffect(() => {
    const q = query.trim();
    if (!q && !activeTag) { setResults([]); setOpen(false); return; }
    const t = setTimeout(() => {
      searchApi.foods(q, 20, activeTag || undefined).then((r) => {
        setResults(r.data.results);
        setOpen(true);
      }).catch(() => {});
    }, q ? 200 : 0);
    return () => clearTimeout(t);
  }, [query, activeTag]);

  const handleTagClick = (tag: string) => {
    setActiveTag(tag);
    if (!query.trim()) setOpen(true);
  };

  return (
    <div className="space-y-2">
      {/* Tag filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {TAG_FILTERS.map(({ tag, label, emoji }) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleTagClick(tag)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              activeTag === tag
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-600"
            }`}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => (query || activeTag) && results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search food (e.g. chicken breast, oats)…"
          label="Search Food Database"
        />
        {open && results.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {results.map((f) => {
              const displayCal = calcMacro(f.calories, f.defaultQty, f.defaultUnit, f.defaultQty);
              const displayP   = calcMacro(f.protein,  f.defaultQty, f.defaultUnit, f.defaultQty);
              const displayC   = calcMacro(f.carbs,    f.defaultQty, f.defaultUnit, f.defaultQty);
              const displayF   = calcMacro(f.fats,     f.defaultQty, f.defaultUnit, f.defaultQty);
              const visibleTags = (f.tags ?? []).slice(0, 3);
              return (
                <li
                  key={f.id}
                  onMouseDown={() => { onSelect(f); setQuery(""); setOpen(false); }}
                  className="px-4 py-2.5 hover:bg-brand-50 cursor-pointer border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800">{f.name}</p>
                    {visibleTags.length > 0 && (
                      <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                        {visibleTags.map((tag: string) => (
                          <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] ?? "bg-gray-100 text-gray-500"}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {displayCal} kcal · {f.defaultQty} {f.defaultUnit} &nbsp;|&nbsp;
                    P: {displayP}g &nbsp;C: {displayC}g &nbsp;F: {displayF}g
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {open && results.length === 0 && (query.trim().length > 1 || activeTag) && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
            No results — enter details manually below
          </div>
        )}
      </div>
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
  const [meal,     setMeal]     = useState<"breakfast" | "lunch" | "dinner" | "snack" | "">(
    (editItem?.meal as "breakfast" | "lunch" | "dinner" | "snack" | undefined) ?? ""
  );
  const [cookingOil,  setCookingOil]  = useState<keyof typeof COOKING_OILS>("none");
  const [breading,    setBreading]    = useState<keyof typeof BREADING_OPTIONS>("none");
  const [showUnitRef, setShowUnitRef] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Store the selected food item's base nutrition (per 100g from DB)
  // so we can recalculate macros live when the user changes quantity.
  const [baseFood, setBaseFood] = useState<{
    calories: number; protein: number; carbs: number; fats: number;
    defaultQty: number; defaultUnit: string;
  } | null>(null);

  // When user selects a food from search, auto-fill all fields
  const fillFromSearch = (item: any) => {
    setBaseFood(item);
    setFoodName(item.name);
    setUnit(item.defaultUnit);
    const qty = item.defaultQty;
    setQuantity(String(qty));
    setCalories(String(calcMacro(item.calories, qty, item.defaultUnit, item.defaultQty)));
    setProtein(String(calcMacro(item.protein,   qty, item.defaultUnit, item.defaultQty)));
    setCarbs(String(calcMacro(item.carbs,       qty, item.defaultUnit, item.defaultQty)));
    setFats(String(calcMacro(item.fats,         qty, item.defaultUnit, item.defaultQty)));
  };

  // Live recalculation when quantity changes (only if a DB food is selected)
  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    if (!baseFood || !val || isNaN(Number(val))) return;
    const qty = Number(val);
    setCalories(String(calcMacro(baseFood.calories, qty, unit, baseFood.defaultQty)));
    setProtein(String(calcMacro(baseFood.protein,   qty, unit, baseFood.defaultQty)));
    setCarbs(String(calcMacro(baseFood.carbs,       qty, unit, baseFood.defaultQty)));
    setFats(String(calcMacro(baseFood.fats,         qty, unit, baseFood.defaultQty)));
  };

  const submit = async () => {
    if (!foodName.trim()) { setError("Food name is required"); return; }
    if (!calories || isNaN(Number(calories))) { setError("Calories are required"); return; }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) { setError("Quantity must be a positive number"); return; }
    if (!unit.trim()) { setError("Unit is required"); return; }

    setLoading(true); setError("");
    try {
      const oil   = COOKING_OILS[cookingOil];
      const bread = BREADING_OPTIONS[breading];
      const extraKcal  = oil.kcal  + bread.kcal;
      const extraCarbs = bread.carbs;
      const extraFat   = oil.fat   + bread.fat;
      const payload = {
        foodName: foodName.trim(),
        calories: Math.round(Number(calories) + extraKcal),
        protein:  protein ? Number(protein) : undefined,
        carbs:    carbs   ? Math.round((Number(carbs) + extraCarbs) * 10) / 10 : extraCarbs > 0 ? extraCarbs : undefined,
        fats:     fats    ? Math.round((Number(fats) + extraFat) * 10) / 10 : extraFat > 0 ? extraFat : undefined,
        quantity: Number(quantity),
        unit:     unit.trim(),
        meal:     meal || undefined,
        date:     selectedDate,
      };
      if (editItem) {
        await foodApi.update(editItem.id, payload);
      } else {
        await foodApi.log(payload);
      }
      onSave();
    } catch (e: any) {
      const details = e.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        setError(details.map((d: any) => d.message).join(" · "));
      } else {
        setError(e.response?.data?.error || "Failed to save. Check all fields and try again.");
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Search — only shown when adding new, not when editing */}
      {!editItem && <FoodSearch onSelect={fillFromSearch} />}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
      )}

      <Input
        label="Food Name"
        value={foodName}
        onChange={(e) => setFoodName(e.target.value)}
        placeholder="e.g. Chicken Breast"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Quantity"
          type="number"
          min="0"
          step="any"
          value={quantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
        />
        <Input
          label="Unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="g, ml, cups, slices…"
        />
      </div>

      {/* Quantity reference */}
      <div>
        <button
          type="button"
          onClick={() => setShowUnitRef((v) => !v)}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
        >
          📏 {showUnitRef ? "Hide" : "Show"} unit reference (spoon, cup, bowl…)
        </button>
        {showUnitRef && (
          <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden text-xs">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-left">
                  <th className="px-3 py-1.5 font-medium">Unit</th>
                  <th className="px-3 py-1.5 font-medium">≈ grams</th>
                  <th className="px-3 py-1.5 font-medium hidden sm:table-cell">Note</th>
                </tr>
              </thead>
              <tbody>
                {UNIT_REFERENCE.map((r) => (
                  <tr key={r.unit} className="border-t border-gray-50">
                    <td className="px-3 py-1.5 text-gray-700 font-medium">{r.unit}</td>
                    <td className="px-3 py-1.5 text-gray-500">~{r.approxG}g</td>
                    <td className="px-3 py-1.5 text-gray-400 hidden sm:table-cell">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Macro fields — auto-filled from search, editable */}
      <div className="grid grid-cols-4 gap-2">
        <Input label="Calories" type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} />
        <Input label="Protein (g)" type="number" min="0" step="0.1" value={protein} onChange={(e) => setProtein(e.target.value)} />
        <Input label="Carbs (g)"   type="number" min="0" step="0.1" value={carbs}   onChange={(e) => setCarbs(e.target.value)} />
        <Input label="Fats (g)"    type="number" min="0" step="0.1" value={fats}    onChange={(e) => setFats(e.target.value)} />
      </div>

      {baseFood && (
        <p className="text-xs text-brand-600 bg-brand-50 rounded-lg px-3 py-2">
          ✓ Macros update automatically as you change quantity
        </p>
      )}

      {/* Cooking additions row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Select
            label="Cooking oil"
            value={cookingOil}
            onChange={(e) => setCookingOil(e.target.value as keyof typeof COOKING_OILS)}
            options={Object.entries(COOKING_OILS).map(([v, o]) => ({ value: v, label: o.label }))}
          />
        </div>
        <div>
          <Select
            label="Breading / coating"
            value={breading}
            onChange={(e) => setBreading(e.target.value as keyof typeof BREADING_OPTIONS)}
            options={Object.entries(BREADING_OPTIONS).map(([v, o]) => ({ value: v, label: o.label }))}
          />
        </div>
      </div>
      {(cookingOil !== "none" || breading !== "none") && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Cooking additions: +{COOKING_OILS[cookingOil].kcal + BREADING_OPTIONS[breading].kcal} kcal
          {" · "}+{BREADING_OPTIONS[breading].carbs}g carbs
          {" · "}+{(COOKING_OILS[cookingOil].fat + BREADING_OPTIONS[breading].fat).toFixed(1)}g fat — added at save
        </p>
      )}

      <Select
        label="Meal"
        value={meal}
        onChange={(e) => setMeal(e.target.value as "breakfast" | "lunch" | "dinner" | "snack" | "")}
        options={MEAL_OPTIONS}
        placeholder="Select meal (optional)"
      />

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={loading} onClick={submit}>
          {editItem ? "Save Changes" : "Log Food"}
        </Button>
      </div>
    </div>
  );
}

// ── Macro ring (distribution view) ───────────────────────────────────────────
function MacroRing({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
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

// ── Macro breakdown (calorie-split stacked bar + detail table) ────────────────
function MacroBreakdown({ protein, carbs, fats }: {
  protein: number; carbs: number; fats: number;
}) {
  const pCal  = Math.round(protein * 4);
  const cCal  = Math.round(carbs   * 4);
  const fCal  = Math.round(fats    * 9);
  const total = pCal + cCal + fCal;

  const pPct = total > 0 ? (pCal / total) * 100 : 0;
  const cPct = total > 0 ? (cCal / total) * 100 : 0;
  const fPct = total > 0 ? (fCal / total) * 100 : 0;

  const rows = [
    { label: "🥩 Protein", g: protein, cal: pCal, pct: pPct, color: "#3b82f6", textColor: "text-blue-600" },
    { label: "🍞 Carbs",   g: carbs,   cal: cCal, pct: cPct, color: "#f59e0b", textColor: "text-amber-600" },
    { label: "🥑 Fats",    g: fats,    cal: fCal, pct: fPct, color: "#ef4444", textColor: "text-red-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Stacked calorie bar */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5">Calorie composition</p>
        <div className="h-6 rounded-full overflow-hidden flex">
          {rows.map((r) => (
            <div
              key={r.label}
              style={{ width: `${r.pct}%`, backgroundColor: r.color }}
              className="transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-xs">
          {rows.map((r) => (
            <span key={r.label} className={r.textColor}>
              ● {r.label.split(" ")[1]} {Math.round(r.pct)}%
            </span>
          ))}
        </div>
      </div>

      {/* Detail table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-400">
            <th className="text-left pb-2 font-medium">Macro</th>
            <th className="text-right pb-2 font-medium">Grams</th>
            <th className="text-right pb-2 font-medium">Calories</th>
            <th className="text-right pb-2 font-medium">% of kcal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-gray-50">
              <td className={`py-2 font-medium ${r.textColor}`}>{r.label}</td>
              <td className="py-2 text-right text-gray-700">{Math.round(r.g)}g</td>
              <td className="py-2 text-right text-gray-700">{r.cal} kcal</td>
              <td className="py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
                  </div>
                  <span className="text-gray-500 w-7 text-right">{Math.round(r.pct)}%</span>
                </div>
              </td>
            </tr>
          ))}
          <tr className="font-semibold text-gray-800 text-sm border-t border-gray-200">
            <td className="pt-2.5">Total</td>
            <td className="pt-2.5 text-right">{Math.round(protein + carbs + fats)}g</td>
            <td className="pt-2.5 text-right">{total} kcal</td>
            <td className="pt-2.5 text-right text-gray-500">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Macro by meal (per-meal stacked bars) ─────────────────────────────────────
function MacroByMeal({ grouped, mealOrder }: {
  grouped: Record<string, FoodLog[]>; mealOrder: string[];
}) {
  const meals = mealOrder.filter((m) => grouped[m]);
  if (meals.length === 0) return null;

  const data = meals.map((meal) => {
    const logs = grouped[meal];
    const cal  = logs.reduce((s, l) => s + l.calories,          0);
    const p    = logs.reduce((s, l) => s + (l.protein ?? 0),    0);
    const c    = logs.reduce((s, l) => s + (l.carbs   ?? 0),    0);
    const f    = logs.reduce((s, l) => s + (l.fats    ?? 0),    0);
    const macroG = p + c + f;
    return { meal, cal, p, c, f, macroG };
  });

  const maxCal = Math.max(...data.map((d) => d.cal), 1);

  return (
    <div className="space-y-3.5">
      {data.map(({ meal, cal, p, c, f, macroG }) => {
        const barW = (cal / maxCal) * 100;
        const pPct = macroG > 0 ? (p / macroG) * 100 : 0;
        const cPct = macroG > 0 ? (c / macroG) * 100 : 0;
        const fPct = macroG > 0 ? (f / macroG) * 100 : 0;

        return (
          <div key={meal}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 capitalize">
                {MEAL_ICONS[meal] ?? "🍽️"}{" "}
                {meal === "other" ? "Other" : meal.charAt(0).toUpperCase() + meal.slice(1)}
              </span>
              <span className="text-xs text-gray-400">
                <span className="font-semibold text-gray-600">{Math.round(cal)}</span> kcal
                {" · "}P:{Math.round(p)}g C:{Math.round(c)}g F:{Math.round(f)}g
              </span>
            </div>
            {/* Outer track shows relative calorie size vs largest meal */}
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${barW}%` }}>
                <div style={{ width: `${pPct}%`, backgroundColor: "#3b82f6" }} />
                <div style={{ width: `${cPct}%`, backgroundColor: "#f59e0b" }} />
                <div style={{ width: `${fPct}%`, backgroundColor: "#ef4444" }} />
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex gap-4 justify-center text-xs text-gray-400 pt-1 border-t border-gray-50">
        {[["#3b82f6","Protein"],["#f59e0b","Carbs"],["#ef4444","Fats"]].map(([color, name]) => (
          <span key={name} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
            {name}
          </span>
        ))}
        <span className="text-gray-300">· bar width = relative kcal</span>
      </div>
    </div>
  );
}

// ── Macro goal bar (vs goal view) ─────────────────────────────────────────────
function MacroGoalBar({ label, consumed, target, color, bgColor }: {
  label: string; consumed: number; target: number; color: string; bgColor: string;
}) {
  const pct    = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const over   = consumed > target;
  const diff   = Math.abs(Math.round(target - consumed));

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={over ? "text-red-500 font-semibold" : "text-gray-500"}>
          <span className="font-bold text-gray-800">{Math.round(consumed)}</span>
          {" / "}{Math.round(target)}g
          {over
            ? <span className="ml-1 text-red-500">(+{diff}g)</span>
            : <span className="ml-1 text-gray-400">({diff}g left)</span>
          }
        </span>
      </div>
      <div className={`h-2.5 rounded-full overflow-hidden ${bgColor}`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Calorie progress bar ──────────────────────────────────────────────────────
function CalorieProgress({ consumed, target }: { consumed: number; target: number }) {
  const pct       = Math.min((consumed / target) * 100, 100);
  const remaining = target - consumed;
  const over      = consumed > target;
  return (
    <div className="mt-3">
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? "bg-red-400" : "bg-brand-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-xs text-gray-400">
        <span>{Math.round(consumed)} kcal consumed</span>
        <span className={over ? "text-red-500 font-medium" : ""}>
          {over ? `${Math.round(-remaining)} kcal over` : `${Math.round(remaining)} kcal left`}
        </span>
      </div>
    </div>
  );
}

// ── Deficit / surplus banner ──────────────────────────────────────────────────
function DeficitSurplusBanner({ consumed, target, goalType }: {
  consumed: number; target: number; goalType?: string;
}) {
  const diff = consumed - target;
  const absDiff = Math.abs(Math.round(diff));

  // Within ±80 kcal → on target
  if (Math.abs(diff) <= 80) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-green-50 border border-green-200 text-sm text-green-800 mt-3">
        <span>🎯</span>
        <p><span className="font-semibold">Right on target!</span> You're within 80 kcal of your daily goal.</p>
      </div>
    );
  }

  if (diff > 0) {
    // Surplus
    const isBuilding = goalType === "bulk";
    return (
      <div className="flex items-start gap-2 rounded-xl px-4 py-2.5 bg-orange-50 border border-orange-200 text-sm text-orange-800 mt-3">
        <span className="mt-0.5">📈</span>
        <p>
          <span className="font-semibold">Calorie surplus of {absDiff} kcal.</span>{" "}
          {isBuilding
            ? "You're in a planned surplus — good for muscle building. Make sure protein is on track."
            : "You've exceeded your daily target. This contributes to weight gain over time."}
        </p>
      </div>
    );
  }

  // Deficit
  const isCutting = goalType === "cut";
  return (
    <div className="flex items-start gap-2 rounded-xl px-4 py-2.5 bg-blue-50 border border-blue-200 text-sm text-blue-800 mt-3">
      <span className="mt-0.5">📉</span>
      <p>
        <span className="font-semibold">Calorie deficit of {absDiff} kcal.</span>{" "}
        {isCutting
          ? "You're on track for fat loss. Ensure you're hitting your protein target to protect muscle."
          : "You're under your daily target. Log more meals if this isn't intentional."}
      </p>
    </div>
  );
}

// ── AI meal plan suggestion modal ─────────────────────────────────────────────
interface MealPlanItem {
  foodName: string; calories: number;
  protein?: number; carbs?: number; fats?: number;
  quantity: number; unit: string;
}
interface MealPlanMeal { meal: "breakfast" | "lunch" | "dinner" | "snack"; items: MealPlanItem[] }
interface MealPlanData {
  meals: MealPlanMeal[];
  totalCalories: number; totalProtein: number; totalCarbs: number; totalFats: number;
}

function SuggestMealPlanModal({ open, onClose, selectedDate, onLogged }: {
  open: boolean; onClose: () => void; selectedDate: string; onLogged: () => void;
}) {
  const [status, setStatus]     = useState<"idle" | "fetching" | "preview" | "logging" | "done">("idle");
  const [plan,   setPlan]       = useState<MealPlanData | null>(null);
  const [aiText, setAiText]     = useState("");
  const [error,  setError]      = useState("");

  useEffect(() => {
    if (!open) { setStatus("idle"); setPlan(null); setError(""); }
    else { fetchPlan(); }
  }, [open]);

  const fetchPlan = async () => {
    setStatus("fetching"); setError("");
    try {
      const today = format(parseISO(selectedDate), "EEEE, MMMM d");
      const res = await chatApi.send({
        message: `Please suggest a complete daily meal plan for me for ${today}. Include breakfast, lunch, dinner and one snack, with specific foods and realistic portion sizes that fit my goals.`,
        agentType: "nutritionist",
      });
      setAiText(res.data.message);
      if (res.data.suggestedMealPlan) {
        setPlan(res.data.suggestedMealPlan as MealPlanData);
        setStatus("preview");
      } else {
        setError("The nutritionist didn't return a structured meal plan. Try again or ask directly in the chat.");
        setStatus("idle");
      }
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to get meal plan suggestion.");
      setStatus("idle");
    }
  };

  const logAll = async () => {
    if (!plan) return;
    setStatus("logging");
    try {
      const foods = plan.meals.flatMap((m) =>
        m.items.map((item) => ({ ...item, meal: m.meal }))
      );
      await foodApi.bulk(foods, selectedDate);
      setStatus("done");
      setTimeout(() => { onLogged(); onClose(); }, 1000);
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to log meals.");
      setStatus("preview");
    }
  };

  const MEAL_ICONS: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };

  return (
    <Modal open={open} onClose={onClose} title="✨ Suggested Meal Plan" size="lg">
      {status === "fetching" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500">Nutritionist is building your plan…</p>
        </div>
      )}

      {status === "done" && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="text-5xl">✅</div>
          <p className="font-semibold text-gray-800">Meals logged successfully!</p>
        </div>
      )}

      {(status === "preview" || status === "logging") && plan && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex gap-4 bg-brand-50 rounded-xl px-4 py-3 text-sm">
            <span className="font-semibold text-brand-700">{plan.totalCalories} kcal</span>
            <span className="text-gray-500">P: {plan.totalProtein}g</span>
            <span className="text-gray-500">C: {plan.totalCarbs}g</span>
            <span className="text-gray-500">F: {plan.totalFats}g</span>
          </div>

          {/* Meals */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {plan.meals.map((m) => (
              <div key={m.meal} className="border border-gray-100 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-800 mb-2 capitalize">
                  {MEAL_ICONS[m.meal]} {m.meal}
                </p>
                {m.items.length === 0 ? (
                  <p className="text-xs text-gray-400">No items</p>
                ) : (
                  <table className="w-full text-xs text-gray-600">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400">
                        <th className="text-left pb-1">Food</th>
                        <th className="text-right pb-1">Qty</th>
                        <th className="text-right pb-1">Kcal</th>
                        <th className="text-right pb-1">P</th>
                        <th className="text-right pb-1">C</th>
                        <th className="text-right pb-1">F</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1 font-medium">{item.foodName}</td>
                          <td className="py-1 text-right">{item.quantity}{item.unit}</td>
                          <td className="py-1 text-right">{item.calories}</td>
                          <td className="py-1 text-right">{item.protein ?? "—"}</td>
                          <td className="py-1 text-right">{item.carbs ?? "—"}</td>
                          <td className="py-1 text-right">{item.fats ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" className="flex-1" onClick={fetchPlan} disabled={status === "logging"}>
              🔄 Regenerate
            </Button>
            <Button variant="secondary" className="flex-1" onClick={onClose} disabled={status === "logging"}>
              Cancel
            </Button>
            <Button className="flex-1" loading={status === "logging"} onClick={logAll}>
              Log All Meals
            </Button>
          </div>
        </div>
      )}

      {status === "idle" && error && (
        <div className="space-y-4 py-4">
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-3">{error}</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={fetchPlan}>Try Again</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Bowl / Dish builder ───────────────────────────────────────────────────────
interface DishIngredient {
  food: any;
  qty: number;
  unit: string;
  cal: number;
  protein: number;
  carbs: number;
  fats: number;
}

function BuildDishModal({ open, onClose, selectedDate, onSaved }: {
  open: boolean; onClose: () => void; selectedDate: string; onSaved: () => void;
}) {
  const [dishName,     setDishName]     = useState("");
  const [ingredients,  setIngredients]  = useState<DishIngredient[]>([]);
  const [meal,         setMeal]         = useState<string>("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [logSeparate,  setLogSeparate]  = useState(false); // log each ingredient individually vs as one dish

  // Temp ingredient being built
  const [selFood,   setSelFood]   = useState<any | null>(null);
  const [selQty,    setSelQty]    = useState("100");
  const [selUnit,   setSelUnit]   = useState("g");

  const totals = ingredients.reduce(
    (acc, i) => ({ cal: acc.cal + i.cal, protein: acc.protein + i.protein, carbs: acc.carbs + i.carbs, fats: acc.fats + i.fats }),
    { cal: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const addIngredient = () => {
    if (!selFood || !selQty || Number(selQty) <= 0) return;
    const qty = Number(selQty);
    const ing: DishIngredient = {
      food:    selFood,
      qty,
      unit:    selUnit,
      cal:     calcMacro(selFood.calories, qty, selUnit, selFood.defaultQty),
      protein: calcMacro(selFood.protein,  qty, selUnit, selFood.defaultQty),
      carbs:   calcMacro(selFood.carbs,    qty, selUnit, selFood.defaultQty),
      fats:    calcMacro(selFood.fats,     qty, selUnit, selFood.defaultQty),
    };
    setIngredients((prev) => [...prev, ing]);
    setSelFood(null); setSelQty("100"); setSelUnit("g");
  };

  const removeIngredient = (idx: number) => setIngredients((prev) => prev.filter((_, i) => i !== idx));

  const saveDish = async () => {
    if (ingredients.length === 0) { setError("Add at least one ingredient"); return; }
    const name = dishName.trim() || "Custom Dish";
    setLoading(true); setError("");
    try {
      type MealType = "breakfast" | "lunch" | "dinner" | "snack";
      const typedMeal = (meal || undefined) as MealType | undefined;
      if (logSeparate) {
        // Log each ingredient as a separate FoodLog
        const items = ingredients.map((ing) => ({
          foodName: ing.food.name,
          calories: ing.cal,
          protein:  ing.protein,
          carbs:    ing.carbs,
          fats:     ing.fats,
          quantity: ing.qty,
          unit:     ing.unit,
          meal:     typedMeal,
        }));
        await foodApi.bulk(items, selectedDate);
      } else {
        // Log as a single combined entry
        await foodApi.log({
          foodName: name,
          calories: Math.round(totals.cal),
          protein:  Math.round(totals.protein * 10) / 10,
          carbs:    Math.round(totals.carbs   * 10) / 10,
          fats:     Math.round(totals.fats    * 10) / 10,
          quantity: 1,
          unit:     "serving",
          meal:     typedMeal,
          date:     selectedDate,
        });
      }
      onSaved(); onClose();
      setIngredients([]); setDishName(""); setMeal("");
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to save dish");
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="🥣 Build a Dish / Bowl" size="lg">
      <div className="space-y-4">
        {/* Dish name */}
        <Input
          label="Dish name"
          value={dishName}
          onChange={(e) => setDishName(e.target.value)}
          placeholder="e.g. My Protein Bowl, Chicken Salad…"
        />

        {/* Add ingredient */}
        <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Add ingredient</p>
          <FoodSearch onSelect={(f) => { setSelFood(f); setSelUnit(f.defaultUnit); setSelQty(String(f.defaultQty)); }} />
          {selFood && (
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-24">
                <p className="text-xs text-gray-500 mb-1 font-medium">{selFood.name}</p>
                <div className="flex gap-2">
                  <Input
                    label="Qty"
                    type="number"
                    min="0"
                    step="any"
                    value={selQty}
                    onChange={(e) => setSelQty(e.target.value)}
                    className="w-24"
                  />
                  <Input
                    label="Unit"
                    value={selUnit}
                    onChange={(e) => setSelUnit(e.target.value)}
                    placeholder="g"
                    className="w-20"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  → {calcMacro(selFood.calories, Number(selQty)||0, selUnit, selFood.defaultQty)} kcal ·
                  P:{calcMacro(selFood.protein, Number(selQty)||0, selUnit, selFood.defaultQty)}g ·
                  C:{calcMacro(selFood.carbs,   Number(selQty)||0, selUnit, selFood.defaultQty)}g ·
                  F:{calcMacro(selFood.fats,    Number(selQty)||0, selUnit, selFood.defaultQty)}g
                </p>
              </div>
              <Button size="sm" onClick={addIngredient} className="mb-0.5">+ Add</Button>
            </div>
          )}
        </div>

        {/* Ingredients list */}
        {ingredients.length > 0 && (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-xs text-gray-400 font-medium">Ingredient</th>
                  <th className="text-right px-2 py-2 text-xs text-gray-400 font-medium">Kcal</th>
                  <th className="text-right px-2 py-2 text-xs text-gray-400 font-medium">P</th>
                  <th className="text-right px-2 py-2 text-xs text-gray-400 font-medium">C</th>
                  <th className="text-right px-2 py-2 text-xs text-gray-400 font-medium">F</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="px-3 py-2 text-gray-700 text-xs">
                      {ing.food.name}
                      <span className="text-gray-400 ml-1">({ing.qty} {ing.unit})</span>
                    </td>
                    <td className="px-2 py-2 text-right text-xs font-semibold">{ing.cal}</td>
                    <td className="px-2 py-2 text-right text-xs text-blue-600">{ing.protein}g</td>
                    <td className="px-2 py-2 text-right text-xs text-yellow-600">{ing.carbs}g</td>
                    <td className="px-2 py-2 text-right text-xs text-red-500">{ing.fats}g</td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => removeIngredient(idx)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-brand-50 font-semibold text-sm border-t border-brand-100">
                  <td className="px-3 py-2 text-brand-700">Total</td>
                  <td className="px-2 py-2 text-right text-brand-800">{Math.round(totals.cal)}</td>
                  <td className="px-2 py-2 text-right text-blue-700">{Math.round(totals.protein)}g</td>
                  <td className="px-2 py-2 text-right text-yellow-700">{Math.round(totals.carbs)}g</td>
                  <td className="px-2 py-2 text-right text-red-600">{Math.round(totals.fats)}g</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Meal selector + log mode */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Meal"
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            options={MEAL_OPTIONS}
            placeholder="Select meal (optional)"
          />
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 mb-1.5">
              <input
                type="checkbox"
                checked={logSeparate}
                onChange={(e) => setLogSeparate(e.target.checked)}
                className="rounded border-gray-300"
              />
              Log ingredients separately
            </label>
            <p className="text-xs text-gray-400">
              {logSeparate ? "Each ingredient logged individually" : "Logged as one combined dish entry"}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={loading} onClick={saveDish} disabled={ingredients.length === 0}>
            Log {logSeparate ? `${ingredients.length} items` : "Dish"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Fasting timer helpers ─────────────────────────────────────────────────────
function formatFastingDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// ── Main Nutrition page ───────────────────────────────────────────────────────
export default function NutritionPage() {
  const navigate = useNavigate();
  const [date,     setDate]     = useState(new Date().toISOString().split("T")[0]);
  const [logs,     setLogs]     = useState<FoodLog[]>([]);
  const [totals,   setTotals]   = useState<FoodTotals>({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [loading,  setLoading]  = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editItem,    setEditItem]    = useState<FoodLog | null>(null);
  const [deleting,    setDeleting]    = useState<number | null>(null);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [showDish,     setShowDish]     = useState(false);
  const [activeGoal,  setActiveGoal]  = useState<CalorieGoal | null>(null);
  const [macroView,   setMacroView]   = useState<"distribution" | "breakdown" | "by-meal" | "goals">("distribution");

  // ── Fasting mode ────────────────────────────────────────────────────────────
  const [fastingActive, setFastingActive] = useState(false);
  const [fastingStart,  setFastingStart]  = useState<Date | null>(null);
  const [fastingElapsed, setFastingElapsed] = useState(0); // ms
  const fastingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (fastingActive && fastingStart) {
      fastingRef.current = setInterval(() => {
        setFastingElapsed(Date.now() - fastingStart.getTime());
      }, 10000); // update every 10s
      setFastingElapsed(Date.now() - fastingStart.getTime()); // immediate
    } else {
      if (fastingRef.current) clearInterval(fastingRef.current);
    }
    return () => { if (fastingRef.current) clearInterval(fastingRef.current); };
  }, [fastingActive, fastingStart]);

  const toggleFasting = () => {
    if (fastingActive) {
      setFastingActive(false);
      setFastingStart(null);
      setFastingElapsed(0);
    } else {
      setFastingActive(true);
      setFastingStart(new Date());
      setFastingElapsed(0);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [foodRes, goalRes] = await Promise.all([
        foodApi.getToday(date),
        calorieGoalsApi.getActive().catch(() => ({ data: { goal: null } })),
      ]);
      setLogs(foodRes.data.logs);
      setTotals(foodRes.data.totals);
      setActiveGoal(goalRes.data.goal);
    } catch {
      setLogs([]); setTotals({ calories: 0, protein: 0, carbs: 0, fats: 0 });
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const deleteLog = async (id: number) => {
    if (!confirm("Remove this entry?")) return;
    setDeleting(id);
    try {
      await foodApi.delete(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setTotals((prev) => {
        const removed = logs.find((l) => l.id === id);
        if (!removed) return prev;
        return {
          calories: prev.calories - removed.calories,
          protein:  prev.protein  - (removed.protein ?? 0),
          carbs:    prev.carbs    - (removed.carbs   ?? 0),
          fats:     prev.fats     - (removed.fats    ?? 0),
        };
      });
    } finally { setDeleting(null); }
  };

  const totalMacroG = totals.protein + totals.carbs + totals.fats;
  const hasGoal = activeGoal != null;

  // Group by meal
  const grouped: Record<string, FoodLog[]> = {};
  for (const log of logs) {
    const key = log.meal ?? "other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(log);
  }
  const mealOrder = ["breakfast", "lunch", "dinner", "snack", "other"];
  const isToday   = date === new Date().toISOString().split("T")[0];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header + date nav */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nutrition</h1>
          <p className="text-gray-500 text-sm mt-1">{format(parseISO(date), "EEEE, MMMM d")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm"
            onClick={() => setDate(subDays(parseISO(date), 1).toISOString().split("T")[0])}>←</Button>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button variant="secondary" size="sm"
            disabled={isToday}
            onClick={() => setDate(addDays(parseISO(date), 1).toISOString().split("T")[0])}>→</Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowMealPlan(true)}
            title="Get an AI-generated meal plan for today"
          >
            ✨ Suggest Plan
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/chat?agent=nutritionist")}
            title="Chat with your AI nutritionist"
          >
            🥗 Ask Nutritionist
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFasting}
            className={fastingActive ? "border-violet-400 text-violet-700 bg-violet-50" : ""}
            title={fastingActive ? "End fasting window" : "Start fasting timer"}
          >
            {fastingActive ? "⏸ End Fast" : "⏱ Start Fast"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDish(true)}
            title="Build a dish or bowl from multiple ingredients"
          >
            🥣 Build a Dish
          </Button>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }}>+ Log Food</Button>
        </div>
      </div>

      {/* Fasting mode banner */}
      {fastingActive && fastingStart && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🕐</span>
            <div>
              <p className="font-semibold text-violet-800 text-sm">Fasting window active</p>
              <p className="text-xs text-violet-500 mt-0.5">
                Started at {fastingStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-violet-700 tabular-nums">{formatFastingDuration(fastingElapsed)}</p>
            <p className="text-xs text-violet-400 mt-0.5">elapsed</p>
          </div>
          <div className="text-right text-xs text-violet-500 space-y-0.5">
            {fastingElapsed < 12 * 3600000 && (
              <p>⏳ {formatFastingDuration(12 * 3600000 - fastingElapsed)} until 12-hour fast</p>
            )}
            {fastingElapsed >= 12 * 3600000 && fastingElapsed < 16 * 3600000 && (
              <p>⏳ {formatFastingDuration(16 * 3600000 - fastingElapsed)} until 16:8 window</p>
            )}
            {fastingElapsed >= 16 * 3600000 && fastingElapsed < 24 * 3600000 && (
              <p>✅ 16:8 window complete! {formatFastingDuration(24 * 3600000 - fastingElapsed)} until 24h</p>
            )}
            {fastingElapsed >= 24 * 3600000 && (
              <p>🏆 Full 24-hour fast complete!</p>
            )}
          </div>
        </div>
      )}

      {/* Daily summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Calories card ── */}
        <Card className="lg:col-span-1">
          <CardHeader title="Calories" />
          <div className="text-center py-2">
            <p className="text-4xl font-bold text-gray-900">{Math.round(totals.calories)}</p>
            <p className="text-sm text-gray-400 mt-1">kcal consumed</p>
            {hasGoal && (
              <p className="text-sm text-gray-500 mt-0.5">
                Goal: <span className="font-semibold text-gray-700">{Math.round(activeGoal!.dailyCalories)} kcal</span>
              </p>
            )}
          </div>

          {/* Progress bar — only shown when there's a goal */}
          {hasGoal && totals.calories > 0 && (
            <CalorieProgress consumed={totals.calories} target={activeGoal!.dailyCalories} />
          )}

          {/* Deficit/surplus banner — only shown when goal exists and food logged */}
          {hasGoal && totals.calories > 0 && (
            <DeficitSurplusBanner
              consumed={totals.calories}
              target={activeGoal!.dailyCalories}
              goalType={activeGoal!.type}
            />
          )}

          {/* No goal nudge */}
          {!hasGoal && (
            <p className="text-xs text-gray-400 text-center mt-2">
              <button
                onClick={() => navigate("/goals")}
                className="text-brand-600 hover:underline"
              >Set a calorie goal</button> to track limits & deficit/surplus
            </p>
          )}

          <div className="flex justify-around pt-4 border-t border-gray-100 text-center mt-3">
            <div>
              <p className="text-xs text-gray-400">Entries</p>
              <p className="font-bold text-gray-800">{logs.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Meals</p>
              <p className="font-bold text-gray-800">{Object.keys(grouped).length}</p>
            </div>
            {hasGoal && (
              <div>
                <p className="text-xs text-gray-400">TDEE</p>
                <p className="font-bold text-gray-800">{Math.round(activeGoal!.tdee ?? 0)}</p>
              </div>
            )}
          </div>
        </Card>

        {/* ── Macronutrients card ── */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-gray-900">Macronutrients</h3>

            {/* View toggle — always visible; "vs Goals" only when a goal exists */}
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 text-xs">
              {([
                { key: "distribution", label: "🍩 Rings"      },
                { key: "breakdown",    label: "📊 Breakdown"  },
                { key: "by-meal",      label: "🍽️ By Meal"   },
                ...(hasGoal ? [{ key: "goals", label: "🎯 vs Goals" }] : []),
              ] as { key: typeof macroView; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMacroView(key)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${
                    macroView === key
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {totalMacroG > 0 ? (
            <>
              {/* 🍩 Distribution — macro rings showing % of total grams */}
              {macroView === "distribution" && (
                <div className="flex items-center justify-around">
                  <MacroRing label="Protein" value={totals.protein} total={totalMacroG} color="#3b82f6" />
                  <MacroRing label="Carbs"   value={totals.carbs}   total={totalMacroG} color="#f59e0b" />
                  <MacroRing label="Fats"    value={totals.fats}    total={totalMacroG} color="#ef4444" />
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Calories from macros</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(totals.protein * 4 + totals.carbs * 4 + totals.fats * 9)}
                    </p>
                    <p className="text-xs text-gray-400">kcal</p>
                  </div>
                </div>
              )}

              {/* 📊 Breakdown — stacked calorie bar + gram/kcal/% table */}
              {macroView === "breakdown" && (
                <MacroBreakdown
                  protein={totals.protein}
                  carbs={totals.carbs}
                  fats={totals.fats}
                />
              )}

              {/* 🍽️ By Meal — per-meal stacked bars */}
              {macroView === "by-meal" && (
                <MacroByMeal grouped={grouped} mealOrder={mealOrder} />
              )}

              {/* 🎯 vs Goals — progress bars against calorie goal targets */}
              {macroView === "goals" && hasGoal && (
                <div className="space-y-4 pt-1">
                  <MacroGoalBar
                    label="🥩 Protein"
                    consumed={totals.protein}
                    target={activeGoal!.proteinGrams}
                    color="#3b82f6"
                    bgColor="bg-blue-100"
                  />
                  <MacroGoalBar
                    label="🍞 Carbohydrates"
                    consumed={totals.carbs}
                    target={activeGoal!.carbsGrams}
                    color="#f59e0b"
                    bgColor="bg-amber-100"
                  />
                  <MacroGoalBar
                    label="🥑 Fats"
                    consumed={totals.fats}
                    target={activeGoal!.fatsGrams}
                    color="#ef4444"
                    bgColor="bg-red-100"
                  />
                  <div className="text-xs text-gray-400 text-right pt-1">
                    From goal: {activeGoal!.name ?? activeGoal!.type}
                    {" · "}{Math.round(activeGoal!.dailyCalories)} kcal / day
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <p className="text-sm text-gray-400">Log food to see macro breakdown</p>
              <Button size="sm" onClick={() => setShowForm(true)}>Log First Meal</Button>
            </div>
          )}
        </Card>
      </div>

      {/* Food log by meal */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="text-center py-14">
          <div className="text-5xl mb-3">🥗</div>
          <h3 className="font-semibold text-gray-800 mb-2">Nothing logged yet</h3>
          <p className="text-sm text-gray-400 mb-4">
            {isToday
              ? "Log your first meal to start tracking today's nutrition."
              : `Nothing was logged on ${format(parseISO(date), "MMM d")}.`}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setShowForm(true)}>Log Food</Button>
            <Button variant="secondary" onClick={() => navigate("/chat?agent=nutritionist")}>
              Ask Nutritionist
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {mealOrder
            .filter((m) => grouped[m])
            .map((meal) => {
              const mealLogs = grouped[meal];
              const mealCal  = mealLogs.reduce((s, l) => s + l.calories, 0);
              const mealP    = mealLogs.reduce((s, l) => s + (l.protein ?? 0), 0);
              const mealC    = mealLogs.reduce((s, l) => s + (l.carbs   ?? 0), 0);
              const mealF    = mealLogs.reduce((s, l) => s + (l.fats    ?? 0), 0);
              return (
                <Card key={meal}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {MEAL_ICONS[meal] ?? "🍽️"}{" "}
                        {meal === "other" ? "Other" : meal.charAt(0).toUpperCase() + meal.slice(1)}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Math.round(mealCal)} kcal &nbsp;·&nbsp;
                        P: {Math.round(mealP)}g &nbsp;
                        C: {Math.round(mealC)}g &nbsp;
                        F: {Math.round(mealF)}g
                      </p>
                    </div>
                    <button
                      onClick={() => { setEditItem(null); setShowForm(true); }}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      + Add
                    </button>
                  </div>
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
                          <th className="w-16" />
                        </tr>
                      </thead>
                      <tbody>
                        {mealLogs.map((log) => (
                          <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 font-medium text-gray-800">{log.foodName}</td>
                            <td className="py-2.5 text-right text-gray-500">{log.quantity}{log.unit}</td>
                            <td className="py-2.5 text-right font-semibold text-gray-800">{Math.round(log.calories)}</td>
                            <td className="py-2.5 text-right text-blue-600">{log.protein != null ? Math.round(log.protein) : "—"}</td>
                            <td className="py-2.5 text-right text-yellow-600">{log.carbs  != null ? Math.round(log.carbs)   : "—"}</td>
                            <td className="py-2.5 text-right text-red-500">{log.fats    != null ? Math.round(log.fats)    : "—"}</td>
                            <td className="py-2.5">
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => { setEditItem(log); setShowForm(true); }}
                                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                  title="Edit"
                                >✏️</button>
                                <button
                                  onClick={() => deleteLog(log.id)}
                                  disabled={deleting === log.id}
                                  className="text-xs px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                                  title="Delete"
                                >
                                  {deleting === log.id ? "…" : "✕"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
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

      {/* AI meal plan suggestion modal */}
      <SuggestMealPlanModal
        open={showMealPlan}
        onClose={() => setShowMealPlan(false)}
        selectedDate={date}
        onLogged={() => load()}
      />

      {/* Bowl / dish builder modal */}
      <BuildDishModal
        open={showDish}
        onClose={() => setShowDish(false)}
        selectedDate={date}
        onSaved={() => { setShowDish(false); load(); }}
      />
    </div>
  );
}
