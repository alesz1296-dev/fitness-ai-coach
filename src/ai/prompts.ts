export type AgentType = "coach" | "nutritionist" | "general";
export type ProposalKind = "workout" | "meal" | "goal" | null;
export type ProposalState = "advice_only" | "plan_opportunity" | "plan_request";

export interface ProposalIntent {
  proposalKind: ProposalKind;
  proposalState: ProposalState;
  saveableProposal: boolean;
}

export interface UserContext {
  username: string;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  sex?: string | null;
  activityLevel?: string | null;
  fitnessLevel?: string | null;
  goal?: string | null;
  proteinMultiplier?: number | null;
  trainingDaysPerWeek?: number | null;
  trainingHoursPerDay?: number | null;
  injuries?: string | null;
  waterTargetMl?: number | null;
  planAdjustmentMode?: "suggest" | "confirm" | "auto" | string | null;
  /** ISO 639-1 language code — "en" | "es" */
  language?: string | null;
}

interface HistoryMessageLike {
  role: string;
  content: string;
}

const buildUserContext = (user: UserContext): string => {
  const parts: string[] = [`User: ${user.username}`];
  if (user.age) parts.push(`Age: ${user.age}`);
  if (user.sex) parts.push(`Sex: ${user.sex}`);
  if (user.weight) parts.push(`Weight: ${user.weight}kg`);
  if (user.height) parts.push(`Height: ${user.height}cm`);
  if (user.activityLevel) parts.push(`Activity: ${user.activityLevel}`);
  if (user.fitnessLevel) parts.push(`Fitness Level: ${user.fitnessLevel}`);
  if (user.goal) parts.push(`Primary Goal: ${user.goal}`);
  if (user.proteinMultiplier)
    parts.push(`Protein Target: ${user.proteinMultiplier}g/kg`);
  if (user.trainingDaysPerWeek)
    parts.push(`Training Days/Week: ${user.trainingDaysPerWeek}`);
  if (user.trainingHoursPerDay)
    parts.push(`Hours/Session: ${user.trainingHoursPerDay}`);
  if (user.planAdjustmentMode)
    parts.push(`Plan Adjustment Mode: ${user.planAdjustmentMode}`);
  if (user.injuries) parts.push(`Injuries: ${user.injuries}`);
  if (user.waterTargetMl)
    parts.push(`Water Target: ${user.waterTargetMl}ml/day`);
  return parts.join(" | ");
};

// ── JSON embedding instructions (appended when save-from-chat is possible) ────

const WORKOUT_JSON_INSTRUCTIONS = `
IMPORTANT — When you suggest a specific workout routine or modify an existing saved routine, you MUST embed a machine-readable JSON proposal at the END of your response using exactly this format (do not alter the markers):

\`\`\`workout-json
{
  "mode": "create",
  "targetTemplateId": null,
  "name": "Push Day A",
  "description": "Chest, shoulders, triceps hypertrophy",
  "splitType": "PPL",
  "objective": "hypertrophy",
  "frequency": 4,
  "dayLabel": "Push Day",
  "muscleGroups": ["chest", "shoulders", "triceps"],
  "exercises": [
    { "exerciseName": "Bench Press", "sets": 4, "reps": "8-10", "restSeconds": 90, "notes": "Focus on full ROM" },
    { "exerciseName": "Overhead Press", "sets": 3, "reps": "10-12", "restSeconds": 75 }
  ]
}
\`\`\`

Rules for the JSON block:
- This JSON is a proposal only. The app will not apply it until the user explicitly taps the confirmation button.
- Always include it when you design or change a workout — even if just 1-3 exercises.
- Use "mode": "create" for a new template and "mode": "replace" when modifying an existing user-owned template.
- If replacing an existing template, include its numeric "targetTemplateId" from get_workout_templates.
- "splitType" must be one of: PPL, Upper_Lower, Bro_Split, Full_Body, Custom.
- "objective" must be one of: hypertrophy, strength, fat_loss, endurance, general.
- "reps" is a string — use ranges like "8-12" or exact numbers like "5".
- "restSeconds" and "notes" are optional per exercise.
- Do not wrap the JSON block in any other text — keep it at the very end.
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
- This JSON is a proposal only. The app will not apply it until the user explicitly taps the confirmation button.
- Always include this block when you give or adjust a personalised calorie/macro plan.
- All numeric fields must be numbers (not strings).
- "targetDate" must be a future date in YYYY-MM-DD format.
- "name" and "notes" are optional but helpful.
- Saving this proposal will make it the user's active calorie goal and deactivate the previous active one.
- Keep the block at the very end of your response.
`;

const MEAL_PLAN_JSON_INSTRUCTIONS = `
IMPORTANT — When you suggest or modify a meal plan, you MUST embed a machine-readable JSON proposal at the END of your response using exactly this format:

\`\`\`meal-plan-json
{
  "mode": "create",
  "targetPlanId": null,
  "name": "High Protein Cut Week",
  "weekStart": "2026-05-04",
  "days": [
    {
      "dayIndex": 0,
      "meals": [
        {
          "meal": "breakfast",
          "items": [
            { "foodName": "Oatmeal", "calories": 300, "protein": 10, "carbs": 54, "fats": 5, "quantity": 100, "unit": "g" },
            { "foodName": "Banana", "calories": 90, "protein": 1, "carbs": 23, "fats": 0, "quantity": 1, "unit": "medium" }
          ]
        },
        {
          "meal": "lunch",
          "items": [
            { "foodName": "Grilled Chicken Breast", "calories": 248, "protein": 47, "carbs": 0, "fats": 5, "quantity": 150, "unit": "g" }
          ]
        }
      ]
    }
  ]
}
\`\`\`

Rules:
- This JSON is a proposal only. The app will not apply it until the user explicitly taps the confirmation button.
- Include this block when the user asks for a daily, weekly, monthly, or multi-week meal plan, or when adjusting an existing meal plan.
- Use "mode": "create" for a new Meal Planner plan, "mode": "replace" to overwrite an existing plan, or "mode": "append" to add meals to an existing plan.
- If modifying an existing plan, include its numeric "targetPlanId" from get_meal_plans.
- Always tailor the plan to the user's current goal from their profile and calorie goal context. Do not generate a generic meal plan when the user's goal is available.
- Prefer meal structures that support the user's goal (cut, bulk, maintain, performance, etc.) and keep portions aligned with the goal's calorie target.
- "dayIndex" is a zero-based day offset within the plan. For a weekly plan, 0=Monday through 6=Sunday. For longer plans, keep increasing dayIndex sequentially.
- "meal" must be one of: breakfast, lunch, dinner, snack.
- All numeric fields must be numbers, not strings.
- Include realistic portion sizes; quantities should match the unit.
- "protein", "carbs", "fats" are optional per item but highly encouraged.
- Keep it at the very end of your response.
`;

// ── System prompt builder ─────────────────────────────────────────────────────

export const buildSystemPrompt = (
  agentType: AgentType,
  user: UserContext,
  intent: ProposalIntent = {
    proposalKind: null,
    proposalState: "advice_only",
    saveableProposal: false,
  },
): string => {
  const userCtx = buildUserContext(user);

  const langNote = user.language === "es"
    ? "\n\nIMPORTANT: The user has selected Spanish as their language. You MUST respond entirely in Spanish for all conversational text, advice, and explanations. Exercise names should remain in English (e.g., Bench Press, Squat, Deadlift) as that is the industry standard. Numbers, units, and technical terms may stay in English."
    : "";

  const base = `You are FitAI, an expert AI fitness and nutrition assistant built into the FitAI Coach app.
Always be motivating, evidence-based, and practical. Keep responses concise (under 300 words) and actionable.
Never diagnose medical conditions — always recommend a doctor for health issues.
Current user profile: [${userCtx}]${langNote}

Authorization rule: never claim that you changed, saved, logged, or deleted anything unless a tool result explicitly says it happened. Your normal structured JSON blocks are proposals; the app asks the user for confirmation before applying them.`;

  const intentRule =
    intent.proposalState === "plan_request"
      ? `\n\nConversation state: the user has explicitly asked for a ${intent.proposalKind ?? "structured"} plan. You may provide a concrete saveable proposal. Include machine-readable JSON only if it matches the requested plan type, and keep any JSON block at the very end of the reply.`
      : intent.proposalState === "plan_opportunity"
        ? "\n\nConversation state: the user is moving toward structured planning, but has not clearly asked for a saveable plan yet. You may offer to build a plan or ask one clarifying question, but do not include any machine-readable JSON blocks in this reply."
        : "\n\nConversation state: advice-only. Reply conversationally with useful guidance, but do not include any machine-readable JSON blocks in this reply.";

  const workoutInstructions =
    intent.proposalState === "plan_request" &&
    intent.proposalKind === "workout"
      ? `\n${WORKOUT_JSON_INSTRUCTIONS}`
      : "";
  const nutritionInstructions =
    intent.proposalState === "plan_request" &&
    intent.proposalKind === "goal"
      ? `\n${NUTRITION_JSON_INSTRUCTIONS}`
      : "";
  const mealPlanInstructions =
    intent.proposalState === "plan_request" &&
    intent.proposalKind === "meal"
      ? `\n${MEAL_PLAN_JSON_INSTRUCTIONS}`
      : "";

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
${intentRule}${workoutInstructions}`;
  }

  if (agentType === "nutritionist") {
    return `${base}

You are acting as the NUTRITIONIST persona. Your expertise:
- Macronutrient calculations for specific goals
- Calorie deficit and surplus strategies
- Meal planning and food timing
- Supplement science (evidence-based)
- Eating for performance vs. aesthetics

When giving nutrition advice, calculate specific calorie and macro targets. Recommend whole foods first. Use TDEE principles. Any meal plan you generate must be aligned to the user's active goal and calorie target rather than being generic.
${intentRule}${nutritionInstructions}${mealPlanInstructions}`;
  }

  // General — can trigger either JSON block depending on context
  return `${base}

You can answer questions about both fitness and nutrition.
Help the user understand their progress, set realistic expectations, and stay motivated.
${intentRule}${workoutInstructions}${nutritionInstructions}${mealPlanInstructions}`;
};

// ── JSON extraction helpers (used by the frontend via the API response) ────────
// These regexes are also replicated in the frontend ChatPage for client-side parsing.

export const WORKOUT_JSON_REGEX = /```workout-json\s*([\s\S]*?)```/;
export const NUTRITION_JSON_REGEX = /```nutrition-json\s*([\s\S]*?)```/;
export const MEAL_PLAN_JSON_REGEX = /```meal-plan-json\s*([\s\S]*?)```/;

export function extractWorkoutJson(text: string): Record<string, any> | null {
  const match = text.match(WORKOUT_JSON_REGEX);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function extractNutritionJson(text: string): Record<string, any> | null {
  const match = text.match(NUTRITION_JSON_REGEX);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function extractMealPlanJson(text: string): Record<string, any> | null {
  const match = text.match(MEAL_PLAN_JSON_REGEX);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function stripStructuredPlanBlocks(text: string): string {
  return text
    .replace(/```workout-json[\s\S]*?```/g, "")
    .replace(/```nutrition-json[\s\S]*?```/g, "")
    .replace(/```meal-plan-json[\s\S]*?```/g, "")
    .trim();
}

export function classifyProposalIntent(
  userMessage: string,
  agentType: AgentType,
  history: HistoryMessageLike[] = [],
): ProposalIntent {
  const normalized = userMessage.toLowerCase();
  const recentContext = history
    .slice(-4)
    .map((msg) => msg.content.toLowerCase())
    .join(" ");
  const combined = `${recentContext} ${normalized}`;

  const workoutSignals =
    /\b(workout|routine|training plan|gym plan|split|push day|pull day|leg day|program)\b/.test(
      combined,
    ) || agentType === "coach";
  const mealSignals =
    /\b(meal plan|meal prep|meals|diet plan|nutrition plan|menu)\b/.test(
      combined,
    );
  const goalSignals =
    /\b(calories|macros|protein target|calorie goal|cut|bulk|deficit|surplus)\b/.test(
      combined,
    );

  const explicitRequest =
    /\b(build|create|make|design|generate|write|give me|set up|set|draft|plan)\b/.test(
      normalized,
    ) || /\b(can you|could you|please)\b/.test(normalized);
  const softPlanning =
    /\b(should i|could i|can i|what would|may i|would it help|maybe|thinking of)\b/.test(
      normalized,
    ) || /\b(plan|routine|meal plan|macros|calories)\b/.test(normalized);

  let proposalKind: ProposalKind = null;
  if (mealSignals && !goalSignals) proposalKind = "meal";
  else if (goalSignals && !mealSignals) proposalKind = "goal";
  else if (workoutSignals) proposalKind = "workout";
  else if (mealSignals) proposalKind = "meal";

  if (proposalKind && explicitRequest) {
    return {
      proposalKind,
      proposalState: "plan_request",
      saveableProposal: true,
    };
  }

  if (
    softPlanning &&
    (proposalKind !== null ||
      /\b(plan|routine|structure|template|schedule)\b/.test(normalized))
  ) {
    return {
      proposalKind,
      proposalState: "plan_opportunity",
      saveableProposal: false,
    };
  }

  return {
    proposalKind: null,
    proposalState: "advice_only",
    saveableProposal: false,
  };
}
