import api from "./axios";
import type {
  AuthResponse, User, Workout, WorkoutStats, WorkoutTemplate,
  FoodLog, FoodTotals, WeightLog, WeightStats, Goal, CalorieGoal,
  Conversation, MonthlyReport, ExerciseProgression, DashboardData,
} from "../types";

// ── Search ────────────────────────────────────────────────────────────────────
export const searchApi = {
  foods: (q: string, limit = 20) =>
    api.get<{ results: any[]; total: number }>(`/search/foods?q=${encodeURIComponent(q)}&limit=${limit}`),
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
  create: (data: Partial<Workout> & { exercises?: any[]; templateId?: number }) =>
    api.post<{ workout: Workout; newPRs?: Array<{ exerciseName: string; weight: number; reps: number; previousBest: number }> }>("/workouts", data),
  update: (id: number, data: Partial<Workout>) =>
    api.put<{ workout: Workout }>(`/workouts/${id}`, data),
  delete: (id: number) => api.delete(`/workouts/${id}`),
  startFromTemplate: (templateId: number, name?: string) =>
    api.post<{ workout: Workout; template: Partial<WorkoutTemplate> }>(`/workouts/start-from-template/${templateId}`, { name }),
  getExerciseProgression: (name: string, limit = 30) =>
    api.get<{ exerciseName: string; progression: ExerciseProgression[]; allTimePR: ExerciseProgression | null; totalSessions: number }>(
      `/workouts/exercises/${encodeURIComponent(name)}/progression?limit=${limit}`
    ),
  updateExercise: (exerciseId: number, data: any) =>
    api.put(`/workouts/exercises/${exerciseId}`, data),
  deleteExercise: (exerciseId: number) =>
    api.delete(`/workouts/exercises/${exerciseId}`),
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
  log: (data: Partial<FoodLog>) => api.post<{ log: FoodLog }>("/foods", data),
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
    api.post<{ message: string; agentType: string; conversationId: number }>("/chat", data),
  getHistory: (agentType?: string, page = 1, limit = 20) =>
    api.get<{ conversations: Conversation[]; total: number }>(`/chat/history?page=${page}&limit=${limit}${agentType ? `&agentType=${agentType}` : ""}`),
  clearHistory: (agentType?: string) =>
    api.delete(`/chat/history${agentType ? `?agentType=${agentType}` : ""}`),
  saveWorkout: (data: any) => api.post("/chat/save-workout", data),
  saveCaloriePlan: (data: any) => api.post("/chat/save-calorie-plan", data),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  getAll: () => api.get<{ reports: MonthlyReport[] }>("/reports"),
  getOne: (year: number, month: number) =>
    api.get<{ report: MonthlyReport }>(`/reports/${year}/${month}`),
  generate: (data?: { year?: number; month?: number; aiSummary?: boolean }) =>
    api.post<{ report: MonthlyReport }>("/reports/generate", data),
};
