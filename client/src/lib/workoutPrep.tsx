import { useMemo } from "react";
import { useTranslation } from "../i18n";

type Translator = (key: any, vars?: Record<string, string | number>) => string;

export type WorkoutPrepSource = {
  splitType?: string | null;
  objective?: string | null;
  muscleGroups?: string[] | null;
  dayLabel?: string | null;
  trainingType?: string | null;
  exerciseNames?: string[] | null;
};

type PrepFocus = "upper" | "lower" | "push" | "pull" | "full" | "cardio" | "recovery";

export type WorkoutPrepBlock = {
  focusLabel: string;
  warmups: string[];
  stretches: string[];
  note: string;
};

const FOCUS_LABEL_KEYS: Record<PrepFocus, string> = {
  upper: "workouts.prepUpper",
  lower: "workouts.prepLower",
  push: "workouts.prepPush",
  pull: "workouts.prepPull",
  full: "workouts.prepFullBody",
  cardio: "workouts.prepCardio",
  recovery: "workouts.prepRecovery",
};

const NOTE_KEYS: Record<string, string> = {
  strength: "workouts.prepNoteStrength",
  hypertrophy: "workouts.prepNoteHypertrophy",
  endurance: "workouts.prepNoteEndurance",
  cardio: "workouts.prepNoteEndurance",
  mobility: "workouts.prepNoteRecovery",
  recovery: "workouts.prepNoteRecovery",
  general: "workouts.prepNoteGeneral",
};

const PREP_LIBRARY: Record<PrepFocus, { warmups: string[]; stretches: string[] }> = {
  upper: {
    warmups: [
      "workouts.prepShoulderCircles",
      "workouts.prepBandPullAparts",
      "workouts.prepScapPushUps",
      "workouts.prepThoracicRotations",
    ],
    stretches: [
      "workouts.prepDoorwayChestStretch",
      "workouts.prepLatStretch",
      "workouts.prepCrossBodyShoulderStretch",
      "workouts.prepThoracicOpenBook",
    ],
  },
  lower: {
    warmups: [
      "workouts.prepAnkleCircles",
      "workouts.prepHipHinges",
      "workouts.prepBodyweightSquats",
      "workouts.prepGluteBridges",
    ],
    stretches: [
      "workouts.prepCouchStretch",
      "workouts.prepHamstringStretch",
      "workouts.prepCalfStretch",
      "workouts.prepFigureFourStretch",
    ],
  },
  push: {
    warmups: [
      "workouts.prepBandExternalRotations",
      "workouts.prepInclinePushUps",
      "workouts.prepShoulderTaps",
      "workouts.prepWallSlides",
    ],
    stretches: [
      "workouts.prepBandChestOpener",
      "workouts.prepDoorwayChestStretch",
      "workouts.prepOverheadTricepsStretch",
      "workouts.prepThoracicOpenBook",
    ],
  },
  pull: {
    warmups: [
      "workouts.prepBandRows",
      "workouts.prepScapRetractions",
      "workouts.prepDeadHang",
      "workouts.prepThoracicRotations",
    ],
    stretches: [
      "workouts.prepLatStretch",
      "workouts.prepRearDeltStretch",
      "workouts.prepBicepsWallStretch",
      "workouts.prepChildPoseReach",
    ],
  },
  full: {
    warmups: [
      "workouts.prepBriskWalk",
      "workouts.prepMarching",
      "workouts.prepBodyweightSquats",
      "workouts.prepDynamicLunges",
    ],
    stretches: [
      "workouts.prepHamstringStretch",
      "workouts.prepChestStretch",
      "workouts.prepHipFlexorStretch",
      "workouts.prepCalfStretch",
    ],
  },
  cardio: {
    warmups: [
      "workouts.prepBriskWalk",
      "workouts.prepMarching",
      "workouts.prepAnkleRocks",
      "workouts.prepWorldsGreatestStretch",
    ],
    stretches: [
      "workouts.prepCalfStretch",
      "workouts.prepHipFlexorStretch",
      "workouts.prepOpenBooks",
      "workouts.prepBreathingReset",
    ],
  },
  recovery: {
    warmups: [
      "workouts.prepCatCow",
      "workouts.prepDeadBugBreathing",
      "workouts.prepWorldsGreatestStretch",
      "workouts.prepControlledBreathing",
    ],
    stretches: [
      "workouts.prepChildPoseReach",
      "workouts.prepPigeonStretch",
      "workouts.prepOpenBooks",
      "workouts.prepBreathingReset",
    ],
  },
};

function includesAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function inferFocus(source: WorkoutPrepSource): PrepFocus {
  const text = [
    source.splitType,
    source.objective,
    source.dayLabel,
    source.trainingType,
    ...(source.muscleGroups ?? []),
    ...(source.exerciseNames ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (includesAny(text, ["cardio", "endurance", "run", "bike", "cycle", "swim", "hiit", "conditioning"])) {
    return "cardio";
  }
  if (includesAny(text, ["mobility", "recovery", "stretch", "yoga", "pilates", "rest"])) {
    return "recovery";
  }
  if (includesAny(text, ["push"])) return "push";
  if (includesAny(text, ["pull"])) return "pull";
  if (includesAny(text, ["lower", "legs", "leg day", "quads", "hamstrings", "glutes", "calves"])) return "lower";
  if (includesAny(text, ["full", "body"])) return "full";
  if (includesAny(text, ["upper", "chest", "shoulder", "back", "biceps", "triceps", "traps", "forearms"])) return "upper";
  return "full";
}

function pickNote(source: WorkoutPrepSource, t: Translator): string {
  const objective = (source.objective ?? source.trainingType ?? "").toLowerCase();
  if (includesAny(objective, ["strength", "power"])) return t("workouts.prepNoteStrength");
  if (includesAny(objective, ["hypertrophy", "muscle", "bulk"])) return t("workouts.prepNoteHypertrophy");
  if (includesAny(objective, ["endurance", "cardio"])) return t("workouts.prepNoteEndurance");
  if (includesAny(objective, ["mobility", "recovery", "rest"])) return t("workouts.prepNoteRecovery");
  return t("workouts.prepNoteGeneral");
}

export function buildWorkoutPrepBlock(source: WorkoutPrepSource, t: Translator): WorkoutPrepBlock {
  const focus = inferFocus(source);
  const library = PREP_LIBRARY[focus];
  return {
    focusLabel: t(FOCUS_LABEL_KEYS[focus]),
    warmups: library.warmups.map((key) => t(key)),
    stretches: library.stretches.map((key) => t(key)),
    note: pickNote(source, t),
  };
}

function PrepList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WorkoutPrepPanel({
  source,
  compact = false,
}: {
  source: WorkoutPrepSource;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const block = useMemo(() => buildWorkoutPrepBlock(source, t), [source, t]);
  const warmups = compact ? block.warmups.slice(0, 2) : block.warmups;
  const stretches = compact ? block.stretches.slice(0, 2) : block.stretches;

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/70 dark:bg-gray-800/60 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{t("workouts.prepTitle")}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{block.focusLabel}</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-right max-w-[12rem]">{compact ? t("workouts.prepShortNote") : block.note}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PrepList title={t("workouts.prepWarmup")} items={warmups} />
        <PrepList title={t("workouts.prepStretch")} items={stretches} />
      </div>

      {!compact && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{block.note}</p>
      )}
    </div>
  );
}
