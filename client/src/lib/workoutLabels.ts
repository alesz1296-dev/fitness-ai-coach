import type { TKey } from "../i18n";
import type { WorkoutTemplate } from "../types";

type TranslateFn = (key: TKey, vars?: Record<string, string | number>) => string;

const OBJECTIVE_KEYS: Record<string, TKey> = {
  strength: "workouts.strength",
  hypertrophy: "workouts.hypertrophy",
  endurance: "workouts.endurance",
  cardio: "workouts.cardio",
  mobility: "workouts.mobility",
  fat_loss: "workouts.fatLoss",
  general: "workouts.general",
};

const MUSCLE_KEYS: Record<string, TKey> = {
  chest: "workouts.muscleChest",
  back: "workouts.muscleBack",
  shoulders: "workouts.muscleShoulders",
  biceps: "workouts.muscleBiceps",
  triceps: "workouts.muscleTriceps",
  upperbody: "workouts.muscleUpperBody",
  lowerbody: "workouts.muscleLowerBody",
  push: "workouts.musclePush",
  pull: "workouts.musclePull",
  legs: "workouts.muscleLegs",
  quads: "workouts.muscleQuads",
  hamstrings: "workouts.muscleHamstrings",
  calves: "workouts.muscleCalves",
  glutes: "workouts.muscleGlutes",
  traps: "workouts.muscleTraps",
  forearms: "workouts.muscleForearms",
  core: "workouts.muscleCore",
  fullbody: "workouts.muscleFullBody",
  cardio: "workouts.cardio",
  mobility: "workouts.mobility",
  stretching: "workouts.mobility",
  adductors: "workouts.muscleAdductors",
  abductors: "workouts.muscleAbductors",
};

const SPLIT_KEYS: Record<string, TKey> = {
  PPL: "templates.splitPpl",
  Upper_Lower: "templates.splitUpperLower",
  Bro_Split: "templates.splitBroSplit",
  Full_Body: "templates.splitFullBody",
  Custom: "templates.splitCustom",
  Full_Body_3d: "templates.splitFullBody3d",
  PPL_6d: "templates.splitPpl6d",
  Upper_Lower_4d: "templates.splitUpperLower4d",
  Bro_Split_5d: "templates.splitBroSplit5d",
  Custom_4d: "templates.splitFatLoss4d",
};

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[\s/_-]+/g, "");
}

export function translateObjectiveLabel(objective: string, t: TranslateFn): string {
  return t(OBJECTIVE_KEYS[objective] ?? (`workouts.${objective}` as TKey));
}

export function translateMuscleGroupLabel(label: string, t: TranslateFn): string {
  const key = MUSCLE_KEYS[normalizeKey(label)];
  return key ? t(key) : label;
}

export function translateSplitLabel(splitType: string, t: TranslateFn): string {
  const key = SPLIT_KEYS[splitType];
  return key ? t(key) : splitType.replace(/_/g, " ");
}

export function getTemplateDisplayTitle(template: WorkoutTemplate, t: TranslateFn): string {
  if (!template.isSystem) return template.name;
  const splitLabel = translateSplitLabel(template.splitType, t);
  const dayLabel = template.dayLabel ? translateMuscleGroupLabel(template.dayLabel, t) : "";
  const titleBits = [splitLabel];
  if (dayLabel && dayLabel !== splitLabel) titleBits.push(dayLabel);
  return titleBits.join(" · ");
}
