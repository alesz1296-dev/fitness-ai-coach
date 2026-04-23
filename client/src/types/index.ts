// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  sex?: "male" | "female" | null;
  fitnessLevel?: string | null;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
  goal?: string | null;
  profileComplete?: boolean | null;
  proteinMultiplier?: number | null;
  trainingDaysPerWeek?: number | null;
  trainingHoursPerDay?: number | null;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  message?: string;
}

// ── Workouts ─────────────────────────────────────────────────────────────────
export interface WorkoutExercise {
  id: number;
  workoutId: number;
  exerciseName: string;
  sets: number;
  reps: number;
  weight?: number | null;
  rpe?: number | null;
  notes?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Workout {
  id: number;
  userId: number;
  name: string;
  templateId?: number | null;
  date: string;
  duration: number;
  caloriesBurned?: number | null;
  notes?: string | null;
  exercises: WorkoutExercise[];
  createdAt: string;
}

export interface PRResult {
  exerciseName: string;
  weight: number;
  reps: number;
  previousBest: number;
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalCaloriesBurned: number;
  personalRecords: Record<string, { weight: number; reps: number }>;
  recentWorkouts: Workout[];
}

export interface ExerciseProgression {
  date: string;
  workoutName: string;
  maxWeight: number;
  bestReps: number;
  totalVolume: number;
  estimated1RM: number | null;
}

// ── Templates ─────────────────────────────────────────────────────────────────
export interface TemplateExercise {
  id: number;
  templateId: number;
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds?: number | null;
  notes?: string | null;
  order: number;
}

export interface WorkoutTemplate {
  id: number;
  userId?: number | null;
  name: string;
  description?: string | null;
  splitType: string;
  objective: string;
  frequency: number;
  dayLabel: string;
  muscleGroups: string[];
  isSystem: boolean;
  aiGenerated: boolean;
  exercises: TemplateExercise[];
  createdAt: string;
}

// ── Food ─────────────────────────────────────────────────────────────────────
export interface FoodLog {
  id: number;
  userId: number;
  foodName: string;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
  quantity: number;
  unit: string;
  meal?: "breakfast" | "lunch" | "dinner" | "snack" | null;
  date: string;
}

export interface FoodTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

// ── Weight ────────────────────────────────────────────────────────────────────
export interface WeightLog {
  id: number;
  userId: number;
  weight: number;
  date: string;
  notes?: string | null;
}

export interface WeightStats {
  latest: number;
  starting: number;
  min: number;
  max: number;
  change: number;
  totalEntries: number;
}

// ── Goals ─────────────────────────────────────────────────────────────────────
export interface Goal {
  id: number;
  userId: number;
  type: string;
  target: number;
  current: number;
  unit: string;
  startDate: string;
  endDate?: string | null;
  achieved: boolean;
}

export interface CalorieGoal {
  id: number;
  userId: number;
  name?: string | null;
  type: "cut" | "bulk" | "maintain";
  currentWeight: number;
  targetWeight: number;
  targetDate: string;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  weeklyChange: number;
  tdee?: number | null;
  active: boolean;
  feasible?: boolean;
  warning?: string | null;
  aiGenerated: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface ProjectionPoint {
  week: number;
  date: string;
  projectedWeight: number;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardData {
  user: User;
  today: {
    logs: FoodLog[];
    totals: FoodTotals;
    date: string;
  };
  weightLogs: WeightLog[];
  recentWorkouts: Workout[];
  weeklyWorkoutCount: number;
  activeGoal: CalorieGoal | null;
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export interface Conversation {
  id: number;
  userId: number;
  role: "user" | "assistant";
  message: string;
  response?: string | null;
  agentType: "coach" | "nutritionist" | "general";
  metadata?: {
    suggestedWorkout?:  Record<string, any>;
    suggestedPlan?:     Record<string, any>;
    suggestedMealPlan?: Record<string, any>;
  } | null;
  createdAt: string;
}

// ── Reports ───────────────────────────────────────────────────────────────────
export interface MonthlyReport {
  id: number;
  userId: number;
  month: number;
  year: number;
  totalWorkouts: number;
  totalVolume?: number | null;
  avgCalories?: number | null;
  avgProtein?: number | null;
  weightStart?: number | null;
  weightEnd?: number | null;
  weightDelta?: number | null;
  prsHit: number;
  goalProgress?: number | null;
  aiSummary?: string | null;
  createdAt: string;
}

// ── Weekly Plan ───────────────────────────────────────────────────────────────
export interface WeeklyPlanDay {
  id:             number;
  planId:         number;
  dayIndex:       number;  // 0 = Monday … 6 = Sunday
  label:          string;
  targetCalories: number | null;
  actualCalories: number | null;
  completed:      boolean;
  completedAt:    string | null;
  workoutId:      number | null;
  notes:          string | null;
  createdAt:      string;
  updatedAt:      string;
}

export interface WeeklyPlan {
  id:        number;
  userId:    number;
  weekStart: string;
  days:      WeeklyPlanDay[];
  createdAt: string;
  updatedAt: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}
