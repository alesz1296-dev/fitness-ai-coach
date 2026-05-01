/**
 * ImpactPanel — calorie & macro impact summary tiles.
 * Shows daily calories, protein, weekly change rate, + optional macro cycling split.
 * Single source of truth for both GoalForm preview and EditGoalModal recalculate.
 */
import type { GoalCalculation, CyclingSplit } from "./goalCalc";

export interface ImpactPanelProps {
  calculation:   GoalCalculation;
  cyclingSplit?: CyclingSplit | null;
  /** Compact mode skips the secondary carbs/fats/TDEE row */
  compact?: boolean;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-xl p-2.5 text-center">
      <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">{label}</p>
      <p className="font-bold text-gray-800 dark:text-gray-100 mt-0.5 text-sm leading-tight">{value}</p>
    </div>
  );
}

export function ImpactPanel({ calculation: calc, cyclingSplit, compact = false }: ImpactPanelProps) {
  const weeklyChangeLabel =
    calc.weeklyChange > 0 ? `+${calc.weeklyChange} kg/wk` :
    calc.weeklyChange < 0 ? `${calc.weeklyChange} kg/wk`  :
    "0 kg/wk";

  const borderClass = calc.feasible
    ? "border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20"
    : "border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20";

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${borderClass}`}>
      {/* Server-side infeasibility banner */}
      {!calc.feasible && calc.warning && (
        <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">⚠️ {calc.warning}</p>
      )}

      {/* Primary tiles: calories · protein · weekly rate */}
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Daily Calories" value={`${Math.round(calc.dailyCalories)} kcal`} />
        <Tile label="Protein"        value={`${Math.round(calc.proteinGrams)}g`} />
        <Tile label="Weekly Change"  value={weeklyChangeLabel} />
      </div>

      {/* Secondary row: carbs · fats · TDEE */}
      {!compact && (
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          <span>Carbs: {Math.round(calc.carbsGrams)}g</span>
          <span>Fats: {Math.round(calc.fatsGrams)}g</span>
          <span>TDEE: {Math.round(calc.tdee)} kcal</span>
        </div>
      )}

      {/* Macro cycling split */}
      {cyclingSplit && (
        <div className="border-t border-indigo-100 dark:border-indigo-800 pt-2 grid grid-cols-2 gap-2 text-center">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-2">
            <p className="text-xs text-indigo-400">🏋️ Train day</p>
            <p className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">
              {Math.round(cyclingSplit.trainDayCalories)} kcal
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2">
            <p className="text-xs text-gray-400">😴 Rest day</p>
            <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">
              {Math.round(cyclingSplit.restDayCalories)} kcal
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
