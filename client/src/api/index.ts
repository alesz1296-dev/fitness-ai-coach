import api from "./axios";
import type {
  AuthResponse, User, Workout, WorkoutStats, WorkoutTemplate,
  FoodLog, FoodTotals, WeightLog, WeightStats, Goal, CalorieGoal,
  Conversation, MonthlyReport, ExerciseProgression, DashboardData,
  WeeklyPlan, WeeklyPlanDay, WorkoutExercise,
  WaterLog, MealPlan, MealPlanEntry, WorkoutCalendarDay,
} from "../types";

interface WorkoutExerciseCreateInput {
  exerciseName: string;
  sets: number;
  reps: number;
  order: number;
  weight?: number;
  rpe?: number;
  notes?: string;
}

interface WorkoutCreateInput {
  name: string;
  date: string;
  duration: number;
  caloriesBurned?: number;
  notes?: string;
  templateId?: number;
  trainingType?: string;
  exercises?: WorkoutExerciseCreateInput[];
}

interface WorkoutExerciseUpdateInput {
  sets?: number;
  reps?: number;
  weight?: number | null;
  rpe?: number | null;
  notes?: string | null;
}

// ── Search ────────────────────────────────────────────────────────────────────
export const searchApi = {
  foods: (q: string, limit = 20, tag?: string) => {
    const params = new URLSearchParams({ q, limit: String(limit) });
    if (tag) params.set("tag", tag);
    return api.get<{ results: any[]; total: number }>(`/search/foods?${params.toString()}`);
  },
  exercises: (q: string, opts: { muscle?: string; equipment?: string; difficulty?: string } = {}, limit = 25) => {
    const params = new URLSearchParams({ q, limit: String(limit) });
    if (opts.muscle)     params.set("muscle",     opts.muscle);
    if (opts.equipment)  params.set("equipment",  opts.equipment);
    if (opts.difficulty) params.set("difficulty", opts.difficulty);
    return api.get<{ results: any[]; muscleGroups: string[]; equipment: string[]; total: number }>(`/search/exercises?${params}`);
  },
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; username: string; password: string; firstName?: string; lastName?: string }) =>
    api.post<AuthResponse>("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", data),
  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string; refreshToken: string }>("/auth/refresh", { refreshToken }),
  logout: (refreshToken?: string, allDevices = false) =>
    api.post("/auth/logout", { refreshToken }, { params: allDevices ? { all: "true" } : {} }),
  me: () => api.get<{ user: User }>("/auth/me"),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get<DashboardData>("/dashboard"),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  getProfile: () => api.get<{ user: User }>("/users/profile"),
  updateProfile: (data: Partial<User>) => api.put<{ user: User }>("/users/profile", data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put("/users/password", data),
};

// ── Workouts ──────────────────────────────────────────────────────────────────
export const workoutsApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<{ workouts: Workout[]; total: number; page: number; pages: number }>(`/workouts?page=${page}&limit=${limit}`),
  getOne: (id: number) => api.get<{ workout: Workout }>(`/workouts/${id}`),
  getStats: () => api.get<WorkoutStats>("/workouts/stats"),
  create: (data: WorkoutCreateInput) =>
    api.post<{ workout: Workout; newPRs?: Array<{ exerciseName: string; weight: number; reps: number; previousBest: number }> }>("/workouts", data),
  update: (id: number, data: Partial<Workout>) =>
    api.put<{ workout: Workout }>(`/workouts/${id}`, data),
  delete: (id: number) => api.delete(`/workouts/${id}`),
  startFromTemplate: (templateId: number, date?: string, name?: string) =>
    api.post<{ workout: Workout; template: Partial<WorkoutTemplate> }>(`/workouts/start-from-template/${templateId}`, { name, date }),
  getExerciseProgression: (name: string, limit = 30) =>
    api.get<{ exerciseName: string; progression: ExerciseProgression[]; allTimePR: ExerciseProgression | null; totalSessions: number }>(
      `/workouts/exercises/${encodeURIComponent(name)}/progression?limit=${limit}`
    ),
  updateExercise: (exerciseId: number, data: Partial<WorkoutExerciseUpdateInput>) =>
    api.put(`/workouts/exercises/${exerciseId}`, data),
  deleteExercise: (exerciseId: number) =>
    api.delete(`/workouts/exercises/${exerciseId}`),
  addExercise: (workoutId: number, data: {
    exerciseName: string; sets: number; reps: number;
    weight?: number | null; rpe?: number | null; notes?: string;
  }) => api.post<{ exercise: WorkoutExercise }>(`/workouts/${workoutId}/exercises`, data),
};

// ── Templates ─────────────────────────────────────────────────────────────────
export const templatesApi = {
  getAll: (filters?: { objective?: string; frequency?: number; splitType?: string }) =>
    api.get<{ templates: WorkoutTemplate[] }>("/templates", { params: filters }),
  getRecommended: (filters?: { objective?: string; frequency?: number; splitType?: string }) =>
    api.get<{ grouped: Record<string, WorkoutTemplate[]>; all: WorkoutTemplate[] }>("/templates/recommended", { params: filters }),
  getOne: (id: number) => api.get<{ template: WorkoutTemplate }>(`/templates/${id}`),
  create: (data: any) => api.post<{ template: WorkoutTemplate }>("/templates", data),
  update: (id: number, data: any) => api.put<{ template: WorkoutTemplate }>(`/templates/${id}`, data),
  delete: (id: number) => api.delete(`/templates/${id}`),
  addExercise: (id: number, data: any) => api.post(`/templates/${id}/exercises`, data),
  updateExercise: (id: number, exerciseId: number, data: any) =>
    api.put(`/templates/${id}/exercises/${exerciseId}`, data),
  removeExercise: (id: number, exerciseId: number) =>
    api.delete(`/templates/${id}/exercises/${exerciseId}`),
  seed: () => api.post("/templates/seed"),
};

// ── Food ──────────────────────────────────────────────────────────────────────
export const foodApi = {
  getToday: (date?: string) =>
    api.get<{ logs: FoodLog[]; totals: FoodTotals; date: string }>(`/foods${date ? `?date=${date}` : ""}`),
  getHistory: (days = 7) =>
    api.get<{ history: Record<string, FoodTotals>; days: number }>(`/foods/history?days=${days}`),
  getCheatDates: (days = 90) =>
    api.get<{ dates: string[] }>(`/foods/cheat-dates?days=${days}`),
  frequent: (limit = 5) =>
    api.get<{ frequent: Array<{ foodName: string; calories: number; protein: number | null; carbs: number | null; fats: number | null; quantity: number; unit: string; meal: string | null; timesLogged: number }> }>(`/foods/frequent?limit=${limit}`),
  log: (data: Partial<FoodLog>) => api.post<{ log: FoodLog }>("/foods", data),
  bulk: (foods: Array<Partial<FoodLog>>, date?: string) =>
    api.post<{ logs: FoodLog[]; message: string }>("/foods/bulk", { foods, date }),
  update: (id: number, data: Partial<FoodLog>) => api.put<{ log: FoodLog }>(`/foods/${id}`, data),
  delete: (id: number) => api.delete(`/foods/${id}`),
};

// ── Weight ────────────────────────────────────────────────────────────────────
export const weightApi = {
  getLogs: (days = 30) =>
    api.get<{ logs: WeightLog[]; stats: WeightStats | null; days: number }>(`/weight?days=${days}`),
  log: (data: { weight: number; notes?: string; date?: string }) =>
    api.post<{ log: WeightLog }>("/weight", data),
  delete: (id: number) => api.delete(`/weight/${id}`),
};

// ── Goals ─────────────────────────────────────────────────────────────────────
export const goalsApi = {
  getAll: () => api.get<{ goals: Goal[] }>("/goals"),
  create: (data: any) => api.post<{ goal: Goal }>("/goals", data),
  update: (id: number, data: any) => api.put<{ goal: Goal }>(`/goals/${id}`, data),
  delete: (id: number) => api.delete(`/goals/${id}`),
};

// ── Calorie Goals ─────────────────────────────────────────────────────────────
export const calorieGoalsApi = {
  getAll: () => api.get<{ goals: CalorieGoal[] }>("/calorie-goals"),
  getActive: () => api.get<{ goal: CalorieGoal | null }>("/calorie-goals/active"),
  create: (data: any) => api.post<{ goal: CalorieGoal; calculation: any; warning?: string }>("/calorie-goals", data),
  preview: (data: any) => api.post<{ calculation: any; projection: any[] }>("/calorie-goals/preview", data),
  getProjection: (id: number) => api.get<{ goal: CalorieGoal; projected: any[]; actual: any[]; summary: any }>(`/calorie-goals/${id}/projection`),
  update: (id: number, data: any) => api.put<{ goal: CalorieGoal }>(`/calorie-goals/${id}`, data),
  delete: (id: number) => api.delete(`/calorie-goals/${id}`),
};

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (data: { message: string; agentType?: "coach" | "nutritionist" | "general" }) =>
    api.post<{
      message: string;
      agentType: string;
      conversationId: number;
      tokensUsed?: number;
      suggestedWorkout?: Record<string, any>;
      suggestedPlan?: Record<string, any>;
      suggestedMealPlan?: Record<string, any>;
    }>("/chat", data),
  getHistory: (agentType?: string, page = 1, limit = 20) =>
    api.get<{ conversations: Conversation[]; total: number }>(`/chat/history?page=${page}&limit=${limit}${agentType ? `&agentType=${agentType}` : ""}`),
  clearHistory: (agentType?: string) =>
    api.delete(`/chat/history${agentType ? `?agentType=${agentType}` : ""}`),
  saveWorkout: (data: any) => api.post("/chat/save-workout", data),
  saveCaloriePlan: (data: any) => api.post("/chat/save-calorie-plan", data),
};

// ── Weekly Plan ───────────────────────────────────────────────────────────────
export const weeklyPlanApi = {
  get: (week?: string) =>
    api.get<{ plan: WeeklyPlan | null; weekStart: string }>(`/weekly-plan${week ? `?week=${week}` : ""}`),
  upsert: (data: { week?: string; days: Array<{ dayIndex: number; label?: string; targetCalories?: number | null; notes?: string }> }) =>
    api.post<{ plan: WeeklyPlan }>("/weekly-plan", data),
  toggleDay: (dayId: number, data?: { actualCalories?: number; workoutId?: number }) =>
    api.patch<{ day: WeeklyPlanDay }>(`/weekly-plan/days/${dayId}/toggle`, data ?? {}),
  updateDay: (dayId: number, data: Partial<WeeklyPlanDay>) =>
    api.put<{ day: WeeklyPlanDay }>(`/weekly-plan/days/${dayId}`, data),
  deletePlan: (planId: number) =>
    api.delete(`/weekly-plan/${planId}`),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  getAll: () => api.get<{ reports: MonthlyReport[] }>("/reports"),
  getOne: (year: number, month: number) =>
    api.get<{ report: MonthlyReport }>(`/reports/${year}/${month}`),
  generate: (data?: { year?: number; month?: number; aiSummary?: boolean }) =>
    api.post<{ report: MonthlyReport }>("/reports/generate", data),
};

// ── Predictions ───────────────────────────────────────────────────────────────
export const predictionsApi = {
  get: () => api.get<any>("/predictions"),
};

// ── Water ─────────────────────────────────────────────────────────────────────
export const waterApi = {
  log: (amount: number, date?: string) =>
    api.post<{ log: WaterLog }>("/water", { amount, date }),
  getToday: (date?: string) =>
    api.get<{ logs: WaterLog[]; totalMl: number; targetMl: number; date: string }>(
      `/water/today${date ? `?date=${date}` : ""}`
    ),
  getHistory: (days = 7) =>
    api.get<{ history: Record<string, number>; days: number }>(`/water/history?days=${days}`),
  delete: (id: number) => api.delete(`/water/${id}`),
  setTarget: (targetMl: number) => api.put("/water/target", { targetMl }),
};

// ── Meal Plans ────────────────────────────────────────────────────────────────
export const mealPlansApi = {
  getAll: () => api.get<{ plans: MealPlan[] }>("/meal-plans"),
  getOne: (id: number) => api.get<{ plan: MealPlan }>(`/meal-plans/${id}`),
  create: (data: { name: string; weekStart: string }) =>
    api.post<{ plan: MealPlan }>("/meal-plans", data),
  update: (id: number, data: { name?: string; weekStart?: string }) =>
    api.put<{ plan: MealPlan }>(`/meal-plans/${id}`, data),
  delete: (id: number) => api.delete(`/meal-plans/${id}`),
  addEntry: (planId: number, dayId: number, data: Partial<MealPlanEntry>) =>
    api.post<{ entry: MealPlanEntry }>(`/meal-plans/${planId}/days/${dayId}/entries`, data),
  deleteEntry: (planId: number, entryId: number) =>
    api.delete(`/meal-plans/${planId}/entries/${entryId}`),
  updateDayNotes: (planId: number, dayId: number, notes: string) =>
    api.put(`/meal-plans/${planId}/days/${dayId}/notes`, { notes }),
};

// ── Workout Calendar ──────────────────────────────────────────────────────────
export const calendarApi = {
  getMonth: (month: string) =>
    api.get<{ days: WorkoutCalendarDay[]; month: string }>(`/calendar?month=${month}`),
  populate: (data: {
    month: string;
    assignments: Array<{
      dayOfWeek: number;          // 0=Mon … 6=Sun
      workoutName: string;
      muscleGroups?: string[];
      templateId?: number;
      isRestDay?: boolean;
    }>;
    overwrite?: boolean;
  }) => api.post<{ message: string; count: number }>("/calendar/populate", data),
  updateDay: (date: string, data: {
    workoutName?: string | null;
    muscleGroups?: string[] | null;
    templateId?: number | null;
    isRestDay?: boolean;
    notes?: string | null;
  }) => api.put<{ day: WorkoutCalendarDay }>(`/calendar/${date}`, data),
  deleteDay: (date: string) => api.delete(`/calendar/${date}`),
  swap: (date1: string, date2: string) =>
    api.post<{ message: string }>("/calendar/swap", { date1, date2 }),
  clearMonth: (month: string) =>
    api.delete<{ message: string; count: number }>(`/calendar/clear?month=${month}`),
};
