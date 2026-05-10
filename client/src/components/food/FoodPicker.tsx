import { useEffect, useState } from "react";
import { searchApi } from "../../api";
import { useTranslation } from "../../i18n";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import {
  normalizeFoodResult,
  scaleFoodResult,
  type FoodSearchResult,
  type ScaledFoodItem,
} from "../../lib/foodSearch";

interface FoodPickerProps {
  onAdd: (food: ScaledFoodItem) => void;
  addLabel?: string;
  compact?: boolean;
  allowMacroEdit?: boolean;
}

export function FoodPicker({
  onAdd,
  addLabel,
  compact = false,
  allowMacroEdit = false,
}: FoodPickerProps) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState("g");
  const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });

  useEffect(() => {
    const q = query.trim();
    if (!q || selected) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.foods(q, compact ? 8 : 20, undefined, i18n.language);
        setResults(res.data.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 260);

    return () => clearTimeout(timeout);
  }, [compact, i18n.language, query, selected]);

  useEffect(() => {
    if (!selected) return;
    const scaled = scaleFoodResult(selected, Number(quantity), unit);
    setMacros({
      calories: scaled.calories,
      protein: scaled.protein,
      carbs: scaled.carbs,
      fats: scaled.fats,
    });
  }, [quantity, selected, unit]);

  const selectFood = (food: FoodSearchResult) => {
    const normalized = normalizeFoodResult(food);
    setSelected(food);
    setQuery(normalized.name);
    setQuantity(String(normalized.defaultQty));
    setUnit(normalized.defaultUnit);
    setResults([]);
  };

  const addSelected = () => {
    if (!selected) return;
    const scaled = scaleFoodResult(selected, Number(quantity), unit);
    onAdd({
      ...scaled,
      calories: allowMacroEdit ? Number(macros.calories || 0) : scaled.calories,
      protein: allowMacroEdit ? Number(macros.protein || 0) : scaled.protein,
      carbs: allowMacroEdit ? Number(macros.carbs || 0) : scaled.carbs,
      fats: allowMacroEdit ? Number(macros.fats || 0) : scaled.fats,
    });
    setSelected(null);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          label={compact ? undefined : t("mealPlanner.searchFood")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selected) setSelected(null);
          }}
          placeholder={t("nutrition.searchFoodPlaceholder")}
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
          {results.map((food) => {
            const normalized = normalizeFoodResult(food);
            return (
              <button
                key={String(normalized.id ?? normalized.name)}
                onClick={() => selectFood(food)}
                className="w-full text-left px-3 py-2 hover:bg-brand-50 dark:hover:bg-gray-700 flex justify-between items-center gap-3"
              >
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{normalized.name}</span>
                <span className="text-xs text-gray-400 shrink-0">
                  {Math.round(normalized.calories)} kcal / {normalized.defaultQty}{normalized.defaultUnit}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label={t("mealPlanner.quantity")}
              type="number"
              min="0.1"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              label={t("mealPlanner.unit")}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="g / ml / serving"
            />
          </div>

          {allowMacroEdit ? (
            <div className="grid grid-cols-4 gap-2">
              {(["calories", "protein", "carbs", "fats"] as const).map((key) => (
                <Input
                  key={key}
                  label={key === "calories" ? t("common.kcal") : (t as (k: string) => string)(`common.${key}`)}
                  type="number"
                  min="0"
                  step="any"
                  value={String(macros[key])}
                  onChange={(e) => setMacros((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span>{Math.round(macros.calories)} kcal</span>
              <span>{Math.round(macros.protein)}g {t("common.protein")}</span>
              <span>{Math.round(macros.carbs)}g {t("common.carbs")}</span>
              <span>{Math.round(macros.fats)}g {t("common.fats")}</span>
            </div>
          )}

          <Button onClick={addSelected} className="w-full" size={compact ? "sm" : "md"}>
            {addLabel ?? t("mealPlanner.addFood")}
          </Button>
        </div>
      )}
    </div>
  );
}
