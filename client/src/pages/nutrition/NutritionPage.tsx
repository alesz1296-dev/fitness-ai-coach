import { useState, useEffect, useRef, useCallback } from "react";
import { format, parseISO, addDays, subDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { foodApi, chatApi, searchApi, calorieGoalsApi, waterApi, customFoodsApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import type { FoodLog, FoodTotals, CalorieGoal, WaterLog, CustomFood } from "../../types";
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

// Sweetener presets — for coffee, tea, oatmeal, yogurt, etc.
const SWEETENER_OPTIONS: Record<string, { label: string; kcal: number; carbs: number }> = {
  none:          { label: "No sweetener",           kcal: 0,  carbs: 0   },
  sugar_tsp:     { label: "White sugar – 1 tsp",    kcal: 16, carbs: 4   },
  sugar_tbsp:    { label: "White sugar – 1 tbsp",   kcal: 48, carbs: 12  },
  brown_tsp:     { label: "Brown sugar – 1 tsp",    kcal: 17, carbs: 4.5 },
  honey_tsp:     { label: "Honey – 1 tsp",          kcal: 21, carbs: 5.7 },
  honey_tbsp:    { label: "Honey – 1 tbsp",         kcal: 64, carbs: 17  },
  agave_tsp:     { label: "Agave syrup – 1 tsp",    kcal: 20, carbs: 5   },
  maple_tsp:     { label: "Maple syrup – 1 tsp",    kcal: 18, carbs: 4.5 },
  stevia:        { label: "Stevia / sweetener (0)", kcal: 0,  carbs: 0   },
  condensed_tbsp:{ label: "Condensed milk – 1 tbsp",kcal: 62, carbs: 10.5},
};

// ── Food-type detection helpers ───────────────────────────────────────────────
// These decide which "cooking extras" make sense for the selected food.

type FoodSnap = { name: string; tags?: string[] } | null;

const BREADABLE_KEYWORDS = [
  "chicken", "fish", "salmon", "cod", "tilapia", "shrimp", "prawn",
  "calamari", "squid", "octopus", "scallop", "mussel", "sea bass",
  "pork", "veal", "beef", "steak", "schnitzel", "venison", "rabbit",
  "fillet", "nugget", "wing", "tender", "cutlet", "onion ring", "kofta",
];
const COOKABLE_KEYWORDS = [
  ...BREADABLE_KEYWORDS,
  "egg", "omelette", "pasta", "noodle", "rice", "potato", "tofu",
  "tempeh", "bacon", "sausage", "bratwurst", "chorizo", "kielbasa",
  "lamb", "turkey", "duck", "prosciutto", "mortadella",
  "stir fry", "vegetable", "zucchini", "pepper", "mushroom", "broccoli",
  "cauliflower", "eggplant", "aubergine", "spinach", "asparagus",
];
const SWEETABLE_KEYWORDS = [
  "coffee", "espresso", "cappuccino", "latte", "americano", "macchiato",
  "tea", "matcha", "chai", "oatmeal", "oat", "porridge", "cereal",
  "muesli", "granola", "yogurt", "yoghurt", "milk", "smoothie",
  "pancake", "waffle", "crepe", "french toast",
];

function matchesKeywords(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/** Should the cooking-oil selector be shown for this food? */
function showsOil(food: FoodSnap): boolean {
  if (!food) return false; // no food selected → hide all extras
  const tags = food.tags ?? [];
  if (tags.some((t) => ["fast-food", "dessert", "high-sugar", "fruit"].includes(t))) return false;
  return (
    tags.includes("high-protein") ||
    tags.includes("vegetable") ||
    tags.includes("vegan") ||
    tags.includes("fit") ||
    matchesKeywords(food.name, COOKABLE_KEYWORDS)
  );
}

/** Should the breading selector be shown for this food? */
function showsBreading(food: FoodSnap): boolean {
  if (!food) return false;
  const tags = food.tags ?? [];
  // Never for beverages, fruits, desserts, dairy-sweet, packaged fast food
  if (tags.some((t) => ["fast-food", "dessert", "high-sugar", "fruit", "legume"].includes(t))) return false;
  return (
    tags.includes("high-protein") ||
    matchesKeywords(food.name, BREADABLE_KEYWORDS)
  );
}

/** Should the sweetener selector be shown for this food? */
function showsSweetener(food: FoodSnap): boolean {
  if (!food) return false;
  const tags = food.tags ?? [];
  return (
    tags.some((t) => ["mix", "integral"].includes(t)) ||
    matchesKeywords(food.name, SWEETABLE_KEYWORDS)
  );
}

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

// ── Food tag filter chips — grouped into 3 categories ────────────────────────
const CUISINE_TAGS = [
  { tag: "japanese",       label: "Japanese",       emoji: "🍱" },
  { tag: "italian",        label: "Italian",        emoji: "🍝" },
  { tag: "mexican",        label: "Mexican",        emoji: "🌮" },
  { tag: "middle-eastern", label: "Middle Eastern", emoji: "🧆" },
  { tag: "korean",         label: "Korean",         emoji: "🥢" },
];

const DIETARY_TAGS = [
  { tag: "fit",          label: "Fit",          emoji: "💪" },
  { tag: "keto",         label: "Keto",         emoji: "🥑" },
  { tag: "high-protein", label: "High-Protein", emoji: "🍗" },
  { tag: "vegan",        label: "Vegan",        emoji: "🌱" },
  { tag: "vegetarian",   label: "Vegetarian",   emoji: "🥦" },
  { tag: "fast-food",    label: "Fast Food",    emoji: "🍔" },
  { tag: "dessert",      label: "Desserts",     emoji: "🍰" },
  { tag: "integral",     label: "Whole Grain",  emoji: "🌾" },
  { tag: "low-carb",     label: "Low-Carb",     emoji: "🥗" },
  { tag: "high-sugar",   label: "High-Sugar",   emoji: "🍬" },
];

const FOOD_TYPE_TAGS = [
  { tag: "meat",      label: "Meats",      emoji: "🥩" },
  { tag: "seafood",   label: "Seafood",    emoji: "🦐" },
  { tag: "cheese",    label: "Cheese",     emoji: "🧀" },
  { tag: "soup",      label: "Soups",      emoji: "🍲" },
  { tag: "sausage",   label: "Sausages",   emoji: "🌭" },
  { tag: "vegetable", label: "Vegetables", emoji: "🫛" },
  { tag: "fruit",     label: "Fruits",     emoji: "🍎" },
  { tag: "smoothie",  label: "Smoothies",  emoji: "🥤" },
  { tag: "salad",     label: "Salads",     emoji: "🥗" },
  { tag: "pasta",     label: "Pasta",      emoji: "🍜" },
  { tag: "dairy",     label: "Dairy",      emoji: "🥛" },
];

// Flat list for backward-compat tag display in food rows (TAG_COLORS still used)
const TAG_FILTERS = [
  { tag: "", label: "All", emoji: "🍽️" },
  ...CUISINE_TAGS, ...DIETARY_TAGS, ...FOOD_TYPE_TAGS,
];

const TAG_COLORS: Record<string, string> = {
  keto:             "bg-yellow-100 text-yellow-700",
  fit:              "bg-blue-100 text-blue-700",
  "high-protein":   "bg-red-100 text-red-700",
  "fast-food":      "bg-orange-100 text-orange-700",
  "high-fat":       "bg-rose-100 text-rose-700",
  "high-sugar":     "bg-pink-100 text-pink-700",
  dessert:          "bg-purple-100 text-purple-700",
  vegan:            "bg-green-100 text-green-700",
  vegetarian:       "bg-emerald-100 text-emerald-700",
  integral:         "bg-amber-100 text-amber-700",
  fruit:            "bg-pink-100 text-pink-600",
  vegetable:        "bg-lime-100 text-lime-700",
  legume:           "bg-orange-100 text-orange-700",
  dairy:            "bg-sky-100 text-sky-700",
  "low-carb":       "bg-violet-100 text-violet-700",
  seafood:          "bg-cyan-100 text-cyan-700",
  meat:             "bg-red-100 text-red-800",
  sushi:            "bg-rose-100 text-rose-600",
  "middle-eastern": "bg-amber-100 text-amber-800",
  soup:             "bg-orange-50 text-orange-700",
  cheese:           "bg-yellow-100 text-yellow-800",
  sausage:          "bg-red-100 text-red-700",
  japanese:         "bg-red-50 text-red-700",
  italian:          "bg-green-100 text-green-700",
  mexican:          "bg-orange-100 text-orange-700",
  korean:           "bg-pink-100 text-pink-700",
  pasta:            "bg-yellow-50 text-yellow-700",
  smoothie:         "bg-teal-100 text-teal-700",
  salad:            "bg-lime-100 text-lime-700",
};

// ── Food search combobox ──────────────────────────────────────────────────────
// ── Custom food create/edit modal ─────────────────────────────────────────────
function CustomFoodModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: CustomFood | null;
  onSave: (food: CustomFood) => void;
  onClose: () => void;
}) {
  const [name,        setName]        = useState(initial?.name        ?? "");
  const [calories,    setCalories]    = useState(String(initial?.calories    ?? ""));
  const [protein,     setProtein]     = useState(String(initial?.protein     ?? ""));
  const [carbs,       setCarbs]       = useState(String(initial?.carbs       ?? ""));
  const [fats,        setFats]        = useState(String(initial?.fats        ?? ""));
  const [defaultQty,  setDefaultQty]  = useState(String(initial?.defaultQty  ?? "100"));
  const [defaultUnit, setDefaultUnit] = useState(initial?.defaultUnit ?? "g");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // "Clone from DB" mini-search
  const [cloneQuery,   setCloneQuery]   = useState("");
  const [cloneResults, setCloneResults] = useState<any[]>([]);
  const [cloneOpen,    setCloneOpen]    = useState(false);

  useEffect(() => {
    const q = cloneQuery.trim();
    if (!q) { setCloneResults([]); setCloneOpen(false); return; }
    const t = setTimeout(() => {
      searchApi.foods(q, 10).then((r) => {
        setCloneResults(r.data.results);
        setCloneOpen(true);
      }).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [cloneQuery]);

  const applyClone = (f: any) => {
    setName(f.name);
    setCalories(String(f.calories));
    setProtein(String(f.protein ?? ""));
    setCarbs(String(f.carbs ?? ""));
    setFats(String(f.fats ?? ""));
    setDefaultQty(String(f.defaultQty));
    setDefaultUnit(f.defaultUnit);
    setCloneQuery("");
    setCloneOpen(false);
  };

  const handleSave = async () => {
    if (!name.trim())                         { setError("Name is required"); return; }
    if (!calories || isNaN(Number(calories))) { setError("Calories are required"); return; }
    if (Number(calories) < 0)                 { setError("Calories must be 0 or more"); return; }
    if (!defaultQty || Number(defaultQty) <= 0) { setError("Default quantity must be positive"); return; }
    if (!defaultUnit.trim())                  { setError("Default unit is required"); return; }

    setLoading(true); setError("");
    try {
      const payload = {
        name:        name.trim(),
        calories:    Math.round(Number(calories)),
        protein:     Number(protein  || 0),
        carbs:       Number(carbs    || 0),
        fats:        Number(fats     || 0),
        defaultQty:  Number(defaultQty),
        defaultUnit: defaultUnit.trim(),
        tags:        [] as string[],
      };
      let saved: CustomFood;
      if (initial) {
        const r = await customFoodsApi.update(initial.id, payload);
        saved = r.data.food;
      } else {
        const r = await customFoodsApi.create(payload);
        saved = r.data.food;
      }
      onSave(saved);
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to save custom food");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {!initial && (
        <div className="relative">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Start from a food in the database (optional)
          </p>
          <Input
            value={cloneQuery}
            onChange={(e) => setCloneQuery(e.target.value)}
            onBlur={() => setTimeout(() => setCloneOpen(false), 150)}
            placeholder="Search e.g. chicken breast..."
          />
          {cloneOpen && cloneResults.length > 0 && (
            <ul className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {cloneResults.map((f: any) => (
                <li
                  key={f.id}
                  onMouseDown={() => applyClone(f)}
                  className="px-4 py-2 hover:bg-brand-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{f.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {f.calories} kcal &middot; {f.defaultQty}{f.defaultUnit}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 border-b border-gray-100 dark:border-gray-700" />
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{error}</p>}

      <Input label="Food Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Protein Shake" />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Default Qty" type="number" min="0.1" step="any" value={defaultQty} onChange={(e) => setDefaultQty(e.target.value)} />
        <Input label="Default Unit" value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value)} placeholder="g, ml, serving..." />
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">Macros per serving (default qty above)</p>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Calories (kcal)" type="number" min="0" step="1" value={calories} onChange={(e) => setCalories(e.target.value)} />
        <Input label="Protein (g)" type="number" min="0" step="0.1" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="0" />
        <Input label="Carbs (g)" type="number" min="0" step="0.1" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="0" />
        <Input label="Fats (g)" type="number" min="0" step="0.1" value={fats} onChange={(e) => setFats(e.target.value)} placeholder="0" />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} loading={loading} className="flex-1">
          {initial ? "Save changes" : "Create food"}
        </Button>
      </div>
    </div>
  );
}

// ── Food search (global DB + My Foods tab) ────────────────────────────────────
function FoodSearch({ onSelect }: { onSelect: (item: any) => void }) {
  const [tab,       setTab]       = useState<"all" | "mine">("all");
  const [query,     setQuery]     = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [results,   setResults]   = useState<any[]>([]);
  const [open,      setOpen]      = useState(false);

  const [myFoods,       setMyFoods]       = useState<CustomFood[]>([]);
  const [myFoodsQuery,  setMyFoodsQuery]  = useState("");
  const [myFoodsLoaded, setMyFoodsLoaded] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFood,     setEditingFood]     = useState<CustomFood | null>(null);

  useEffect(() => {
    if (tab !== "mine" || myFoodsLoaded) return;
    customFoodsApi.list().then((r: any) => {
      setMyFoods(r.data.foods);
      setMyFoodsLoaded(true);
    }).catch(() => {});
  }, [tab, myFoodsLoaded]);

  const reloadMyFoods = () => {
    customFoodsApi.list().then((r: any) => setMyFoods(r.data.foods)).catch(() => {});
  };

  useEffect(() => {
    if (tab !== "all") return;
    const q = query.trim();
    if (!q && activeTags.length === 0) { setResults([]); setOpen(false); return; }
    const t = setTimeout(() => {
      searchApi.foods(q, 20, activeTags.length > 0 ? activeTags : undefined).then((r) => {
        setResults(r.data.results);
        setOpen(true);
      }).catch(() => {});
    }, q ? 200 : 0);
    return () => clearTimeout(t);
  }, [query, activeTags, tab]);

  const handleTagClick = (tag: string) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
    if (!query.trim()) setOpen(true);
  };

  const handleDeleteMyFood = async (id: number) => {
    if (!confirm("Delete this custom food?")) return;
    await customFoodsApi.delete(id);
    setMyFoods((prev) => prev.filter((f) => f.id !== id));
  };

  const filteredMyFoods = myFoods.filter((f) =>
    !myFoodsQuery.trim() || f.name.toLowerCase().includes(myFoodsQuery.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {/* Tab switcher */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            tab === "all"
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-brand-400"
          }`}
        >
          Food Database
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            tab === "mine"
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-amber-400"
          }`}
        >
          My Foods {myFoods.length > 0 && `(${myFoods.length})`}
        </button>
        <button
          type="button"
          onClick={() => { setEditingFood(null); setShowCreateModal(true); }}
          className="ml-auto px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 hover:bg-green-100 transition-all"
        >
          + New food
        </button>
      </div>

      {/* All Foods (global DB) */}
      {tab === "all" && (
        <>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => { setActiveTags([]); if (!query.trim()) setOpen(true); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                activeTags.length === 0
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-brand-400 hover:text-brand-600"
              }`}
            >
              All
            </button>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Cuisine</p>
              <div className="flex flex-wrap gap-1.5">
                {CUISINE_TAGS.map(({ tag, label, emoji }) => (
                  <button key={tag} type="button" onClick={() => handleTagClick(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${activeTags.includes(tag) ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-brand-400 hover:text-brand-600"}`}>
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Dietary Category</p>
              <div className="flex flex-wrap gap-1.5">
                {DIETARY_TAGS.map(({ tag, label, emoji }) => (
                  <button key={tag} type="button" onClick={() => handleTagClick(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${activeTags.includes(tag) ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-brand-400 hover:text-brand-600"}`}>
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Food Type</p>
              <div className="flex flex-wrap gap-1.5">
                {FOOD_TYPE_TAGS.map(({ tag, label, emoji }) => (
                  <button key={tag} type="button" onClick={() => handleTagClick(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${activeTags.includes(tag) ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-brand-400 hover:text-brand-600"}`}>
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => (query || activeTags.length > 0) && results.length > 0 && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Search food (e.g. chicken breast, oats)..."
              label="Search Food Database"
            />
            {open && results.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
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
                      className="px-4 py-2.5 hover:bg-brand-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{f.name}</p>
                        {visibleTags.length > 0 && (
                          <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                            {visibleTags.map((tag: string) => (
                              <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] ?? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {displayCal} kcal &middot; {f.defaultQty} {f.defaultUnit} &nbsp;|&nbsp;
                        P: {displayP}g &nbsp;C: {displayC}g &nbsp;F: {displayF}g
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            {open && results.length === 0 && (query.trim().length > 1 || activeTags.length > 0) && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                No results -- enter details manually below
              </div>
            )}
          </div>
        </>
      )}

      {/* My Foods */}
      {tab === "mine" && (
        <div className="space-y-2">
          <Input
            value={myFoodsQuery}
            onChange={(e) => setMyFoodsQuery(e.target.value)}
            placeholder="Filter my foods..."
            label="Search My Foods"
          />
          {filteredMyFoods.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
              {myFoods.length === 0
                ? "No custom foods yet. Hit + New food to create your first one."
                : "No foods match your filter."}
            </div>
          ) : (
            <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {filteredMyFoods.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 group transition-all"
                >
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onMouseDown={() => onSelect({ ...f, id: "custom-" + f.id })}
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {f.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {f.calories} kcal &middot; {f.defaultQty} {f.defaultUnit} &nbsp;|&nbsp;
                      P: {f.protein}g &nbsp;C: {f.carbs}g &nbsp;F: {f.fats}g
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingFood(f); setShowCreateModal(true); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-brand-600 transition-all text-sm"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMyFood(f.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all text-sm"
                    title="Delete"
                  >
                    Del
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showCreateModal && (
        <Modal
          open
          onClose={() => { setShowCreateModal(false); setEditingFood(null); }}
          title={editingFood ? "Edit custom food" : "Create custom food"}
        >
          <CustomFoodModal
            initial={editingFood}
            onSave={(saved) => {
              setShowCreateModal(false);
              setEditingFood(null);
              if (editingFood) {
                setMyFoods((prev) => prev.map((f) => f.id === saved.id ? saved : f));
              } else {
                setMyFoods((prev) => [...prev, saved]);
                setMyFoodsLoaded(true);
              }
              reloadMyFoods();
            }}
            onClose={() => { setShowCreateModal(false); setEditingFood(null); }}
          />
        </Modal>
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
  const [meal,     setMeal]     = useState<"breakfast" | "lunch" | "dinner" | "snack" | "">(
    (editItem?.meal as "breakfast" | "lunch" | "dinner" | "snack" | undefined) ?? ""
  );
  const [cookingOil,   setCookingOil]   = useState<keyof typeof COOKING_OILS>("none");
  const [breading,     setBreading]     = useState<keyof typeof BREADING_OPTIONS>("none");
  const [sweetener,    setSweetener]    = useState<keyof typeof SWEETENER_OPTIONS>("none");
  const [isCheatMeal,  setIsCheatMeal]  = useState(editItem?.isCheatMeal ?? false);
  const [showUnitRef, setShowUnitRef] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Store the selected food item's base nutrition (per 100g from DB)
  // so we can recalculate macros live when the user changes quantity.
  const [baseFood, setBaseFood] = useState<{
    calories: number; protein: number; carbs: number; fats: number;
    defaultQty: number; defaultUnit: string;
    name: string; tags?: string[];
  } | null>(null);

  // When user selects a food from search, auto-fill all fields
  const fillFromSearch = (item: any) => {
    setBaseFood({ ...item, name: item.name, tags: item.tags ?? [] });
    // Reset extras that don't apply to the new food
    if (!showsOil(item))       setCookingOil("none");
    if (!showsBreading(item))  setBreading("none");
    if (!showsSweetener(item)) setSweetener("none");
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
      const sweet = SWEETENER_OPTIONS[sweetener];
      const extraKcal  = oil.kcal  + bread.kcal  + sweet.kcal;
      const extraCarbs = bread.carbs + sweet.carbs;
      const extraFat   = oil.fat   + bread.fat;
      const payload = {
        foodName: foodName.trim(),
        calories: Math.round(Number(calories) + extraKcal),
        protein:  protein ? Number(protein) : undefined,
        carbs:    carbs   ? Math.round((Number(carbs) + extraCarbs) * 10) / 10 : extraCarbs > 0 ? extraCarbs : undefined,
        fats:     fats    ? Math.round((Number(fats) + extraFat) * 10) / 10 : extraFat > 0 ? extraFat : undefined,
        quantity: Number(quantity),
        unit:     unit.trim(),
        meal:        meal || undefined,
        date:        selectedDate,
        isCheatMeal: isCheatMeal || undefined,
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
          <div className="mt-2 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden text-xs">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-400 dark:text-gray-500 text-left">
                  <th className="px-3 py-1.5 font-medium">Unit</th>
                  <th className="px-3 py-1.5 font-medium">≈ grams</th>
                  <th className="px-3 py-1.5 font-medium hidden sm:table-cell">Note</th>
                </tr>
              </thead>
              <tbody>
                {UNIT_REFERENCE.map((r) => (
                  <tr key={r.unit} className="border-t border-gray-50">
                    <td className="px-3 py-1.5 text-gray-700 dark:text-gray-200 font-medium">{r.unit}</td>
                    <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">~{r.approxG}g</td>
                    <td className="px-3 py-1.5 text-gray-400 dark:text-gray-500 hidden sm:table-cell">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Macro fields — auto-filled from search, editable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

      {/* Cooking / topping additions — shown only when relevant to the selected food */}
      {(showsOil(baseFood) || showsBreading(baseFood) || showsSweetener(baseFood)) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">Cooking extras</p>
          <div className={`grid gap-3 ${
            [showsOil(baseFood), showsBreading(baseFood), showsSweetener(baseFood)].filter(Boolean).length === 1
              ? "grid-cols-1"
              : [showsOil(baseFood), showsBreading(baseFood), showsSweetener(baseFood)].filter(Boolean).length === 2
                ? "grid-cols-2"
                : "grid-cols-3"
          }`}>
            {showsOil(baseFood) && (
              <Select
                label="Cooking oil"
                value={cookingOil}
                onChange={(e) => setCookingOil(e.target.value as keyof typeof COOKING_OILS)}
                options={Object.entries(COOKING_OILS).map(([v, o]) => ({ value: v, label: o.label }))}
              />
            )}
            {showsBreading(baseFood) && (
              <Select
                label="Breading / coating"
                value={breading}
                onChange={(e) => setBreading(e.target.value as keyof typeof BREADING_OPTIONS)}
                options={Object.entries(BREADING_OPTIONS).map(([v, o]) => ({ value: v, label: o.label }))}
              />
            )}
            {showsSweetener(baseFood) && (
              <Select
                label="Sweetener / sugar"
                value={sweetener}
                onChange={(e) => setSweetener(e.target.value as keyof typeof SWEETENER_OPTIONS)}
                options={Object.entries(SWEETENER_OPTIONS).map(([v, o]) => ({ value: v, label: o.label }))}
              />
            )}
          </div>
          {(cookingOil !== "none" || breading !== "none" || sweetener !== "none") && (() => {
            const oil   = COOKING_OILS[cookingOil];
            const bread = BREADING_OPTIONS[breading];
            const sweet = SWEETENER_OPTIONS[sweetener];
            const totalKcal  = oil.kcal + bread.kcal + sweet.kcal;
            const totalCarbs = bread.carbs + sweet.carbs;
            const totalFat   = oil.fat + bread.fat;
            return (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Extras: +{totalKcal} kcal
                {totalCarbs > 0 && <> · +{totalCarbs}g carbs</>}
                {totalFat > 0   && <> · +{totalFat.toFixed(1)}g fat</>}
                {" "}— added at save
              </p>
            );
          })()}
        </div>
      )}

      <Select
        label="Meal"
        value={meal}
        onChange={(e) => setMeal(e.target.value as "breakfast" | "lunch" | "dinner" | "snack" | "")}
        options={MEAL_OPTIONS}
        placeholder="Select meal (optional)"
      />

      {/* Cheat meal toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          onClick={() => setIsCheatMeal((v) => !v)}
          className={`w-10 h-5 rounded-full transition-colors relative ${isCheatMeal ? "bg-orange-500" : "bg-gray-200"}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isCheatMeal ? "translate-x-5" : "translate-x-0.5"}`} />
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">
          🍕 Mark as cheat meal
        </span>
      </label>

      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={loading} onClick={submit}>
          {editItem ? "Save Changes" : "Log Food"}
        </Button>
      </div>
    </div>
  );
}

// ── Macro ring ────────────────────────────────────────────────────────────────
// When a goal is provided the arc fills toward that goal (and the % shown is
// goal-progress, which can exceed 100%).  Without a goal the arc shows the
// macro's share of total daily macros (distribution mode).
function MacroRing({ label, value, total, color, goal }: {
  label: string; value: number; total: number; color: string; goal?: number;
}) {
  // Raw progress toward goal (unbounded — can exceed 100)
  const rawGoalPct  = goal && goal > 0 ? (value / goal) * 100 : 0;
  // What to draw on the SVG arc — capped at 100 so it never wraps past full
  const arcPct      = goal && goal > 0
    ? Math.min(rawGoalPct, 100)
    : (total > 0 ? Math.min((value / total) * 100, 100) : 0);
  // What to display in the centre label — shows >100 when over goal
  const displayPct  = goal && goal > 0
    ? Math.round(rawGoalPct)
    : Math.round(arcPct);

  const over        = goal != null && rawGoalPct > 100;
  const met         = goal != null && rawGoalPct >= 100;
  const strokeColor = over ? "#ef4444" : met ? "#22c55e" : color;
  const glowFilter  =
    over ? "drop-shadow(0 0 6px rgba(239,68,68,0.60))"
    : met ? "drop-shadow(0 0 5px rgba(34,197,94,0.65))"
    : rawGoalPct >= 70 && goal ? "drop-shadow(0 0 5px rgba(59,130,246,0.55))"
    : "none";

  return (
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto" style={{ filter: glowFilter }}>
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={strokeColor} strokeWidth="3"
            strokeDasharray={`${arcPct} ${100 - arcPct}`} strokeLinecap="round" />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
          over ? "text-red-500" : met ? "text-green-500" : "text-gray-700 dark:text-gray-200"
        }`}>
          {displayPct}%
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${
        over ? "text-red-500" : met ? "text-green-500" : "text-gray-800 dark:text-gray-100"
      }`}>
        {Math.round(value)}g{goal ? <span className="font-normal text-gray-400">/{Math.round(goal)}g</span> : null}
      </p>
      {over && <p className="text-xs text-red-500 font-medium">Over goal</p>}
      {!over && met && <p className="text-xs text-green-500 font-medium">Goal met ✓</p>}
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
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Calorie composition</p>
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
          <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">
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
              <td className="py-2 text-right text-gray-700 dark:text-gray-200 dark:text-gray-200">{Math.round(r.g)}g</td>
              <td className="py-2 text-right text-gray-700 dark:text-gray-200 dark:text-gray-200">{r.cal} kcal</td>
              <td className="py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 w-7 text-right">{Math.round(r.pct)}%</span>
                </div>
              </td>
            </tr>
          ))}
          <tr className="font-semibold text-gray-800 dark:text-gray-100 text-sm border-t border-gray-200">
            <td className="pt-2.5">Total</td>
            <td className="pt-2.5 text-right">{Math.round(protein + carbs + fats)}g</td>
            <td className="pt-2.5 text-right">{total} kcal</td>
            <td className="pt-2.5 text-right text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">100%</td>
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
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">
                {MEAL_ICONS[meal] ?? "🍽️"}{" "}
                {meal === "other" ? "Other" : meal.charAt(0).toUpperCase() + meal.slice(1)}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">
                <span className="font-semibold text-gray-600 dark:text-gray-300 dark:text-gray-300">{Math.round(cal)}</span> kcal
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

      <div className="flex gap-4 justify-center text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-50">
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

// ── Macro by-food source table ────────────────────────────────────────────────
type SortKey = "name" | "protein" | "carbs" | "fats" | "calories";

function MacroByFood({ logs }: { logs: import("../../types").FoodLog[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("calories");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...logs].sort((a, b) => {
    let av = 0, bv = 0;
    if (sortKey === "name")     { av = a.foodName.localeCompare(b.foodName) as any; bv = 0; }
    else if (sortKey === "protein")  { av = a.protein  ?? 0; bv = b.protein  ?? 0; }
    else if (sortKey === "carbs")    { av = a.carbs    ?? 0; bv = b.carbs    ?? 0; }
    else if (sortKey === "fats")     { av = a.fats     ?? 0; bv = b.fats     ?? 0; }
    else                             { av = a.calories ?? 0; bv = b.calories ?? 0; }
    if (sortKey === "name") return sortAsc ? av : -av;
    return sortAsc ? av - bv : bv - av;
  });

  const totP = logs.reduce((s, l) => s + (l.protein  ?? 0), 0);
  const totC = logs.reduce((s, l) => s + (l.carbs    ?? 0), 0);
  const totF = logs.reduce((s, l) => s + (l.fats     ?? 0), 0);
  const totK = logs.reduce((s, l) => s + (l.calories ?? 0), 0);

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(k)}
      className="flex items-center gap-0.5 hover:text-gray-900 dark:hover:text-white transition font-semibold"
    >
      {label}
      <span className="text-[10px] opacity-60 ml-0.5">
        {sortKey === k ? (sortAsc ? "▲" : "▼") : "⇅"}
      </span>
    </button>
  );

  if (logs.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No foods logged yet today.</p>;
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs min-w-[380px]">
        <thead>
          <tr className="text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
            <th className="text-left py-2 px-2"><SortBtn k="name" label="Food" /></th>
            <th className="text-right py-2 px-2 text-blue-500"><SortBtn k="protein" label="Protein" /></th>
            <th className="text-right py-2 px-2 text-amber-500"><SortBtn k="carbs" label="Carbs" /></th>
            <th className="text-right py-2 px-2 text-red-500"><SortBtn k="fats" label="Fat" /></th>
            <th className="text-right py-2 px-2"><SortBtn k="calories" label="kcal" /></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((log) => {
            const pPct = totP > 0 ? ((log.protein ?? 0) / totP) * 100 : 0;
            const cPct = totC > 0 ? ((log.carbs   ?? 0) / totC) * 100 : 0;
            const fPct = totF > 0 ? ((log.fats    ?? 0) / totF) * 100 : 0;
            return (
              <tr key={log.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                <td className="py-2 px-2">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[140px]">{log.foodName}</p>
                  <p className="text-gray-400 dark:text-gray-500 text-[10px]">
                    {log.quantity}{log.unit}{log.meal ? ` · ${log.meal}` : ""}
                  </p>
                </td>
                <td className="py-2 px-2 text-right">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{Math.round(log.protein ?? 0)}g</span>
                  {pPct > 0 && <div className="h-1 bg-blue-200 dark:bg-blue-900 rounded mt-0.5 ml-auto" style={{ width: `${Math.round(pPct)}%`, minWidth: "2px", maxWidth: "100%", backgroundColor: "#3b82f6", opacity: 0.5 }} />}
                </td>
                <td className="py-2 px-2 text-right">
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{Math.round(log.carbs ?? 0)}g</span>
                  {cPct > 0 && <div className="h-1 bg-amber-200 dark:bg-amber-900 rounded mt-0.5 ml-auto" style={{ width: `${Math.round(cPct)}%`, minWidth: "2px", maxWidth: "100%", backgroundColor: "#f59e0b", opacity: 0.5 }} />}
                </td>
                <td className="py-2 px-2 text-right">
                  <span className="font-semibold text-red-500 dark:text-red-400">{Math.round(log.fats ?? 0)}g</span>
                  {fPct > 0 && <div className="h-1 bg-red-200 dark:bg-red-900 rounded mt-0.5 ml-auto" style={{ width: `${Math.round(fPct)}%`, minWidth: "2px", maxWidth: "100%", backgroundColor: "#ef4444", opacity: 0.5 }} />}
                </td>
                <td className="py-2 px-2 text-right font-medium text-gray-700 dark:text-gray-300">
                  {Math.round(log.calories)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 dark:border-gray-600 font-bold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50">
            <td className="py-2 px-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</td>
            <td className="py-2 px-2 text-right text-blue-600 dark:text-blue-400">{Math.round(totP)}g</td>
            <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">{Math.round(totC)}g</td>
            <td className="py-2 px-2 text-right text-red-500 dark:text-red-400">{Math.round(totF)}g</td>
            <td className="py-2 px-2 text-right">{Math.round(totK)}</td>
          </tr>
        </tfoot>
      </table>
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

  // Glow: blue at >=70%, green at >=100%
  const fillColor = over ? "#ef4444" : pct >= 100 ? "#22c55e" : color;
  const glowStyle: React.CSSProperties =
    over
      ? { boxShadow: "0 0 8px 2px rgba(239,68,68,0.50)" }
      : pct >= 100
      ? { boxShadow: "0 0 8px 2px rgba(34,197,94,0.45)" }
      : pct >= 70
      ? { boxShadow: "0 0 8px 2px rgba(59,130,246,0.40)" }
      : {};

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <span className={over ? "text-red-500 font-semibold" : pct >= 100 ? "text-green-600 font-semibold" : "text-gray-500"}>
          <span className="font-bold text-gray-800 dark:text-gray-100">{Math.round(consumed)}</span>
          {" / "}{Math.round(target)}g
          {over
            ? <span className="ml-1 text-red-500">(+{diff}g)</span>
            : pct >= 100
            ? <span className="ml-1 text-green-500">✓</span>
            : <span className="ml-1 text-gray-400 dark:text-gray-500">({diff}g left)</span>
          }
        </span>
      </div>
      <div className={`h-2.5 rounded-full overflow-hidden ${bgColor}`} style={glowStyle}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: fillColor }}
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
      <div className="flex justify-between mt-1.5 text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">
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
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">Nutritionist is building your plan…</p>
        </div>
      )}

      {status === "done" && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="text-5xl">✅</div>
          <p className="font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100">Meals logged successfully!</p>
        </div>
      )}

      {(status === "preview" || status === "logging") && plan && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex gap-4 bg-brand-50 rounded-xl px-4 py-3 text-sm">
            <span className="font-semibold text-brand-700">{plan.totalCalories} kcal</span>
            <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">P: {plan.totalProtein}g</span>
            <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">C: {plan.totalCarbs}g</span>
            <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">F: {plan.totalFats}g</span>
          </div>

          {/* Meals */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {plan.meals.map((m) => (
              <div key={m.meal} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2 capitalize">
                  {MEAL_ICONS[m.meal]} {m.meal}
                </p>
                {m.items.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">No items</p>
                ) : (
                  <table className="w-full text-xs text-gray-600 dark:text-gray-300 dark:text-gray-300">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 dark:text-gray-500">
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

          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
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
        <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-700/50">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 dark:text-gray-200">Add ingredient</p>
          <FoodSearch onSelect={(f) => { setSelFood(f); setSelUnit(f.defaultUnit); setSelQty(String(f.defaultQty)); }} />
          {selFood && (
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-24">
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1 font-medium">{selFood.name}</p>
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
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
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
          <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 dark:border-gray-700">
                  <th className="text-left px-3 py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">Ingredient</th>
                  <th className="text-right px-2 py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">Kcal</th>
                  <th className="text-right px-2 py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">P</th>
                  <th className="text-right px-2 py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">C</th>
                  <th className="text-right px-2 py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">F</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200 text-xs">
                      {ing.food.name}
                      <span className="text-gray-400 dark:text-gray-500 ml-1">({ing.qty} {ing.unit})</span>
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
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-300 mb-1.5">
              <input
                type="checkbox"
                checked={logSeparate}
                onChange={(e) => setLogSeparate(e.target.checked)}
                className="rounded border-gray-300"
              />
              Log ingredients separately
            </label>
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">
              {logSeparate ? "Each ingredient logged individually" : "Logged as one combined dish entry"}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
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
// ── Menstrual cycle phase helpers ─────────────────────────────────────────────
type CyclePhase = {
  name: "Menstruation" | "Follicular" | "Ovulation" | "Luteal";
  day: number;
  emoji: string;
  color: string;
  nutritionTip: string;
  workoutTip: string;
};

function getCyclePhase(periodStart: string, cycleLength = 28): CyclePhase | null {
  const start = new Date(periodStart);
  if (isNaN(start.getTime())) return null;
  const today = new Date();
  const daysSince = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (daysSince < 0) return null;
  const dayOfCycle = (daysSince % cycleLength) + 1;

  if (dayOfCycle <= 5) return {
    name: "Menstruation", day: dayOfCycle, emoji: "🔴",
    color: "border-red-200 bg-red-50 text-red-800",
    nutritionTip: "Boost iron (red meat, lentils, spinach) and anti-inflammatory foods (omega-3, berries, ginger). Avoid excess sodium to reduce bloating.",
    workoutTip: "Gentle movement is ideal — yoga, walks, light cycling. Skip very heavy lifting if you feel fatigued.",
  };
  if (dayOfCycle <= 13) return {
    name: "Follicular", day: dayOfCycle, emoji: "🟢",
    color: "border-green-200 bg-green-50 text-green-800",
    nutritionTip: "Rising oestrogen boosts insulin sensitivity. Slightly increase carbs to fuel higher-energy sessions.",
    workoutTip: "Great time to push intensity — strength training, intervals, and new exercises respond well.",
  };
  if (dayOfCycle <= 16) return {
    name: "Ovulation", day: dayOfCycle, emoji: "🟡",
    color: "border-yellow-200 bg-yellow-50 text-yellow-800",
    nutritionTip: "Peak performance window. Maintain protein and carbs. Zinc (pumpkin seeds, meat) supports hormonal balance.",
    workoutTip: "Peak strength and energy. Ideal for PRs, HIIT, and high-volume sessions. Warm up well — laxity increases near ovulation.",
  };
  return {
    name: "Luteal", day: dayOfCycle, emoji: "🟣",
    color: "border-purple-200 bg-purple-50 text-purple-800",
    nutritionTip: "Cravings and hunger increase — prioritise magnesium (dark chocolate, nuts, seeds) and fibre to manage them. You need ~100–300 kcal more.",
    workoutTip: "Moderate your intensity as progesterone rises. Strength is maintained but recovery takes longer — prioritise sleep and rest days.",
  };
}

function CyclePhaseBanner({ periodStart, cycleLength }: { periodStart: string; cycleLength?: number | null }) {
  const [open, setOpen] = useState(false);
  const phase = getCyclePhase(periodStart, cycleLength ?? 28);
  if (!phase) return null;

  return (
    <div className={`rounded-2xl border px-4 py-3 ${phase.color}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{phase.emoji}</span>
          <div>
            <p className="font-semibold text-sm">{phase.name} phase — Day {phase.day}</p>
            <p className="text-xs opacity-70">Tap to see phase-specific nutrition & workout tips</p>
          </div>
        </div>
        <span className="text-sm opacity-60">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 border-t border-current border-opacity-20 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold mb-1">🥗 Nutrition</p>
            <p className="text-xs leading-relaxed opacity-90">{phase.nutritionTip}</p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1">🏋️ Training</p>
            <p className="text-xs leading-relaxed opacity-90">{phase.workoutTip}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatFastingDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// ── Main Nutrition page ───────────────────────────────────────────────────────
export default function NutritionPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [date,     setDate]     = useState(() => sessionStorage.getItem("nutrition_date") ?? new Date().toISOString().split("T")[0]);
  const setDatePersist = (d: string) => { sessionStorage.setItem("nutrition_date", d); setDate(d); };

  // TASK 2: Reset date if saved date is more than 7 days in the past
  useEffect(() => {
    const saved = sessionStorage.getItem("nutrition_date");
    if (saved) {
      const diff = Math.abs(new Date().getTime() - new Date(saved).getTime());
      if (diff > 7 * 24 * 3600 * 1000) {
        const today = new Date().toISOString().split("T")[0];
        sessionStorage.setItem("nutrition_date", today);
        setDate(today);
      }
    }
  }, []);
  const [logs,     setLogs]     = useState<FoodLog[]>([]);
  const [totals,   setTotals]   = useState<FoodTotals>({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [loading,  setLoading]  = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editItem,    setEditItem]    = useState<FoodLog | null>(null);
  const [deleting,    setDeleting]    = useState<number | null>(null);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [showDish,     setShowDish]     = useState(false);
  const [activeGoal,  setActiveGoal]  = useState<CalorieGoal | null>(null);
  const [macroView,   setMacroView]   = useState<"distribution" | "breakdown" | "by-meal" | "by-food" | "goals">(() => (sessionStorage.getItem("macro_view") as any) ?? "distribution");
  const setMacroViewPersist = (v: "distribution" | "breakdown" | "by-meal" | "by-food" | "goals") => { sessionStorage.setItem("macro_view", v); setMacroView(v); };

  // ── Supplements ──────────────────────────────────────────────────────────────
  const SUPPLEMENT_DEFS = {
    creatine:     { name: "Creatine Monohydrate", emoji: "💊", unit: "g",     defaultQty: 5,  cal: 0,   p: 0,  c: 0,  f: 0   },
    omega3:       { name: "Omega-3 Fish Oil",      emoji: "🐟", unit: "caps",  defaultQty: 3,  cal: 9,   p: 0,  c: 0,  f: 1   },
    whey:         { name: "Whey Protein Shake",    emoji: "🥤", unit: "scoop", defaultQty: 1,  cal: 120, p: 25, c: 5,  f: 2   },
    casein:       { name: "Casein Protein Shake",  emoji: "🌙", unit: "scoop", defaultQty: 1,  cal: 120, p: 24, c: 6,  f: 1.5 },
    plant:        { name: "Plant Protein Shake",   emoji: "🌿", unit: "scoop", defaultQty: 1,  cal: 110, p: 20, c: 8,  f: 3   },
    mass_gainer:  { name: "Mass Gainer Shake",     emoji: "💪", unit: "scoop", defaultQty: 1,  cal: 380, p: 25, c: 65, f: 5   },
  };
  type SuppId = keyof typeof SUPPLEMENT_DEFS;

  interface SuppState { enabled: boolean; qty: number; }
  const initSupplements = (): Record<SuppId, SuppState> => {
    try {
      const s = localStorage.getItem("supplement_prefs_v2");
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return {
      creatine: { enabled: false, qty: 5 },
      omega3:   { enabled: false, qty: 3 },
      whey:     { enabled: false, qty: 1 },
      casein:   { enabled: false, qty: 0 },
      plant:    { enabled: false, qty: 0 },
      mass_gainer: { enabled: false, qty: 0 },
    };
  };
  const [supplements, setSupplements] = useState<Record<SuppId, SuppState>>(initSupplements);

  const updateSupp = (id: SuppId, patch: Partial<SuppState>) => {
    setSupplements((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      try { localStorage.setItem("supplement_prefs_v2", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // ── Supplement macro overrides ──────────────────────────────────────────────
  interface SuppMacroOverride { cal: number; p: number; c: number; f: number; }
  const initSuppMacroOverrides = (): Partial<Record<SuppId, SuppMacroOverride>> => {
    try {
      const s = localStorage.getItem("supplement_macros_v1");
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return {};
  };
  const [suppMacroOverrides, setSuppMacroOverrides] = useState(initSuppMacroOverrides);
  const [editingSupp,  setEditingSupp]  = useState<SuppId | null>(null);
  const [suppEditDraft, setSuppEditDraft] = useState<SuppMacroOverride>({ cal: 0, p: 0, c: 0, f: 0 });

  // Effective macros per unit: user override ▷ SUPPLEMENT_DEFS default
  const getSuppMacros = (id: SuppId): SuppMacroOverride => {
    const def = SUPPLEMENT_DEFS[id];
    return suppMacroOverrides[id] ?? { cal: def.cal, p: def.p, c: def.c, f: def.f };
  };

  const openSuppEdit = (e: React.MouseEvent, id: SuppId) => {
    e.stopPropagation();
    setSuppEditDraft(getSuppMacros(id));
    setEditingSupp(id);
  };

  const saveSuppEdit = () => {
    if (!editingSupp) return;
    setSuppMacroOverrides((prev) => {
      const next = { ...prev, [editingSupp]: suppEditDraft };
      try { localStorage.setItem("supplement_macros_v1", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setEditingSupp(null);
  };

  const resetSuppEdit = (id: SuppId) => {
    setSuppMacroOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      try { localStorage.setItem("supplement_macros_v1", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setEditingSupp(null);
  };

  // Compute supplement macros to add to totals
  const suppMacros = (Object.entries(supplements) as [SuppId, SuppState][])
    .filter(([, s]) => s.enabled && s.qty > 0)
    .reduce((acc, [id, s]) => {
      const def = SUPPLEMENT_DEFS[id];
      const mult = s.qty / def.defaultQty;
      const m = getSuppMacros(id);
      return {
        calories: acc.calories + m.cal * mult,
        protein:  acc.protein  + m.p   * mult,
        carbs:    acc.carbs    + m.c   * mult,
        fats:     acc.fats     + m.f   * mult,
      };
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

  // ── Water tracking ───────────────────────────────────────────────────────────
  const getTrackWaterPref = () => {
    try {
      const s = localStorage.getItem("app_prefs_v1");
      if (s) return JSON.parse(s).trackWater !== false;
    } catch { /* ignore */ }
    return true;
  };
  const [trackWater,  setTrackWater]  = useState(getTrackWaterPref);
  const [waterLogs,   setWaterLogs]   = useState<WaterLog[]>([]);
  const [waterTotal,  setWaterTotal]  = useState(0);
  const [waterTarget, setWaterTarget] = useState(user?.waterTargetMl ?? 2000);
  const [addingWater, setAddingWater] = useState(false);
  const [waterError,  setWaterError]  = useState("");

  // Re-sync trackWater if the user changes it in Settings (same session)
  useEffect(() => {
    const onStorage = () => setTrackWater(getTrackWaterPref());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const loadWater = useCallback(async () => {
    try {
      const res = await waterApi.getToday(date);
      setWaterLogs(res.data.logs);
      setWaterTotal(res.data.totalMl);
      setWaterTarget(res.data.targetMl);
    } catch { /* silent */ }
  }, [date]);

  useEffect(() => { loadWater(); }, [loadWater]);

  const handleAddWater = async (ml: number) => {
    if (addingWater) return;
    setAddingWater(true);
    setWaterError("");
    try {
      await waterApi.log(ml, date);
      await loadWater();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Failed to log water — try again";
      setWaterError(msg);
    } finally { setAddingWater(false); }
  };

  const handleDeleteWater = async (id: number) => {
    setWaterError("");
    try {
      await waterApi.delete(id);
      await loadWater();
    } catch (e: any) {
      setWaterError(e?.response?.data?.error || "Failed to remove entry");
    }
  };

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
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to delete entry. Please try again.");
    } finally { setDeleting(null); }
  };

  // Merge food log totals with active supplement macros
  const effectiveTotals = {
    calories: totals.calories + suppMacros.calories,
    protein:  totals.protein  + suppMacros.protein,
    carbs:    totals.carbs    + suppMacros.carbs,
    fats:     totals.fats     + suppMacros.fats,
  };

  const totalMacroG = effectiveTotals.protein + effectiveTotals.carbs + effectiveTotals.fats;
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

  // ── Quick re-log (frequent foods) ───────────────────────────────────────────
  type FrequentFood = { foodName: string; calories: number; protein: number | null; carbs: number | null; fats: number | null; quantity: number; unit: string; meal: string | null; timesLogged: number };
  const [frequentFoods, setFrequentFoods] = useState<FrequentFood[]>([]);

  // ── Favourites (localStorage) ────────────────────────────────────────────
  const FAVS_KEY = "fitai_fav_foods";
  const loadFavs = (): FoodLog[] => { try { return JSON.parse(localStorage.getItem(FAVS_KEY) ?? "[]"); } catch { return []; } };
  const [favFoods, setFavFoods] = useState<FoodLog[]>(loadFavs);
  const toggleFav = (log: FoodLog) => {
    setFavFoods((prev) => {
      const exists = prev.some((f) => f.foodName === log.foodName);
      const next   = exists ? prev.filter((f) => f.foodName !== log.foodName) : [log, ...prev].slice(0, 20);
      localStorage.setItem(FAVS_KEY, JSON.stringify(next));
      return next;
    });
  };
  const isFav = (name: string) => favFoods.some((f) => f.foodName === name);
  const relogFav = async (fav: FoodLog) => {
    try {
      await foodApi.log({ foodName: fav.foodName, calories: fav.calories, protein: fav.protein ?? undefined, carbs: fav.carbs ?? undefined, fats: fav.fats ?? undefined, quantity: fav.quantity, unit: fav.unit, date });
      await load();
    } catch { /* silent */ }
  };
  const [relogging,     setRelogging]     = useState<string | null>(null);

  useEffect(() => {
    foodApi.frequent(5).then((r) => setFrequentFoods(r.data.frequent)).catch(() => {});
  }, []);

  const handleQuickRelog = async (food: FrequentFood) => {
    if (relogging) return;
    setRelogging(food.foodName);
    try {
      await foodApi.log({
        foodName: food.foodName,
        calories: food.calories,
        ...(food.protein != null && { protein: food.protein }),
        ...(food.carbs   != null && { carbs:   food.carbs }),
        ...(food.fats    != null && { fats:    food.fats }),
        quantity: food.quantity,
        unit:     food.unit,
        ...(food.meal && { meal: food.meal as FoodLog["meal"] }),
        date,
      });
      await load();
    } catch { /* silent */ }
    finally { setRelogging(null); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header + date nav */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Nutrition</h1>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-1">{format(parseISO(date), "EEEE, MMMM d")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm"
            onClick={() => setDatePersist(subDays(parseISO(date), 1).toISOString().split("T")[0])}>←</Button>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDatePersist(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button variant="secondary" size="sm"
            disabled={isToday}
            onClick={() => setDatePersist(addDays(parseISO(date), 1).toISOString().split("T")[0])}>→</Button>
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

      {/* Daily summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Calories card ── */}
        <Card className="lg:col-span-1">
          <CardHeader title="Calories" />
          <div className="text-center py-2">
            <p className="text-4xl font-bold text-gray-900 dark:text-white dark:text-white">{Math.round(effectiveTotals.calories)}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">kcal consumed{suppMacros.calories > 0 ? <span className="text-purple-600"> (incl. supps)</span> : ""}</p>
            {hasGoal && (
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">
                Goal: <span className="font-semibold text-gray-700 dark:text-gray-200 dark:text-gray-200">{Math.round(activeGoal!.dailyCalories)} kcal</span>
              </p>
            )}
          </div>

          {/* Progress bar — only shown when there's a goal */}
          {hasGoal && effectiveTotals.calories > 0 && (
            <CalorieProgress consumed={effectiveTotals.calories} target={activeGoal!.dailyCalories} />
          )}

          {/* Deficit/surplus banner — only shown when goal exists and food logged */}
          {hasGoal && effectiveTotals.calories > 0 && (
            <DeficitSurplusBanner
              consumed={effectiveTotals.calories}
              target={activeGoal!.dailyCalories}
              goalType={activeGoal!.type}
            />
          )}

          {/* No goal nudge */}
          {!hasGoal && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
              <button
                onClick={() => navigate("/goals")}
                className="text-brand-600 hover:underline"
              >Set a calorie goal</button> to track limits & deficit/surplus
            </p>
          )}

          <div className="flex justify-around pt-4 border-t border-gray-100 dark:border-gray-700 text-center mt-3">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">Entries</p>
              <p className="font-bold text-gray-800 dark:text-gray-100 dark:text-gray-100">{logs.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">Meals</p>
              <p className="font-bold text-gray-800 dark:text-gray-100 dark:text-gray-100">{Object.keys(grouped).length}</p>
            </div>
            {hasGoal && (
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">TDEE</p>
                <p className="font-bold text-gray-800 dark:text-gray-100 dark:text-gray-100">{Math.round(activeGoal!.tdee ?? 0)}</p>
              </div>
            )}
          </div>
        </Card>

        {/* ── Macronutrients card ── */}
        <Card className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">Macronutrients</h3>

            {/* View toggle — always visible; "vs Goals" only when a goal exists */}
            <div className="flex flex-wrap gap-0.5 bg-gray-100 rounded-lg p-0.5 text-xs overflow-x-auto">
              {([
                { key: "distribution", label: "🍩 Rings"      },
                { key: "breakdown",    label: "📊 Breakdown"  },
                { key: "by-meal",      label: "🍽️ Meals"     },
                { key: "by-food",      label: "🔍 Foods"     },
                ...(hasGoal ? [{ key: "goals", label: "🎯 Goals" }] : []),
              ] as { key: typeof macroView; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMacroViewPersist(key)}
                  className={`px-2 py-1 rounded-md font-medium transition-all whitespace-nowrap ${
                    macroView === key
                      ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700"
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
                  <MacroRing label="Protein" value={effectiveTotals.protein} total={totalMacroG} color="#3b82f6" goal={activeGoal?.proteinGrams} />
                  <MacroRing label="Carbs"   value={effectiveTotals.carbs}   total={totalMacroG} color="#f59e0b" goal={activeGoal?.carbsGrams} />
                  <MacroRing label="Fats"    value={effectiveTotals.fats}    total={totalMacroG} color="#ef4444" goal={activeGoal?.fatsGrams} />
                  <div className="text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Calories from macros</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">
                      {Math.round(effectiveTotals.protein * 4 + effectiveTotals.carbs * 4 + effectiveTotals.fats * 9)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-500">kcal</p>
                  </div>
                </div>
              )}

              {/* 📊 Breakdown — stacked calorie bar + gram/kcal/% table */}
              {macroView === "breakdown" && (
                <MacroBreakdown
                  protein={effectiveTotals.protein}
                  carbs={effectiveTotals.carbs}
                  fats={effectiveTotals.fats}
                />
              )}

              {/* 🍽️ By Meal — per-meal stacked bars */}
              {macroView === "by-meal" && (
                <MacroByMeal grouped={grouped} mealOrder={mealOrder} />
              )}

              {/* 🔍 By Food — per-food macro source table */}
              {macroView === "by-food" && (
                <MacroByFood logs={logs} />
              )}

              {/* 🎯 vs Goals — progress bars against calorie goal targets */}
              {macroView === "goals" && hasGoal && (
                <div className="space-y-4 pt-1">
                  <MacroGoalBar
                    label="🥩 Protein"
                    consumed={effectiveTotals.protein}
                    target={activeGoal!.proteinGrams}
                    color="#3b82f6"
                    bgColor="bg-blue-100"
                  />
                  <MacroGoalBar
                    label="🍞 Carbohydrates"
                    consumed={effectiveTotals.carbs}
                    target={activeGoal!.carbsGrams}
                    color="#f59e0b"
                    bgColor="bg-amber-100"
                  />
                  <MacroGoalBar
                    label="🥑 Fats"
                    consumed={effectiveTotals.fats}
                    target={activeGoal!.fatsGrams}
                    color="#ef4444"
                    bgColor="bg-red-100"
                  />
                  <div className="text-xs text-gray-400 dark:text-gray-500 text-right pt-1">
                    From goal: {activeGoal!.name ?? activeGoal!.type}
                    {" · "}{Math.round(activeGoal!.dailyCalories)} kcal / day
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-500">Log food to see macro breakdown</p>
              <Button size="sm" onClick={() => setShowForm(true)}>Log First Meal</Button>
            </div>
          )}
        </Card>
      </div>

      {/* Hormonal cycle phase banner — shown for female users with periodStart set */}
      {user?.sex === "female" && user.periodStart && (
        <CyclePhaseBanner periodStart={user.periodStart} cycleLength={user.cycleLength} />
      )}

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

      {/* ── Favourites ─────────────────────────────────────────────────────────── */}
      {favFoods.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">Favourites</p>
          <div className="flex gap-2 flex-wrap">
            {favFoods.map((fav) => (
              <button
                key={fav.foodName}
                onClick={() => relogFav(fav)}
                className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 hover:border-amber-400 text-gray-700 dark:text-gray-200 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors"
                title={`${fav.quantity} ${fav.unit}`}
              >
                <span className="truncate max-w-[120px]">{fav.foodName}</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold flex-shrink-0">{fav.calories} kcal</span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFav(fav); }}
                  className="text-amber-300 hover:text-red-400 font-bold leading-none ml-0.5"
                  title="Remove from favourites"
                >×</button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Re-log ──────────────────────────────────────────────────── */}
      {frequentFoods.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-2">⚡ Quick Re-log</p>
          <div className="flex gap-2 flex-wrap">
            {frequentFoods.map((food) => (
              <button
                key={food.foodName}
                disabled={!!relogging}
                onClick={() => handleQuickRelog(food)}
                className="flex items-center gap-1.5 bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-gray-700 dark:text-gray-200 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={`${food.timesLogged}× logged · ${food.quantity} ${food.unit}`}
              >
                {relogging === food.foodName && (
                  <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
                <span className="truncate max-w-[120px]">{food.foodName}</span>
                <span className="text-amber-600 font-semibold flex-shrink-0">{food.calories} kcal</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Water tracking widget ─────────────────────────────────────────── */}
      {trackWater && <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100">💧 Water Intake</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">
            <span className="font-bold text-blue-600">{Math.round(waterTotal / 100) / 10}L</span>
            {" / "}
            {Math.round(waterTarget / 100) / 10}L
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-blue-400 transition-all duration-500"
            style={{ width: `${Math.min(100, (waterTotal / waterTarget) * 100)}%` }}
          />
        </div>

        {/* Error banner */}
        {waterError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 mb-2">
            ⚠️ {waterError}
          </p>
        )}

        {/* Quick-add buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          {[150, 200, 350, 500, 750, 1000].map((ml) => (
            <button
              key={ml}
              onClick={() => handleAddWater(ml)}
              disabled={addingWater}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +{ml < 1000 ? `${ml}ml` : "1L"}
            </button>
          ))}
          {addingWater && (
            <span className="flex items-center gap-1.5 text-xs text-blue-500">
              <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />
              Adding…
            </span>
          )}
        </div>

        {/* Recent logs today */}
        {waterLogs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {waterLogs.map((w) => (
              <span
                key={w.id}
                className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 border border-blue-100"
              >
                💧{w.amount}ml
                <button
                  onClick={() => handleDeleteWater(w.id)}
                  className="text-blue-300 hover:text-red-400 font-bold leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {waterTotal >= waterTarget && (
          <p className="mt-2 text-xs text-green-600 font-medium">✅ Daily target reached! Great job staying hydrated.</p>
        )}
      </Card>}

      {/* Supplements widget */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">💊 Supplements</h3>
          {suppMacros.calories > 0 && (
            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
              +{Math.round(suppMacros.calories)} kcal · +{Math.round(suppMacros.protein)}g protein added
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(Object.entries(SUPPLEMENT_DEFS) as [SuppId, typeof SUPPLEMENT_DEFS[SuppId]][]).map(([id, def]) => {
            const s = supplements[id];
            const m = getSuppMacros(id as SuppId);
            const hasOverride = !!suppMacroOverrides[id as SuppId];
            const macroLine = [
              m.cal > 0 ? `${Math.round(m.cal * (s.qty / def.defaultQty))} kcal` : null,
              m.p  > 0 ? `${Math.round(m.p  * (s.qty / def.defaultQty))}g P` : null,
            ].filter(Boolean).join(" · ");
            const isEditing = editingSupp === id;
            return (
              <div key={id} className="relative">
                {/* Normal card */}
                {!isEditing && (
                  <div
                    onClick={() => updateSupp(id as SuppId, { enabled: !s.enabled })}
                    className={`relative cursor-pointer rounded-xl border p-2.5 text-center transition-all select-none ${
                      s.enabled
                        ? "border-purple-400 bg-purple-50 shadow-sm"
                        : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    {/* Edit macros button */}
                    <button
                      onClick={(e) => openSuppEdit(e, id as SuppId)}
                      title="Edit macros per unit"
                      className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors z-10 ${
                        hasOverride
                          ? "bg-amber-400 text-white"
                          : "bg-gray-100 text-gray-400 dark:text-gray-500 hover:bg-gray-200 hover:text-gray-600"
                      }`}
                    >✏️</button>

                    <div className="text-2xl mb-1">{def.emoji}</div>
                    <p className={`text-xs font-semibold leading-tight ${s.enabled ? "text-purple-800" : "text-gray-700"}`}>{def.name}</p>
                    {/* Qty editor */}
                    <div className="flex items-center justify-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => updateSupp(id as SuppId, { qty: Math.max(0, s.qty - 1) })}
                        className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200"
                      >−</button>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 w-6 text-center">{s.qty}</span>
                      <button
                        onClick={() => updateSupp(id as SuppId, { qty: s.qty + 1 })}
                        className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200"
                      >+</button>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-500">{def.unit}</span>
                    </div>
                    {s.enabled && macroLine && (
                      <p className="text-[10px] text-purple-600 mt-1 font-medium">{macroLine}</p>
                    )}
                    {s.enabled && (
                      <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">✓</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline macro editor */}
                {isEditing && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-center">
                    <p className="text-xs font-semibold text-amber-800 mb-2">{def.emoji} Macros / {def.defaultQty} {def.unit}</p>
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      {(["cal", "p", "c", "f"] as const).map((key) => (
                        <div key={key} className="text-left">
                          <label className="text-[9px] text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase font-semibold">{key === "cal" ? "kcal" : key === "p" ? "prot" : key === "c" ? "carbs" : "fat"}</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={suppEditDraft[key]}
                            onChange={(e) => setSuppEditDraft((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                            className="w-full rounded border border-gray-200 px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 justify-center">
                      <button onClick={saveSuppEdit}    className="text-[10px] px-2 py-1 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600">Save</button>
                      <button onClick={() => resetSuppEdit(id as SuppId)} className="text-[10px] px-2 py-1 rounded-lg bg-gray-100 text-gray-600 dark:text-gray-300 hover:bg-gray-200">Reset</button>
                      <button onClick={() => setEditingSupp(null)} className="text-[10px] px-2 py-1 rounded-lg bg-gray-100 text-gray-600 dark:text-gray-300 hover:bg-gray-200">✕</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">Click to toggle · ✏️ edits macros per unit · preferences saved automatically</p>
      </Card>

      {/* Food log by meal */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="text-center py-14">
          <div className="text-5xl mb-3">🥗</div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Nothing logged yet</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
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
                      <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">
                        {MEAL_ICONS[meal] ?? "🍽️"}{" "}
                        {meal === "other" ? "Other" : meal.charAt(0).toUpperCase() + meal.slice(1)}
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
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
                        <tr className="border-b border-gray-100 dark:border-gray-700 dark:border-gray-700">
                          <th className="text-left py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">Food</th>
                          <th className="text-right py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">Qty</th>
                          <th className="text-right py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">Kcal</th>
                          <th className="text-right py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">P</th>
                          <th className="text-right py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">C</th>
                          <th className="text-right py-2 text-xs text-gray-400 dark:text-gray-500 font-medium">F</th>
                          <th className="w-16" />
                        </tr>
                      </thead>
                      <tbody>
                        {mealLogs.map((log) => (
                          <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="py-2.5 font-medium text-gray-800 dark:text-gray-100 dark:text-gray-100">
                              {log.foodName}
                              {log.isCheatMeal && <span className="ml-1.5 text-xs">🍕</span>}
                            </td>
                            <td className="py-2.5 text-right text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-500">{log.quantity}{log.unit}</td>
                            <td className="py-2.5 text-right font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100">{Math.round(log.calories)}</td>
                            <td className="py-2.5 text-right text-blue-600">{log.protein != null ? Math.round(log.protein) : "—"}</td>
                            <td className="py-2.5 text-right text-yellow-600">{log.carbs  != null ? Math.round(log.carbs)   : "—"}</td>
                            <td className="py-2.5 text-right text-red-500">{log.fats    != null ? Math.round(log.fats)    : "—"}</td>
                            <td className="py-2.5">
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => toggleFav(log)}
                                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${isFav(log.foodName) ? "bg-amber-100 text-amber-500" : "bg-gray-100 hover:bg-gray-200 text-gray-400 dark:text-gray-500"}`}
                                  title={isFav(log.foodName) ? "Remove from favourites" : "Add to favourites"}
                                >⭐</button>
                                <button
                                  onClick={() => { setEditItem(log); setShowForm(true); }}
                                  className="text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 dark:text-gray-300 transition-colors"
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