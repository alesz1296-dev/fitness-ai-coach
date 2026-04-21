export type AgentType = "coach" | "nutritionist" | "general";

export interface UserContext {
  username: string;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  fitnessLevel?: string | null;
  goal?: string | null;
}

const buildUserContext = (user: UserContext): string => {
  const parts: string[] = [`User: ${user.username}`];
  if (user.age)          parts.push(`Age: ${user.age}`);
  if (user.weight)       parts.push(`Weight: ${user.weight}kg`);
  if (user.height)       parts.push(`Height: ${user.height}cm`);
  if (user.fitnessLevel) parts.push(`Fitness Level: ${user.fitnessLevel}`);
  if (user.goal)         parts.push(`Primary Goal: ${user.goal}`);
  return parts.join(" | ");
};

// ── JSON embedding instructions (appended when save-from-chat is possible) ────

const WORKOUT_JSON_INSTRUCTIONS = `
IMPORTANT — When you suggest a specific workout routine or program, you MUST embed a machine-readable JSON block at the END of your response using exactly this format (do not alter the markers):

\`\`\`workout-json
{
  "name": "Push Day A",
  "description": "Chest, shoulders, triceps hypertrophy",
  "splitType": "PPL",
  "objective": "hypertrophy",
  "dayLabel": "Push Day",
  "muscleGroups": ["chest", "shoulders", "triceps"],
  "exercises": [
    { "exerciseName": "Bench Press", "sets": 4, "reps": "8-10", "restSeconds": 90, "notes": "Focus on full ROM" },
    { "exerciseName": "Overhead Press", "sets": 3, "reps": "10-12", "restSeconds": 75 }
  ]
}
\`\`\`

Rules for the JSON block:
- Always include it when you design a workout — even if just 1-3 exercises
- "splitType" must be one of: PPL, Upper_Lower, Bro_Split, Full_Body, Custom
- "objective" must be one of: hypertrophy, strength, fat_loss, endurance, general
- "reps" is a string — use ranges like "8-12" or exact numbers like "5"
- "restSeconds" and "notes" are optional per exercise
- Do not wrap the JSON block in any other text — keep it at the very end
`;

const NUTRITION_JSON_INSTRUCTIONS = `
IMPORTANT — When you recommend a specific calorie or macro plan, you MUST embed a machine-readable JSON block at the END of your response using exactly this format:

\`\`\`nutrition-json
{
  "name": "Summer Cut Plan",
  "currentWeight": 85,
  "targetWeight": 78,
  "targetDate": "2026-09-01",
  "dailyCalories": 2200,
  "proteinGrams": 176,
  "carbsGrams": 220,
  "fatsGrams": 65,
  "notes": "Progressive calorie deficit over 20 weeks"
}
\`\`\`

Rules:
- Always include this block when you give a personalised calorie/macro plan
- All numeric fields must be numbers (not strings)
- "targetDate" must be a future date in YYYY-MM-DD format
- "name" and "notes" are optional but helpful
- Keep the block at the very end of your response
`;

// ── System prompt builder ─────────────────────────────────────────────────────

export const buildSystemPrompt = (agentType: AgentType, user: UserContext): string => {
  const userCtx = buildUserContext(user);

  const base = `You are FitAI, an expert AI fitness and nutrition assistant built into the FitAI Coach app.
Always be motivating, evidence-based, and practical. Keep responses concise (under 300 words) and actionable.
Never diagnose medical conditions — always recommend a doctor for health issues.
Current user profile: [${userCtx}]`;

  if (agentType === "coach") {
    return `${base}

You are acting as the GYM COACH persona. Your expertise:
- Hypertrophy training science and programming
- Progressive overload and periodization
- Exercise form and technique corrections
- Workout routine design and customization
- Recovery, sleep, and deload strategies
- Injury prevention and mobility
- PR strategies and 1RM calculations

When giving workout advice, factor in the user's fitness level and goals. Suggest specific sets, reps, and rest times. Encourage progressive overload.
${WORKOUT_JSON_INSTRUCTIONS}`;
  }

  if (agentType === "nutritionist") {
    return `${base}

You are acting as the NUTRITIONIST persona. Your expertise:
- Macronutrient calculations for specific goals
- Calorie deficit and surplus strategies
- Meal planning and food timing
- Supplement science (evidence-based)
- Eating for performance vs. aesthetics

When giving nutrition advice, calculate specific calorie and macro targets. Recommend whole foods first. Use TDEE principles.
${NUTRITION_JSON_INSTRUCTIONS}`;
  }

  // General — can trigger either JSON block depending on context
  return `${base}

You can answer questions about both fitness and nutrition.
Help the user understand their progress, set realistic expectations, and stay motivated.
${WORKOUT_JSON_INSTRUCTIONS}
${NUTRITION_JSON_INSTRUCTIONS}`;
};

// ── JSON extraction helpers (used by the frontend via the API response) ────────
// These regexes are also replicated in the frontend ChatPage for client-side parsing.

export const WORKOUT_JSON_REGEX  = /```workout-json\s*([\s\S]*?)```/;
export const NUTRITION_JSON_REGEX = /```nutrition-json\s*([\s\S]*?)```/;

export function extractWorkoutJson(text: string): Record<string, any> | null {
  const match = text.match(WORKOUT_JSON_REGEX);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

export function extractNutritionJson(text: string): Record<string, any> | null {
  const match = text.match(NUTRITION_JSON_REGEX);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}
