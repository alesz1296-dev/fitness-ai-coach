/**
 * GoalPresets — 2-column grid of quick-start goal template buttons.
 * Used in: GoalForm (create wizard).
 */
import { GOAL_PRESETS, type GoalPreset } from "./goalCalc";

export interface GoalPresetsProps {
  activePreset: string | null;
  onSelect: (preset: GoalPreset) => void;
  /** If false, shows a profile-incomplete warning alongside the heading */
  hasProfile?: boolean;
}

export function GoalPresets({ activePreset, onSelect, hasProfile = true }: GoalPresetsProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Quick-start templates
        {!hasProfile && (
          <span className="ml-2 font-normal normal-case text-amber-600 dark:text-amber-400">
            ⚠️ Complete your profile (age, height, sex, activity) for accurate calculations
          </span>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {GOAL_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => onSelect(p)}
            className={`text-left rounded-xl border-2 px-3 py-2.5 transition-all hover:shadow-md ${
              activePreset === p.key
                ? p.color + " border-2 shadow-sm"
                : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
            }`}
          >
            <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
              {p.icon} {p.label}
            </p>
            <p className="text-xs opacity-70 dark:text-gray-300 mt-0.5 leading-snug">{p.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
