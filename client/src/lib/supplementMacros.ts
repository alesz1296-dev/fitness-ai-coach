export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface SupplementState {
  enabled: boolean;
  qty: number;
}

interface SupplementDef extends MacroTotals {
  defaultQty: number;
}

interface CustomSupplementDef {
  id: string;
  defaultQty: number;
  cal: number;
  p: number;
  c: number;
  f: number;
}

const BUILTIN_SUPP_STORE_KEY = "supplement_prefs_by_date_v1";
const LEGACY_BUILTIN_SUPP_KEY = "supplement_prefs_v2";
const SUPP_MACRO_OVERRIDES_KEY = "supplement_macros_v1";
const CUSTOM_SUPP_DEFS_KEY = "fitai_custom_supp_defs_v1";
const CUSTOM_SUPP_STORE_KEY = "fitai_custom_supp_state_by_date_v1";
const LEGACY_CUSTOM_SUPP_KEY = "fitai_custom_supps_v1";

const BUILTIN_SUPPLEMENTS: Record<string, SupplementDef> = {
  creatine: { defaultQty: 5, calories: 0, protein: 0, carbs: 0, fats: 0 },
  omega3: { defaultQty: 3, calories: 9, protein: 0, carbs: 0, fats: 1 },
  whey: { defaultQty: 1, calories: 120, protein: 25, carbs: 5, fats: 2 },
  casein: { defaultQty: 1, calories: 120, protein: 24, carbs: 6, fats: 1.5 },
  plant: { defaultQty: 1, calories: 110, protein: 20, carbs: 8, fats: 3 },
  mass_gainer: { defaultQty: 1, calories: 380, protein: 25, carbs: 65, fats: 5 },
};

function safeJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function addTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fats: a.fats + b.fats,
  };
}

function scale(def: SupplementDef, state: SupplementState): MacroTotals {
  const mult = Number(state.qty || 0) / (def.defaultQty || 1);
  return {
    calories: def.calories * mult,
    protein: def.protein * mult,
    carbs: def.carbs * mult,
    fats: def.fats * mult,
  };
}

function customDefToSupplementDef(def: CustomSupplementDef): SupplementDef {
  return {
    defaultQty: Number(def.defaultQty) || 1,
    calories: Number(def.cal) || 0,
    protein: Number(def.p) || 0,
    carbs: Number(def.c) || 0,
    fats: Number(def.f) || 0,
  };
}

export function getSupplementMacrosForDate(date: string): MacroTotals {
  if (typeof localStorage === "undefined") {
    return { calories: 0, protein: 0, carbs: 0, fats: 0 };
  }

  const builtinStore = safeJson<Record<string, Record<string, SupplementState>>>(
    BUILTIN_SUPP_STORE_KEY,
    {},
  );
  const legacyBuiltin = safeJson<Record<string, SupplementState>>(LEGACY_BUILTIN_SUPP_KEY, {});
  const builtinForDate = builtinStore[date] ?? legacyBuiltin;
  const overrides = safeJson<Record<string, { cal: number; p: number; c: number; f: number }>>(
    SUPP_MACRO_OVERRIDES_KEY,
    {},
  );

  let totals: MacroTotals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
  for (const [id, state] of Object.entries(builtinForDate ?? {})) {
    if (!state?.enabled || Number(state.qty) <= 0) continue;
    const base = BUILTIN_SUPPLEMENTS[id];
    if (!base) continue;
    const override = overrides[id];
    const def = override
      ? { defaultQty: base.defaultQty, calories: override.cal, protein: override.p, carbs: override.c, fats: override.f }
      : base;
    totals = addTotals(totals, scale(def, state));
  }

  const customDefs = safeJson<CustomSupplementDef[]>(CUSTOM_SUPP_DEFS_KEY, []);
  const customStore = safeJson<Record<string, Record<string, SupplementState>>>(CUSTOM_SUPP_STORE_KEY, {});
  const legacyCustom = safeJson<Array<CustomSupplementDef & SupplementState>>(LEGACY_CUSTOM_SUPP_KEY, []);
  const customForDate = customStore[date] ?? Object.fromEntries(
    legacyCustom.map((entry) => [entry.id, { enabled: entry.enabled, qty: entry.qty }]),
  );
  const defsById = new Map<string, SupplementDef>(
    [...customDefs, ...legacyCustom].map((def) => [def.id, customDefToSupplementDef(def)]),
  );

  for (const [id, state] of Object.entries(customForDate ?? {})) {
    if (!state?.enabled || Number(state.qty) <= 0) continue;
    const def = defsById.get(id);
    if (!def) continue;
    totals = addTotals(totals, scale(def, state));
  }

  return totals;
}
