export interface CoachVisibility {
  workouts: boolean;
  nutrition: boolean;
  weight: boolean;
  goals: boolean;
  mealPlans: boolean;
  calendar: boolean;
}

export const DEFAULT_COACH_VISIBILITY: CoachVisibility = {
  workouts: true,
  nutrition: true,
  weight: true,
  goals: true,
  mealPlans: true,
  calendar: true,
};

export function parseCoachVisibility(value: unknown): CoachVisibility {
  if (!value) return { ...DEFAULT_COACH_VISIBILITY };
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { ...DEFAULT_COACH_VISIBILITY };
    }
  }
  if (!parsed || typeof parsed !== "object") return { ...DEFAULT_COACH_VISIBILITY };
  const obj = parsed as Record<string, unknown>;
  return {
    workouts: obj.workouts !== false,
    nutrition: obj.nutrition !== false,
    weight: obj.weight !== false,
    goals: obj.goals !== false,
    mealPlans: obj.mealPlans !== false,
    calendar: obj.calendar !== false,
  };
}

export function serializeCoachVisibility(value: unknown): string {
  return JSON.stringify(parseCoachVisibility(value));
}

