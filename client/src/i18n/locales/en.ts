// English locale — source of truth.
// The `Translation` interface below defines the shape used by all locales.
// Exercise names are intentionally kept in English across all locales.

export interface Translation {
  nav: {
    dashboard: string; nutrition: string; workouts: string; progress: string;
    goals: string; profile: string; more: string;
  };
  common: {
    save: string; cancel: string; delete: string; edit: string; add: string;
    create: string; loading: string; search: string; filter: string;
    noResults: string; today: string; yesterday: string; date: string;
    notes: string; optional: string; close: string; confirm: string;
    back: string; next: string; done: string; remove: string; reset: string;
    apply: string; name: string; goal: string; weight: string; calories: string;
    protein: string; carbs: string; fats: string; water: string;
    kg: string; lbs: string; kcal: string; min: string;
    sets: string; reps: string; rpe: string; net: string;
    burned: string; estimated: string; error: string;
    viewAll: string; manage: string;
  };
  dashboard: {
    title: string; goodMorning: string; goodAfternoon: string; goodEvening: string;
    caloriesConsumed: string; caloriesGoal: string; caloriesBurned: string;
    workoutToday: string; waterToday: string; bodyWeight: string; logWeight: string;
    noGoalSet: string; setGoal: string; recentWorkouts: string;
    noWorkoutsYet: string; weeklyActivity: string;
    caloriesToday: string; proteinToday: string; workoutsThisWeek: string;
    dayStreak: string; workoutStreak: string; nutritionStreak: string;
    weightTrend: string; weightTrendSub: string; todaysCalories: string;
    trainingDayMacros: string; restDayMacros: string;
    burnedToday: string; logYourWeight: string; logFirstWorkout: string;
    quickActions: string; weightLogHistory: string;
    activeGoal: string; manageGoal: string;
    cutting: string; bulking: string; maintaining: string;
    trainDay: string; restDay: string;
  };
  nutrition: {
    title: string; logFood: string; foodLog: string; quickLog: string;
    favorites: string; myFoods: string; mealPlanner: string; searchFood: string;
    addToLog: string; noFoodLogged: string; caloriesConsumed: string;
    caloriesBurned: string; netCalories: string; macros: string;
    supplements: string; addSupplement: string; waterIntake: string;
    logWater: string; ml: string; servingSize: string; servings: string;
    loggedAt: string; noGoal: string; setGoal: string; fasting: string;
    fastingTimer: string; startFast: string; stopFast: string; fastingFor: string;
    surplus: string; deficit: string; onTarget: string; includesSupps: string;
    autoEstimated: string; resetEstimate: string;
  };
  workouts: {
    title: string; logWorkout: string; workoutName: string; duration: string;
    caloriesBurned: string; addCaloriesBurned: string; trainingType: string;
    exercises: string; addExercise: string; history: string; templates: string;
    aiBuilder: string; calendar: string; noWorkouts: string; logFirst: string;
    newPR: string; previousBest: string; firstTime: string; volume: string;
    filterMuscle: string; calculateCalories: string; calorieCalculator: string;
    restTimer: string; restComplete: string; startRest: string;
    strength: string; hypertrophy: string; endurance: string; cardio: string; mobility: string;
  };
  progress: {
    title: string; bodyWeight: string; logWeight: string; weightHistory: string;
    goalWeight: string; currentWeight: string; startWeight: string;
    projection: string; bodyFat: string; analytics: string; noWeightData: string;
  };
  goals: {
    title: string; activeGoal: string; noGoal: string; createGoal: string;
    editGoal: string; type: string; weightLoss: string; weightGain: string;
    maintenance: string; targetWeight: string; targetDate: string;
    dailyCalories: string; weeklyChange: string; progressToDate: string;
    onTrack: string; behindSchedule: string; ahead: string;
  };
  profile: {
    title: string; personalInfo: string; firstName: string; lastName: string;
    email: string; age: string; height: string; heightCm: string; weightKg: string;
    bodyFat: string; activityLevel: string; fitnessGoal: string; injuries: string;
    trainingDays: string; saveProfile: string; profileSaved: string;
    language: string; changeLanguage: string; darkMode: string; notifications: string;
    waterTracking: string; security: string; changePassword: string;
    deleteAccount: string; dangerZone: string;
    resetAllData: string; resetConfirmMsg: string; resetDataSuccess: string;
    yesDeleteEverything: string; yourData: string; downloadMyData: string;
    manageProfile: string; appPreferences: string; nutritionPreferences: string;
    injuriesForm: string;
    sedentary: string; lightlyActive: string; moderatelyActive: string;
    veryActive: string; extremelyActive: string;
    loseWeight: string; gainMuscle: string; maintainWeight: string; improveEndurance: string;
  };
  auth: {
    login: string; register: string; logout: string; email: string; password: string;
    confirmPassword: string; forgotPassword: string; resetPassword: string;
    noAccount: string; haveAccount: string; signUp: string; signIn: string; verifyEmail: string;
  };
  offline: {
    noConnection: string; readOnlyMode: string; offline: string; backOnline: string;
  };
  ai: {
    nutritionCoach: string; workoutCoach: string; goalsCoach: string;
    askNutrition: string; askWorkout: string; askGoals: string;
    thinking: string; proactiveMode: string; proactiveOn: string; proactiveOff: string;
  };
}

// English strings
const en: Translation = {
  nav: {
    dashboard: "Dashboard", nutrition: "Nutrition", workouts: "Workouts",
    progress: "Progress", goals: "Goals", profile: "Profile", more: "More",
  },
  common: {
    save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", add: "Add",
    create: "Create", loading: "Loading…", search: "Search", filter: "Filter",
    noResults: "No results found", today: "Today", yesterday: "Yesterday",
    date: "Date", notes: "Notes", optional: "optional", close: "Close",
    confirm: "Confirm", back: "Back", next: "Next", done: "Done",
    remove: "Remove", reset: "Reset", apply: "Apply", name: "Name",
    goal: "Goal", weight: "Weight", calories: "Calories", protein: "Protein",
    carbs: "Carbs", fats: "Fats", water: "Water",
    kg: "kg", lbs: "lbs", kcal: "kcal", min: "min",
    sets: "Sets", reps: "Reps", rpe: "RPE", net: "Net",
    burned: "burned", estimated: "estimated", error: "Error",
    viewAll: "View all →", manage: "Manage →",
  },
  dashboard: {
    title: "Dashboard", goodMorning: "Good morning", goodAfternoon: "Good afternoon",
    goodEvening: "Good evening", caloriesConsumed: "Calories consumed",
    caloriesGoal: "Calorie goal", caloriesBurned: "Calories burned",
    workoutToday: "Workout today", waterToday: "Water today",
    bodyWeight: "Body weight", logWeight: "Log Weight",
    noGoalSet: "No goal set", setGoal: "Set a goal",
    recentWorkouts: "Recent Workouts", noWorkoutsYet: "No workouts logged yet",
    weeklyActivity: "Weekly Activity",
    caloriesToday: "Calories Today", proteinToday: "Protein Today",
    workoutsThisWeek: "Workouts This Week",
    dayStreak: "day streak", workoutStreak: "Workout streak",
    nutritionStreak: "On-target nutrition",
    weightTrend: "Weight Trend", weightTrendSub: "Actual + projected to goal",
    todaysCalories: "Today's Calories", trainingDayMacros: "Training Day Macros",
    restDayMacros: "Rest Day Macros", burnedToday: "Burned today",
    logYourWeight: "Log your weight", logFirstWorkout: "Log your first workout",
    quickActions: "Quick Actions", weightLogHistory: "Weight Log History",
    activeGoal: "Active Goal", manageGoal: "Manage",
    cutting: "Cutting", bulking: "Bulking", maintaining: "Maintaining",
    trainDay: "Train day", restDay: "Rest day",
  },
  nutrition: {
    title: "Nutrition", logFood: "Log Food", foodLog: "Food Log",
    quickLog: "Quick Log", favorites: "Favorites", myFoods: "My Foods",
    mealPlanner: "Meal Planner", searchFood: "Search food…", addToLog: "Add to Log",
    noFoodLogged: "No food logged yet", caloriesConsumed: "Calories consumed",
    caloriesBurned: "Calories burned", netCalories: "Net calories", macros: "Macros",
    supplements: "Supplements", addSupplement: "Add Supplement",
    waterIntake: "Water Intake", logWater: "Log Water", ml: "ml",
    servingSize: "Serving size", servings: "Servings", loggedAt: "Logged at",
    noGoal: "Set a calorie goal to track limits & deficit/surplus",
    setGoal: "Set a calorie goal", fasting: "Fasting", fastingTimer: "Fasting Timer",
    startFast: "Start Fast", stopFast: "Stop Fast", fastingFor: "Fasting for",
    surplus: "Surplus", deficit: "Deficit", onTarget: "On target",
    includesSupps: "incl. supps", autoEstimated: "auto-estimated",
    resetEstimate: "↩ reset estimate",
  },
  workouts: {
    title: "Workouts", logWorkout: "Log Workout", workoutName: "Workout Name",
    duration: "Duration (min)", caloriesBurned: "Calories Burned",
    addCaloriesBurned: "Add calories burned", trainingType: "Training type",
    exercises: "Exercises", addExercise: "Add Exercise", history: "History",
    templates: "Templates", aiBuilder: "AI Builder", calendar: "Calendar",
    noWorkouts: "No workouts yet", logFirst: "Log your first workout to start tracking progress",
    newPR: "New Personal Records!", previousBest: "Previous best", firstTime: "First time",
    volume: "vol", filterMuscle: "Filter exercises by muscle group",
    calculateCalories: "Calculate calories burned from activity type →",
    calorieCalculator: "Calorie Calculator", restTimer: "Rest Timer",
    restComplete: "Rest complete!", startRest: "Start rest timer",
    strength: "Strength", hypertrophy: "Hypertrophy", endurance: "Endurance",
    cardio: "Cardio", mobility: "Mobility",
  },
  progress: {
    title: "Progress", bodyWeight: "Body Weight", logWeight: "Log Weight",
    weightHistory: "Weight History", goalWeight: "Goal Weight",
    currentWeight: "Current Weight", startWeight: "Start Weight",
    projection: "Projection", bodyFat: "Body Fat %", analytics: "Analytics",
    noWeightData: "No weight data yet",
  },
  goals: {
    title: "Goals", activeGoal: "Active Goal", noGoal: "No active goal",
    createGoal: "Create Goal", editGoal: "Edit Goal", type: "Goal type",
    weightLoss: "Weight Loss", weightGain: "Weight Gain", maintenance: "Maintenance",
    targetWeight: "Target weight", targetDate: "Target date",
    dailyCalories: "Daily calories", weeklyChange: "Weekly change",
    progressToDate: "Progress to date", onTrack: "On track",
    behindSchedule: "Behind schedule", ahead: "Ahead of schedule",
  },
  profile: {
    title: "Profile", personalInfo: "Personal information", firstName: "First name",
    lastName: "Last name", email: "Email", age: "Age", height: "Height",
    heightCm: "Height (cm)", weightKg: "Weight (kg)", bodyFat: "Body fat %",
    activityLevel: "Activity level", fitnessGoal: "Fitness goal",
    injuries: "Injuries / limitations", trainingDays: "Training days per week",
    saveProfile: "Save Profile", profileSaved: "Profile saved!",
    language: "Language", changeLanguage: "Change language",
    darkMode: "Dark mode", notifications: "Notifications",
    waterTracking: "Water tracking", security: "Security",
    changePassword: "Change Password", deleteAccount: "Delete Account",
    dangerZone: "Danger Zone",
    resetAllData: "Reset all data",
    resetConfirmMsg: "Deletes all workouts, food logs, weight history, water logs, and goals. Your account and profile stay intact.",
    resetDataSuccess: "Data reset!",
    yesDeleteEverything: "Yes, delete everything",
    yourData: "Your Data",
    downloadMyData: "Download my data",
    manageProfile: "Manage your profile and account",
    appPreferences: "App Preferences",
    nutritionPreferences: "Nutrition Preferences",
    injuriesForm: "Injuries & Limitations",
    sedentary: "Sedentary", lightlyActive: "Lightly active",
    moderatelyActive: "Moderately active", veryActive: "Very active",
    extremelyActive: "Extremely active", loseWeight: "Lose weight",
    gainMuscle: "Gain muscle", maintainWeight: "Maintain weight",
    improveEndurance: "Improve endurance",
  },
  auth: {
    login: "Log in", register: "Register", logout: "Log out", email: "Email",
    password: "Password", confirmPassword: "Confirm password",
    forgotPassword: "Forgot password?", resetPassword: "Reset password",
    noAccount: "Don't have an account?", haveAccount: "Already have an account?",
    signUp: "Sign up", signIn: "Sign in", verifyEmail: "Verify your email",
  },
  offline: {
    noConnection: "No internet connection",
    readOnlyMode: "You're offline — changes won't be saved until you reconnect",
    offline: "Offline",
    backOnline: "Back online — all systems go!",
  },
  ai: {
    nutritionCoach: "Nutrition Coach", workoutCoach: "Workout Coach",
    goalsCoach: "Goals Coach",
    askNutrition: "Ask about meals, macros, or supplements…",
    askWorkout: "Ask about exercises, recovery, or programming…",
    askGoals: "Ask about your goals, timeline, or adjustments…",
    thinking: "Thinking…", proactiveMode: "Proactive mode",
    proactiveOn: "Proactive mode is on — coach will send you timely insights",
    proactiveOff: "Proactive mode is off",
  },
};

export default en;
// Keep TranslationKeys as alias for Translation so i18n/index.tsx compiles
export type { Translation as TranslationKeys };
