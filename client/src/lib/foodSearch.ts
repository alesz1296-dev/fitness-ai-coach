export interface FoodSearchResult {
  id?: string | number;
  name: string;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
  defaultQty?: number | null;
  defaultUnit?: string | null;
  servingSize?: number | null;
  servingUnit?: string | null;
  searchDebug?: Record<string, unknown>;
}

export interface ScaledFoodItem {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  quantity: number;
  unit: string;
}

interface NormalizedFoodSearchResult {
  id?: string | number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  defaultQty: number;
  defaultUnit: string;
  servingSize: number;
  servingUnit: string;
  searchDebug?: Record<string, unknown>;
}

const WEIGHT_OR_VOLUME_UNITS = /^(g|ml|kg|oz|lb)$/i;

export function normalizeFoodResult(food: FoodSearchResult): NormalizedFoodSearchResult {
  return {
    id: food.id,
    name: food.name,
    calories: Number(food.calories ?? 0),
    protein: Number(food.protein ?? 0),
    carbs: Number(food.carbs ?? 0),
    fats: Number(food.fats ?? 0),
    defaultQty: Number(food.defaultQty ?? food.servingSize ?? 100),
    defaultUnit: String(food.defaultUnit ?? food.servingUnit ?? "g"),
    servingSize: Number(food.servingSize ?? food.defaultQty ?? 100),
    servingUnit: String(food.servingUnit ?? food.defaultUnit ?? "g"),
    searchDebug: food.searchDebug,
  };
}

export function scaleFoodMacro(value: number, quantity: number, unit: string, defaultQty: number): number {
  const safeDefault = defaultQty > 0 ? defaultQty : 100;
  const safeQuantity = Number.isFinite(quantity) ? quantity : safeDefault;
  const denominator = WEIGHT_OR_VOLUME_UNITS.test(unit.trim()) ? 100 : safeDefault;
  return Math.round((Number(value ?? 0) * safeQuantity) / denominator);
}

export function scaleFoodResult(food: FoodSearchResult, quantity?: number, unit?: string): ScaledFoodItem {
  const normalized = normalizeFoodResult(food);
  const qty = Number(quantity ?? normalized.defaultQty);
  const selectedUnit = unit || normalized.defaultUnit;
  return {
    foodName: normalized.name,
    calories: scaleFoodMacro(normalized.calories, qty, selectedUnit, normalized.defaultQty),
    protein: scaleFoodMacro(normalized.protein, qty, selectedUnit, normalized.defaultQty),
    carbs: scaleFoodMacro(normalized.carbs, qty, selectedUnit, normalized.defaultQty),
    fats: scaleFoodMacro(normalized.fats, qty, selectedUnit, normalized.defaultQty),
    quantity: Number.isFinite(qty) && qty > 0 ? qty : normalized.defaultQty,
    unit: selectedUnit,
  };
}

export function clampMealPlanWeeks(value: number): number {
  return Math.min(52, Math.max(1, Math.round(Number(value) || 1)));
}

export function durationToWeeks(mode: "weeks" | "months", value: number): number {
  const max = mode === "weeks" ? 52 : 12;
  const amount = Math.min(max, Math.max(1, Math.round(Number(value) || 1)));
  return clampMealPlanWeeks(mode === "months" ? amount * 4 : amount);
}
