// English locale — source of truth.
// The `Translation` interface below defines the shape used by all locales.
// Exercise names are intentionally kept in English across all locales.

export interface Translation {
  nav: {
    dashboard: string; nutrition: string; workouts: string; progress: string;
    goals: string; profile: string; more: string; mealPlanner: string; chat: string; reports: string; settings: string; templates: string; aiCoach: string; coachMode: string; adminMode: string; notifications: string;
  };
  common: {
    save: string; cancel: string; delete: string; edit: string; add: string;
    create: string; loading: string; search: string; filter: string;
    noResults: string; today: string; yesterday: string; date: string;
    notes: string; optional: string; close: string; confirm: string;
    back: string; next: string; done: string; remove: string; reset: string;
    apply: string; name: string; goal: string; weight: string; calories: string;
    custom: string;
    protein: string; carbs: string; fats: string; water: string;
    kg: string; lbs: string; kcal: string; min: string;
    day: string;
    sets: string; reps: string; rpe: string; net: string;
    burned: string; estimated: string; error: string;
    viewAll: string; manage: string; visible: string; hidden: string;
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
    kcalRemaining: string;
    onTrack: string; aheadOfSchedule: string; slightlyBehind: string;
    weeklyTrainingPlan: string; tapDayComplete: string; syncToCalendar: string;
    editSchedule: string; browsePlans: string; avgCalBurned: string;
    noPlanThisWeek: string; noPlanSub: string; daysCompleted: string;
    planYourWeek: string; suggestedPlansForDays: string; useThisPlan: string;
    backToPlanSuggestions: string; customizePlanHint: string; scrollToSeeAll: string;
    howManyDaysPerWeek: string; howManyMonthsToFill: string;
    syncWeeklyPlanToCalendar: string; syncWeeklyPlanDescription: string;
    replaceExistingCalendarDays: string; thisMonth: string; nextMonth: string; plusTwoMonths: string;
    trainingDaysUpdated: string; failedToSyncWeeklyPlan: string; syncedWeeklyPlanSummary: string;
    noActiveDaysToSync: string;
    planLevelIntermediate: string; planLevelAdvanced: string; adjustPlan: string;
    daySingular: string; daysPlural: string; monthSingular: string; monthsPlural: string;
    languageChanged: string;
    tapToView: string; kcalTarget: string; target: string; targetColon: string;
    inTheLast7Days: string; dayRest: string; daysRest: string;
    sinceLastWorkout: string; trainedToday: string;
    consumed: string; kcalOf: string; kcalOver: string;
    projected: string; chatWithCoach: string; nutritionAdvice: string;
    browseTemplates: string; monthlyReport: string; trainingDaysSaved: string;
    myGoal: string; saved: string; kgToGo: string;
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
    addSupplement2: string; addIngredient: string; adding: string; askNutritionist: string; buildDish: string; calorieComposition: string; caloriesKcal: string; caloriesFromMacros: string; clearAll: string; clearLoggedFoods: string; clearLoggedFoodsConfirm: string; clearLoggedFoodsDone: string; failedClearFoods: string; searchModeLabel: string; searchBasedMode: string; categoryBrowseMode: string; tagFiltersOn: string; tagFiltersOff: string; foodSearchOptionsHelp: string; tagsDisabledHint: string; chooseFoodCategory: string; chooseFoodFromCategory: string; selectCategoryPlaceholder: string; selectFoodPlaceholder: string; noFoodsInCategory: string; cookingExtras: string; cookingOil: string; createFirstFood: string; cuisine: string; defaultQty: string; defaultUnit: string; dietaryCategory: string; dishName: string; editMacros: string; emojiField: string; entries: string; filterMyFoods: string; filtering: string; foodName: string; foodType: string; getAiMealPlan: string; goalExceeded: string; goalMet: string; grams: string; ingredient: string; logAllMeals: string; logFirstMeal: string; logFoodMacros: string; logIngredientsSep: string; logTodayWeight: string; macronutrients: string; macrosPerServing: string; mealsLoggedSuccess: string; noCustomFoods: string; noFoodsLoggedToday: string; noItems: string; noResultsEnter: string; noResultsTryName: string; nothingLogged: string; nutritionistBuilding: string; pinFavourites: string; quantity: string; removeFromFavourites: string; removeSupplement: string; rightOnTarget: string; searchFoodDb: string; searchMyFoods: string; searchFoodPlaceholder: string; selectMealOptional: string; setCalorieGoal: string; startFromFood: string; supplementName: string; suggestedMealPlan: string; buildDishBowl: string; chatNutritionist: string; yourFoodLibrary: string; tdee: string; tapPhaseNutrition: string; within80Kcal: string; tryAgain: string; total: string; note: string; unit: string; meal: string; meals: string;
    mealOther: string; foodDatabase: string; createNewFood: string; editCustomFood: string; createCustomFood: string;
    saveChanges: string; createFood: string; nameRequired: string; caloriesReq: string; caloriesPositive: string;
    defaultQtyPositive: string; defaultUnitRequired: string; failedSaveCustomFood: string;
    foodNameRequired: string; qtyPositive: string; unitRequired: string; failedSaveFood: string;
    macroAutoUpdate: string; cheatMeal: string; showUnitRef: string; hideUnitRef: string;
    breadingCoating: string; sweetenerSugar: string; regenerate: string;
    failedMealPlan: string; failedLogMeals: string; noStructuredPlan: string;
    addToMealPlanner: string; mealPlanSavedSuccess: string; failedSaveMealPlan: string;
    loggedIndividually: string; loggedAsDish: string; failedSaveDish: string; addOneIngredient: string;
    kCalConsumed: string; kCalOver: string; kCalLeft: string; kCalUnderTarget: string;
    waterTargetReached: string; haveCustomFoods: string; noCustomFoodsCreate: string; noFoodsMatchFilter: string;
    viewRings: string; viewBreakdown: string; viewFoods: string; viewGoals: string;
    logSeparate: string; myFoodsCustom: string; newFoodBtn: string;
    surplusLargeTitle: string; surplusLargeBulk: string; surplusLargeDefault: string;
    surplusTitle: string; surplusBulk: string; surplusDefault: string;
    deficitLargeTitle: string; deficitLargeCut: string; deficitLargeDefault: string;
    deficitTitle: string; deficitCut: string; deficitDefault: string;
    suppCreatine: string; suppOmega3: string; suppWhey: string; proteinShakeFood: string;
    suppCasein: string; suppPlant: string; suppMassGainer: string;
    macrosPerUnit: string; addCustomSupp: string;
    favourites: string; addToFavourites: string; pinFavouritesHint: string; quickRelog: string;
    kcalLabel: string; proteinG: string; carbsG: string; fatG: string;
    protShort: string; carbsShort: string; fatShort: string; defaultQtyLabel: string;
    logWeight: string; savedConfirm: string; customDish: string;
    tagAsian: string; tagLatin: string; tagJapanese: string; tagItalian: string; tagMexican: string; tagCaribbean: string; tagIndian: string; tagSouthAsian: string; tagMiddleEastern: string; tagKorean: string;
    tagFit: string; tagKeto: string; tagHighProtein: string; tagVegan: string; tagVegetarian: string; tagGlutenFree: string;
    tagFastFood: string; tagDesserts: string; tagWholeGrain: string; tagLowCarb: string; tagHighSugar: string;
    tagMeats: string; tagSeafood: string; tagCheese: string; tagSoups: string; tagSausages: string;
    tagVegetables: string; tagFruits: string; tagSmoothies: string; tagSalads: string; tagPasta: string; tagDairy: string;
    oilNone: string; oilSpray: string; oilOliveTsp: string; oilOliveTbsp: string; oilTsp: string; oilTbsp: string;
    breadNone: string; breadFlour: string; breadBreadcrumbs: string; breadPanko: string;
    breadBeer: string; breadTempura: string; breadCornmeal: string;
    sweetNone: string; sweetSugarTsp: string; sweetSugarTbsp: string; sweetBrownTsp: string;
    sweetHoneyTsp: string; sweetHoneyTbsp: string; sweetAgave: string; sweetMaple: string;
    sweetStevia: string; sweetCondensed: string;
    phaseMenstruation: string; phaseFollicular: string; phaseOvulation: string; phaseLuteal: string;
    phaseDay: string;
    phaseMenstruationNutrition: string; phaseMenstruationWorkout: string;
    phaseFollicularNutrition: string; phaseFollicularWorkout: string;
    phaseOvulationNutrition: string; phaseOvulationWorkout: string;
    phaseLutealNutrition: string; phaseLutealWorkout: string;
  };
  workouts: {
    filterByMuscle: string; exercise: string; recommended: string;
    title: string; logWorkout: string; workoutName: string; duration: string;
    caloriesBurned: string; addCaloriesBurned: string; trainingType: string;
    exercises: string; addExercise: string; history: string; templates: string;
    aiBuilder: string; calendar: string; noWorkouts: string; logFirst: string;
    newPR: string; previousBest: string; firstTime: string; volume: string;
    filterMuscle: string; calculateCalories: string; calorieCalculator: string;
    restTimer: string; restComplete: string; startRest: string;
    strength: string; hypertrophy: string; endurance: string; cardio: string; mobility: string; fatLoss: string; general: string;
    activityType: string; calorieCalcTitle: string; calcCalories: string;
    stepsOptional: string; stepsPlaceholder: string;
    searchExercise: string; searchByNameMuscle: string; anyMuscle: string;
    noExercisesFound: string; noResultsTry: string; searching: string;
    suggestExercises: string; exerciseNameReq: string; primaryMuscleReq: string;
    describeExercise: string; instructionsOptional: string; equipment: string;
    createCustomExercise: string; createExercise: string;
    workoutNamePlaceholder: string; editWorkout: string; saveWorkout: string;
    saveChanges: string; logThisWorkout: string; loggedWorkout: string;
    howDidItGo: string; notesOptional: string; notesLabel: string;
    sets: string; reps: string; rpe: string; rangeLabel: string;
    markSetDone: string; addToWorkout: string; noExercisesLogged: string;
    noPersonalTemplates: string; noRecommendedTemplates: string; personalised: string;
    forkBtn: string; smartSuggestions: string;
    forkHint: string; goalTemplatesFatLoss: string; goalTemplatesHypertrophy: string; goalTemplatesStrength: string; goalTemplatesEndurance: string;
    scheduledWorkouts: string;
    selectAtLeastOneWeekday: string; calendarFillSummary: string; calendarEditableHint: string;
    seedTemplates: string; seedDesc: string; fullEditor: string; selectBtn: string;
    addToCalendar: string; addToMonthlyCalendar: string; buildMonthlyPlan: string;
    buildPlan: string; applyTemplateCalendar: string; applyTemplateBtn: string;
    swapDays: string; swappingDays: string; clearMonth: string;
    weeklySchedule: string; whichDays: string;
    targetMuscleGroups: string; trainingStyle: string; trainingTypeOptional: string;
    labelCalendar: string; linkTemplate: string; repeatWeekdays: string;
    overwriteDays: string; replaceDays: string; howManyMonths: string;
    anyNotesDay: string; saveDayBtn: string; templateDay: string;
    clickTrainingDays: string; clickToggle: string; wantsCustomise: string;
    plannedWorkout: string; weightsCardio: string;
    aiBuilderTitle: string; pickTargets: string; regenerate: string; nextBtn: string;
    difficultyLabel: string; dateLabel: string; durationLabel: string;
    exerciseSuggest: string; applyBtn: string; closeBtn: string;
    cancelTimer: string; logged: string; loading: string;
    todayLabel: string; doneBtn: string; viewBtn: string;
    generateWorkout: string; generating: string; pickAtLeastOneMuscleGroup: string;
    aiCouldNotGeneratePlan: string; failedToSaveWorkout: string; templateFrequencyMismatch: string;
    muscleChest: string; muscleBack: string; muscleShoulders: string; muscleBiceps: string; muscleTriceps: string;
    muscleUpperBody: string; muscleLowerBody: string; musclePush: string; musclePull: string; muscleLegs: string;
    muscleQuads: string; muscleHamstrings: string; muscleCalves: string; muscleGlutes: string; muscleTraps: string;
    muscleForearms: string; muscleCore: string; muscleFullBody: string; muscleAdductors: string; muscleAbductors: string;
    howManyMonthsToFill: string; thisMonth: string; nextMonth: string; plusTwoMonths: string;
    prepTitle: string; prepWarmup: string; prepStretch: string; prepShortNote: string;
    prepUpper: string; prepLower: string; prepPush: string; prepPull: string; prepFullBody: string; prepCardio: string; prepRecovery: string;
    prepNoteStrength: string; prepNoteHypertrophy: string; prepNoteEndurance: string; prepNoteRecovery: string; prepNoteGeneral: string;
    prepShoulderCircles: string; prepBandPullAparts: string; prepScapPushUps: string; prepThoracicRotations: string;
    prepDoorwayChestStretch: string; prepLatStretch: string; prepCrossBodyShoulderStretch: string; prepThoracicOpenBook: string;
    prepAnkleCircles: string; prepHipHinges: string; prepBodyweightSquats: string; prepGluteBridges: string;
    prepCouchStretch: string; prepHamstringStretch: string; prepCalfStretch: string; prepFigureFourStretch: string;
    prepBandExternalRotations: string; prepInclinePushUps: string; prepShoulderTaps: string; prepWallSlides: string;
    prepBandChestOpener: string; prepOverheadTricepsStretch: string;
    prepBandRows: string; prepScapRetractions: string; prepDeadHang: string; prepRearDeltStretch: string; prepBicepsWallStretch: string; prepChildPoseReach: string;
    prepBriskWalk: string; prepMarching: string; prepDynamicLunges: string; prepChestStretch: string; prepHipFlexorStretch: string; prepAnkleRocks: string; prepWorldsGreatestStretch: string; prepCatCow: string; prepDeadBugBreathing: string; prepControlledBreathing: string; prepPigeonStretch: string; prepBreathingReset: string; prepOpenBooks: string;
  };
  progress: {
    title: string; bodyWeight: string; logWeight: string; weightHistory: string;
    goalWeight: string; currentWeight: string; startWeight: string;
    projection: string; bodyFat: string; analytics: string; noWeightData: string;
    bodyTab: string; strengthTab: string; analyticsTab: string; predictionsTab: string; planTab: string;
    subtitle: string; currentStat: string; startingStat: string; changeStat: string; lowestStat: string; highestStat: string;
    lastDays: string; noWeightDataHelp: string; estimatedFatPct: string; invalidWeight: string; failedLogWeight: string;
    deleteWeightConfirm: string; weightNotesPlaceholder: string;
    rangeDay: string; rangeWeek: string; rangeWeeks: string; rangeMonth: string; rangeMonths: string; rangeYear: string;
  };
  goals: {
    title: string; activeGoal: string; noGoal: string; createGoal: string;
    editGoal: string; type: string; weightLoss: string; weightGain: string;
    maintenance: string; targetWeight: string; targetDate: string;
    dailyCalories: string; weeklyChange: string; progressToDate: string;
    onTrack: string; behindSchedule: string; ahead: string;
    goalNameOptional: string; currentWeightKg: string; targetWeightKg: string;
    proteinG: string; carbsG: string; fatsG: string;
    pause: string; reactivate: string; customise: string; targets: string;
    goalNamePlaceholder: string; createCalorieGoalDesc: string; calorieTargetsDesc: string;
    activeGoalFallback: string; emptyCreateDesc: string; emptyProfileHint: string;
    goalRealism: string; requiredPace: string; currentPace: string; adaptiveEta: string; needsMoreData: string;
    aggressiveDeadline: string; aggressiveDeadlineSuggest: string;
    forecastSubtitle: string; sparseForecastTitle: string; sparseForecastBody: string;
    sparseForecastDaysLogged: string; sparseForecastStatus: string; fallbackProjection: string;
    actualWeight: string; idealPlan: string; adaptiveForecast: string; whatIfPreview: string;
    caloriesEaten: string; workoutDaysPerWeek: string; workoutMinutesPerWeek: string;
    whatIfPreviewTitle: string; whatIfPreviewSubtitle: string; updatingPreview: string; previewHint: string;
    previewEta: string; applyPreview: string; applyPreviewConfirm: string;
    analyticsTitle: string; analyticsSubtitle: string; calorieAdherence: string; macroAdherence: string;
    workoutAdherence: string; weightVelocity: string; trendConfidence: string; etaDrift: string;
    plateauRisk: string; planStatus: string; elevated: string; normal: string;
    forecastStatus: string; fullAdaptiveForecast: string; sparseFallback: string; lastRefresh: string;
    normalizedOverlayHint: string;
    aggressivenessAggressive: string; aggressivenessConservative: string; aggressivenessReasonable: string;
    statusNeedsMoreData: string; statusTooAggressive: string; statusBehind: string; statusAhead: string; statusOnTrack: string;
    daysVsTarget: string; openPlanTab: string;
    enableMacroCycling: string; macroCyclingHelp: string; macroCyclingBasedOn: string; macroCyclingSettingsHint: string;
    calculating: string; previewPlan: string; fillRequiredTargets: string; recalcFailed: string; failedSave: string;
    recalculating: string; recalculateTargets: string; dailyTargets: string; autoFilledOverride: string; editManually: string;
    kcalFromMacrosMismatch: string; kcalFromMacrosMatch: string;
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
  settings: {
    equipment: string; difficulty: string; instructions: string; searchFood: string;
    savePreferences: string; saveInjuries: string; saveCycleSettings: string; updatePassword: string; currentPassword: string; newPassword: string; confirmPasswordField: string; selectActivityLevel: string; selectFitnessLevel: string; selectSex: string; selectDays: string; selectDuration: string; daysPerWeek: string; hoursPerSession: string; fitnessLevel: string; proteinTarget: string; appliedToCalc: string; whyMatters: string; usedByAI: string; showWaterWidget: string; switchDarkMode: string; controlsAppearance: string; preferenceSaved: string; appearancePreset: string; appearancePresetHelp: string; appearanceOptionSystemClassic: string; appearanceOptionLightClassic: string; appearanceOptionDarkCharcoal: string; appearanceOptionBlackGold: string; appearanceOptionWhiteGreen: string; appearanceOptionMidnightCyan: string; appearanceOptionSoftSand: string; appearanceOptionEditorialRose: string; appearanceOptionIndustrialSlate: string; appearanceOptionPaperIvory: string; appearanceOptionAuroraInk: string; appearanceOptionSunriseAmber: string; colorTheme: string; colorThemeHelp: string; themeOptionDefault: string; themeOptionBlackGold: string; themeOptionWhiteGreen: string; downloadDataDesc: string; irreversibleActions: string; memberSince: string; account: string; username: string; cycleLength: string; firstDayPeriod: string; menstrualCycleTracking: string; cyclePersonalises: string; avgCycleLength: string; commonRanges: string; injuriesExercises: string; trainingSchedule: string; goToPlan: string; goalDescription: string; passwordHint: string; activityLevel: string; injuriesSaved: string; injurySelectHelp: string; activeLimitations: string; injuryWarning: string; injuryLowerBack: string; injuryUpperBack: string; injuryKneeLeft: string; injuryKneeRight: string; injuryShoulderLeft: string; injuryShoulderRight: string; injuryHip: string; injuryElbowLeft: string; injuryElbowRight: string; injuryWristLeft: string; injuryWristRight: string; injuryAnkleLeft: string; injuryAnkleRight: string; injuryRotatorCuff: string; injuryHamstring: string; injuryItBand: string; injuryPlantarFascia: string; coachPrivacyTitle: string; coachPrivacySubtitle: string; coachPrivacyHelp: string; coachVisibilityWorkouts: string; coachVisibilityNutrition: string; coachVisibilityWeight: string; coachVisibilityGoals: string; coachVisibilityMealPlans: string; coachVisibilityCalendar: string; buildVersion: string; buildId: string; updateReadyTitle: string; updateReadyBody: string; refreshApp: string;
  };
  auth: {
    login: string; register: string; logout: string; email: string; password: string;
    confirmPassword: string; forgotPassword: string; resetPassword: string;
    noAccount: string; haveAccount: string; signUp: string; signIn: string; verifyEmail: string;
    createAccount: string; createAccountDesc: string; welcomeBack: string; signInDesc: string;
    firstName: string; lastName: string; username: string; rememberMe: string; passwordRequirements: string;
    serverUnavailable: string; invalidCredentials: string; tooManyAttempts: string; sessionExpired: string;
    emailRequired: string; validEmail: string; usernameRequired: string; usernameLength: string;
    usernameChars: string; passwordRequired: string; passwordMinLength: string; confirmPasswordRequired: string;
    passwordsDoNotMatch: string;
  };
  offline: {
    noConnection: string; readOnlyMode: string; offline: string; backOnline: string;
  };
  chat: {
    title: string; newChat: string; clearHistory: string; thinking: string;
    placeholder: string; send: string; noConversations: string;
    workoutCoach: string; nutritionist: string; generalCoach: string;
    coachDesc: string; nutritionistDesc: string; generalDesc: string;
    logWorkout: string; logMeal: string; suggestWorkout: string;
    saving: string; notNow: string; savedCheck: string; meAvatar: string;
    workoutsTitle: string; workoutReplaceQ: string; workoutSaveQ: string;
    workoutUpdateBtn: string; workoutAddBtn: string;
    mealPlannerTitle: string; mealReplaceQ: string; mealAppendQ: string; mealSaveQ: string;
    mealUpdateBtn: string; mealSaveBtn: string;
    goalsTitle: string; goalSaveQ: string; goalSaveBtn: string;
    scheduleWorkoutTitle: string; scheduleWorkoutBody: string; scheduleWorkoutDays: string;
    scheduleWorkoutMonths: string; scheduleWorkoutOverwrite: string; scheduleWorkoutConfirm: string;
    mealDurationTitle: string; mealDurationBody: string; mealDurationConfirm: string;
    monthCount: string; weekCount: string; toastWorkoutScheduled: string;
    today: string; yesterday: string; daysAgo: string;
    errorMsg: string; clearConfirm: string;
    recentChats: string; noHistory: string;
    switchToAgent: string; switchBody: string; stayHere: string; switchBtn: string;
    inputPlaceholder: string;
    starterCoach1: string; starterCoach2: string; starterCoach3: string; starterCoach4: string;
    starterNutri1: string; starterNutri2: string; starterNutri3: string; starterNutri4: string;
    starterGeneral1: string; starterGeneral2: string; starterGeneral3: string; starterGeneral4: string;
    toastWorkoutUpdated: string; toastWorkoutSaved: string;
    toastMealUpdated: string; toastMealSaved: string; toastGoalSaved: string;
  };
  reports: {
    title: string; monthly: string; noReports: string; generating: string;
    weightDelta: string; workoutsLogged: string; avgCalories: string;
    aiSummary: string; generateSummary: string; topFoods: string;
    consistency: string; highlights: string; back: string; startOfMonth: string; endOfMonth: string; month: string; year: string; pastReports: string; subtitle: string;
  };
  mealPlanner: {
    title: string; thisWeek: string; addFood: string; clearDay: string;
    noMeals: string; breakfast: string; lunch: string; dinner: string; snack: string;
    snack1: string; snack2: string; snack3: string; preWorkout: string; other: string;
    searchFood: string; servings: string; logAll: string; logDay: string;
    calories: string; planSaved: string; savePlan: string;
    copyFromLast: string; aiGenerate: string; myPlans: string; newPlan: string; noPlans: string; noPlansDesc: string;
    createFirst: string; createPlan: string; planLength: string; planName: string; weekStarting: string;
    createFailed: string; planNamePlaceholder: string; weekOf: string; selectPlan: string;
    subtitle: string; addToMeal: string; avgKcalDay: string; avgProtein: string;
    noFoods: string; quantity: string; unit: string; deletePlan: string;
    defaultPlanName: string; searchPlaceholder: string;
    monday: string; tuesday: string; wednesday: string; thursday: string;
    friday: string; saturday: string; sunday: string;
  };
  templates: {
    title: string; useTemplate: string; noTemplates: string;
    createTemplate: string; myTemplates: string; community: string;
    difficulty: string; beginner: string; intermediate: string; advanced: string;
    duration: string; exercises: string; startWorkout: string; preview: string;
    recommended: string; preBuiltSplits: string; recommendedTemplatesEmpty: string;
    seedRecommendedTemplates: string; seedRecommendedDesc: string; personalTemplatesEmpty: string;
    saveWorkoutAsTemplateHint: string; askAiCoach: string; deleteTemplateConfirm: string;
    templateDeleted: string; templateRenamed: string; templateAdded: string;
    splitPpl: string; splitUpperLower: string; splitBroSplit: string; splitFullBody: string; splitCustom: string;
    splitFullBody3d: string; splitPpl6d: string; splitUpperLower4d: string; splitBroSplit5d: string; splitFatLoss4d: string;
    showingPlansForDays: string; matchingProfileSetting: string; viewTemplate: string;
    failedToStartWorkout: string; weekShort: string;
  };
  ai: {
    nutritionCoach: string; workoutCoach: string; goalsCoach: string;
    askNutrition: string; askWorkout: string; askGoals: string;
    thinking: string; proactiveMode: string; proactiveOn: string; proactiveOff: string;
  };
  coach: {
    title: string; subtitle: string; open: string;
    inviteClient: string; inviteClientBody: string; createInviteCode: string; activeCode: string;
    assignedClients: string; loadingClients: string; noClients: string; totalClients: string;
    clientOverviewTitle: string; clientOverviewBody: string; backToClients: string;
    currentGoal: string; recentCalories: string; recentProtein: string; pendingProposals: string;
    clientActivity: string; recentWorkouts: string; noLoggedWorkouts: string;
    activeCalorieGoal: string; noActiveCalorieGoal: string; currentMealPlans: string; noMealPlans: string;
    adherenceWidgets: string; weeklyCheckIns: string; noWeeklyCheckIns: string; calorieWidget: string; proteinWidget: string; workoutWidget: string; weightWidget: string; checkInSummary: string; fatigue: string; soreness: string; hunger: string; sleepQuality: string; performance: string;
    needsAttentionToday: string; attentionClients: string; attentionClientsSub: string; notifications: string; notificationsSub: string; noNotifications: string; reusableLibraries: string; reusableLibrariesSub: string; workoutLibraries: string; mealLibraries: string; overdueCheckIns: string; swapWorkout: string; swapMeal: string; addCoachNote: string; coachNote: string; notePlaceholder: string; saveNote: string; noWorkoutLibraries: string; noMealLibraries: string; newProposalNotification: string; newProposalsNotification: string; proposalUpdatedNotification: string; proposalAcceptedNotification: string; proposalRejectedNotification: string; proposalCommentSaved: string; verifiedCoach: string;
    clientSnapshot: string; clientSnapshotBody: string; trainingFrequency: string; trainingDaysSummary: string; noTrainingFrequency: string; visibilityConsent: string; noVisibilityData: string; thisWeek: string; plansAndProposals: string; coachTools: string; latestTrendSummary: string; loggedAtLabel: string; needsFollowUp: string; planStatusLabel: string; quickActionsLabel: string; createZone: string; reusePlan: string; reviewZone: string;
    statusPending: string; statusAccepted: string; statusRejected: string; statusNeedsAttention: string; statusOverdue: string;
    ownershipCoachPlan: string; ownershipYourPlan: string; ownershipAiSuggestion: string;
    visibilityVisibleToCoach: string; visibilityPrivate: string; visibilityPendingReview: string;
    todayPriorities: string; recentCoachActivity: string; libraryTools: string; reusablePlans: string; topConcern: string; latestCheckIn: string; clientsWaitingReview: string;
    publishDrafts: string; workoutTemplate: string; selectTemplate: string; overwrite: string;
    sendWorkoutDraft: string; mealPlan: string; selectMealPlan: string; sendMealDraft: string;
    goalMacros: string; selectCalorieGoal: string; fallbackGoalName: string; sendGoalDraft: string;
    proposalHistory: string; noCoachProposals: string;
    proposalDiff: string; proposalComments: string; noProposalComments: string; addComment: string; commentPlaceholder: string; sendComment: string;
    coachUpdates: string; coachUpdatesTitle: string; coachUpdatesBody: string; coachProposalLabel: string; pendingYourApproval: string; whyThisChanged: string; reviewDetails: string; hideDetails: string; coachUpdatesInlineHint: string;
    workoutProposal: string; mealProposal: string; goalProposal: string;
    fromCoach: string; pending: string; accepted: string; rejected: string;
    joinCoach: string; joinCoachBody: string; coachConnectSectionTitle: string; coachConnectSectionBody: string; coachConnectSectionHelp: string; coachConnectMovedHint: string; haveCoachCode: string; haveCoachCodeHelp: string; connectBannerTitle: string; connectBannerBody: string; connectCardTitle: string; connectCardBody: string; coachConnectedTitle: string; coachConnectedBody: string; coachConnectedBadge: string; coachConnectedBanner: string; reviewCoachUpdates: string; inviteCodePlaceholder: string; connect: string;
    createCoachInvite: string; createCoachInviteBody: string; generate: string; inviteCode: string;
    coachLinkActivated: string; failedAcceptInvite: string;
    loadingProposals: string; noPendingProposals: string; accept: string; reject: string;
    oneMonth: string; twoMonths: string; threeMonths: string;
    quickSchedule: string; advancedPerDay: string; startDate: string; duration: string;
    weeks: string; months: string; restDay: string; workoutNamePlaceholder: string;
    muscleGroupsPlaceholder: string; notesPlaceholder: string; existingPlan: string;
    createFromScratch: string; scratchMealDefaultName: string; mealLineFormat: string;
    searchMealBuilderHint: string; addFoodToMeal: string; emptyMealHint: string;
    dayTotal: string; computedDuration: string;
    oneWeek: string; fourWeeks: string; eightWeeks: string; twelveWeeks: string;
    weekCount: string;
  };
  notifications: {
    title: string; subtitleCoach: string; subtitleUser: string; center: string; centerSub: string;
    unread: string; noNotifications: string; markAllRead: string; markRead: string;
    proposalTimeline: string; coachFeed: string; userFeed: string;
    openCoach: string; openDashboard: string; viewDetails: string;
    attentionQueue: string; attentionQueueSub: string; searchPlaceholder: string; proposalWaiting: string;
    modeCoach: string; modeUser: string; sectionUnread: string; sectionToday: string; sectionEarlier: string;
    emptyCoachTitle: string; emptyCoachBody: string; emptyUserTitle: string; emptyUserBody: string;
    emptyFilteredTitle: string; emptyFilteredBody: string; emptyAttentionTitle: string; emptyAttentionBody: string;
  };
  admin: {
    title: string; subtitle: string; userLookup: string; searchPlaceholder: string; search: string;
    coachRelationships: string; noRelationships: string; coachToClient: string;
    roleUser: string; roleCoach: string; roleAdmin: string; roleDeveloper: string;
    openWorkspace: string; backToInternal: string; workspaceTitle: string; joinedOn: string;
    profileAndRole: string; roleLabel: string; trainingDaysLabel: string; permissionFlagsLabel: string;
    statsOverview: string; activeGoalLabel: string; goalTypeLabel: string; dailyCaloriesLabel: string;
    targetWeightLabel: string; targetDateLabel: string; noActiveGoal: string; recentNutrition: string;
    noRecentNutrition: string; recentWorkouts: string; noRecentWorkouts: string; recentWeight: string;
    noRecentWeight: string; recentMealPlans: string; noMealPlans: string; calendarPreview: string;
    calendarPreviewSubtitle: string; noCalendarDays: string; relationshipsForUser: string;
    noRelationshipsForUser: string; pendingProposals: string; noPendingProposals: string; exerciseCountLabel: string; restDayLabel: string;
    totalUsers: string; totalCoaches: string; totalInternalUsers: string; totalPendingProposals: string;
    systemTotals: string; recentUsageSignals: string; recentUsageSignalsSub: string;
    metricSignups7d: string; metricWorkouts7d: string; metricFoodLogs7d: string; metricWeights7d: string;
    metricChats7d: string; metricActiveGoals: string; metricCalendarDays30d: string; metricPendingCoachLinks: string;
    recentAuditLogs: string; recentAuditLogsSub: string; noAuditLogs: string; readOnlyView: string;
    readOnlyBannerTitle: string; readOnlyBannerBody: string;
    impersonationBanner: string; endImpersonation: string; startImpersonation: string;
    coachPrivacyTitle: string; coachPrivacySubtitle: string; coachTestTitle: string; coachTestSub: string; coachTestBody: string; actAsCoachForClient: string; visibleToCoach: string; hiddenFromCoach: string;
    featureFlags: string; featureFlagsSub: string; noFeatureFlags: string; enabled: string; disabled: string;
    contentOps: string; contentOpsSub: string; repairTools: string; repairToolsSub: string;
    repairUserIdLabel: string; repairUserIdPlaceholder: string; repairSyncWeight: string; repairCleanupInvites: string;
  };
}

// English strings
const en: Translation = {
  nav: {
    dashboard: "Dashboard", nutrition: "Nutrition", workouts: "Workouts",
    progress: "Progress", goals: "Goals", profile: "Profile", more: "More",
    mealPlanner: "Meal Planner", chat: "AI Coach", reports: "Reports", settings: "Settings", templates: "Templates", aiCoach: "AI Coach", coachMode: "Coach Mode", adminMode: "Admin / Dev", notifications: "Notifications",
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
    day: "Day",
    sets: "Sets", reps: "Reps", rpe: "RPE", net: "Net",
    burned: "burned", estimated: "estimated", error: "Error",
    viewAll: "View all →", manage: "Manage →", visible: "Visible", hidden: "Hidden", custom: "Custom",
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
    kcalRemaining: "kcal remaining",
    onTrack: "✅ On Track",
    aheadOfSchedule: "🚀 Ahead of Schedule",
    slightlyBehind: "⚠️ Slightly Behind",
    weeklyTrainingPlan: "Weekly Training Plan",
    tapDayComplete: "Tap a day to mark complete · Numbers show kcal",
    syncToCalendar: "Sync to calendar",
    editSchedule: "Edit schedule",
    browsePlans: "Browse Plans",
    avgCalBurned: "Avg calories burned",
    noPlanThisWeek: "No plan for this week",
    noPlanSub: "Choose from beginner-friendly to advanced templates",
    daysCompleted: "days",
    planYourWeek: "Plan your week",
    suggestedPlansForDays: "Suggested plans for {{days}} days",
    useThisPlan: "Use This Plan →",
    backToPlanSuggestions: "← Back to plan suggestions",
    customizePlanHint: "Toggle days on/off, edit labels, and optionally set a calorie target for each session.",
    scrollToSeeAll: "↕ scroll to see all",
    howManyDaysPerWeek: "How many days per week will you train?",
    howManyMonthsToFill: "How many months to fill?",
    syncWeeklyPlanToCalendar: "Sync Weekly Plan to Calendar",
    syncWeeklyPlanDescription: "Fills your workout calendar with this week's schedule, repeated across the selected months.",
    replaceExistingCalendarDays: "Replace existing calendar days",
    thisMonth: "This month",
    nextMonth: "+ Next month",
    plusTwoMonths: "+ 2 months",
    trainingDaysUpdated: "Training days updated to {{days}} 💪 — update your weekly plan to match!",
    failedToSyncWeeklyPlan: "Failed to sync to calendar.",
    syncedWeeklyPlanSummary: "Synced {{days}} {{dayWord}} across {{months}} {{monthWord}}! Open the Calendar tab to review.",
    noActiveDaysToSync: "No active days to sync.",
    planLevelIntermediate: "Intermediate",
    planLevelAdvanced: "Advanced",
    adjustPlan: "Adjust plan",
    daySingular: "day",
    daysPlural: "days",
    monthSingular: "month",
    monthsPlural: "months",
    languageChanged: "Language updated",
    tapToView: "tap to view →",
    kcalTarget: "kcal target",
    target: "target",
    targetColon: "Target:",
    inTheLast7Days: "in the last 7 days",
    dayRest: "day rest",
    daysRest: "days rest",
    sinceLastWorkout: "Since last workout",
    trainedToday: "Trained today",
    consumed: "consumed",
    kcalOf: "of",
    kcalOver: "kcal over",
    projected: "Projected",
    chatWithCoach: "Chat with AI Coach",
    nutritionAdvice: "Nutrition Advice",
    browseTemplates: "Browse Templates",
    monthlyReport: "Monthly Report",
    trainingDaysSaved: "Training days saved!",
    myGoal: "My Goal",
    saved: "Saved!",
    kgToGo: "kg to go",
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
    addSupplement2: "Add Your Supplement",
    addIngredient: "Add ingredient",
    adding: "Adding…",
    askNutritionist: "Ask Nutritionist",
    buildDish: "Build a dish or bowl from multiple ingredients",
    calorieComposition: "Calorie composition",
    caloriesKcal: "Calories (kcal)",
    caloriesFromMacros: "Calories from macros",
    clearAll: "Clear all",
    clearLoggedFoods: "Clear today's foods",
    clearLoggedFoodsConfirm: "Clear all foods logged for this day?",
    clearLoggedFoodsDone: "Today's foods cleared",
    failedClearFoods: "Failed to clear today's foods",
    searchModeLabel: "Food lookup mode",
    searchBasedMode: "Search",
    categoryBrowseMode: "Browse category",
    tagFiltersOn: "Tags on",
    tagFiltersOff: "Tags off",
    foodSearchOptionsHelp: "Choose the search style you prefer. Category browse and tag filters are optional.",
    tagsDisabledHint: "Tag filters are hidden right now. Turn them back on anytime if you want extra browsing options.",
    chooseFoodCategory: "Choose category",
    chooseFoodFromCategory: "Choose food",
    selectCategoryPlaceholder: "Select a category",
    selectFoodPlaceholder: "Select a food",
    noFoodsInCategory: "No foods found in this category",
    cookingExtras: "Cooking extras",
    cookingOil: "Cooking oil",
    createFirstFood: "Create First Food",
    cuisine: "Cuisine",
    defaultQty: "Default Qty",
    defaultUnit: "Default Unit",
    dietaryCategory: "Dietary Category",
    dishName: "Dish name",
    editMacros: "Edit macros per unit",
    emojiField: "Emoji (e.g. 🌿)",
    entries: "Entries",
    filterMyFoods: "Filter my foods...",
    filtering: "Filtering:",
    foodName: "Food Name",
    foodType: "Food Type",
    getAiMealPlan: "Get an AI-generated meal plan for today",
    goalExceeded: "Goal exceeded ✓",
    goalMet: "Goal met ✓",
    grams: "Grams",
    ingredient: "Ingredient",
    logAllMeals: "Log All Meals",
    logFirstMeal: "Log First Meal",
    logFoodMacros: "Log food to see macro breakdown",
    logIngredientsSep: "Log ingredients separately",
    logTodayWeight: "Log today's weight",
    macronutrients: "Macronutrients",
    macrosPerServing: "Macros per serving (default qty above)",
    mealsLoggedSuccess: "Meals logged successfully!",
    noCustomFoods: "No custom foods yet",
    noFoodsLoggedToday: "No foods logged yet today.",
    noItems: "No items",
    noResultsEnter: "No results -- enter details manually below",
    noResultsTryName: "No results — try a different name.",
    nothingLogged: "Nothing logged yet",
    nutritionistBuilding: "Nutritionist is building your plan…",
    pinFavourites: "Pin your favourite foods here — tap",
    quantity: "Quantity",
    removeFromFavourites: "Remove from favourites",
    removeSupplement: "Remove this supplement",
    rightOnTarget: "Right on target!",
    searchFoodDb: "Search Food Database",
    searchMyFoods: "Search My Foods",
    searchFoodPlaceholder: "Search food (e.g. chicken breast, oats)...",
    selectMealOptional: "Select meal (optional)",
    setCalorieGoal: "Set a calorie goal",
    startFromFood: "Start from a food in the database (optional)",
    supplementName: "Supplement name *",
    suggestedMealPlan: "✨ Suggested Meal Plan",
    buildDishBowl: "🥣 Build a Dish / Bowl",
    chatNutritionist: "Chat with your AI nutritionist",
    yourFoodLibrary: "Your personal food library — only visible to you",
    tdee: "TDEE",
    tapPhaseNutrition: "Tap to see phase-specific nutrition & workout tips",
    within80Kcal: "You're within 80 kcal of your daily goal.",
    tryAgain: "Try Again",
    total: "Total",
    note: "Note",
    unit: "Unit",
    meal: "Meal",
    meals: "Meals",
    mealOther: "Other",
    foodDatabase: "Food Database",
    createNewFood: "Create New Food",
    editCustomFood: "Edit custom food",
    createCustomFood: "Create custom food",
    saveChanges: "Save changes",
    createFood: "Create food",
    nameRequired: "Name is required",
    caloriesReq: "Calories are required",
    caloriesPositive: "Calories must be 0 or more",
    defaultQtyPositive: "Default quantity must be positive",
    defaultUnitRequired: "Default unit is required",
    failedSaveCustomFood: "Failed to save custom food",
    foodNameRequired: "Food name is required",
    qtyPositive: "Quantity must be a positive number",
    unitRequired: "Unit is required",
    failedSaveFood: "Failed to save. Check all fields and try again.",
    macroAutoUpdate: "Macros update automatically as you change quantity",
    cheatMeal: "Mark as cheat meal",
    showUnitRef: "Show unit reference (spoon, cup, bowl…)",
    hideUnitRef: "Hide unit reference (spoon, cup, bowl…)",
    breadingCoating: "Breading / coating",
    sweetenerSugar: "Sweetener / sugar",
    regenerate: "Regenerate",
    failedMealPlan: "Failed to get meal plan suggestion.",
    failedLogMeals: "Failed to log meals.",
    addToMealPlanner: "Add to Meal Planner",
    mealPlanSavedSuccess: "Meal plan saved to Meal Planner!",
    failedSaveMealPlan: "Failed to save the meal plan.",
    noStructuredPlan: "The nutritionist didn't return a structured meal plan. Try again or ask directly in the chat.",
    loggedIndividually: "Each ingredient logged individually",
    loggedAsDish: "Logged as one combined dish entry",
    failedSaveDish: "Failed to save dish",
    addOneIngredient: "Add at least one ingredient",
    kCalConsumed: "kcal consumed",
    kCalOver: "kcal over",
    kCalLeft: "kcal left",
    kCalUnderTarget: "kcal under target",
    waterTargetReached: "Daily target reached! Great job staying hydrated.",
    haveCustomFoods: "Have custom foods? Switch to the My Foods tab above.",
    noCustomFoodsCreate: "No custom foods yet. Hit + New food to create your first one.",
    noFoodsMatchFilter: "No foods match your filter.",
    viewRings: "Rings",
    viewBreakdown: "Breakdown",
    viewFoods: "Foods",
    viewGoals: "Goals",
    logSeparate: "Log ingredients separately",
    myFoodsCustom: "your custom foods",
    newFoodBtn: "Add New Food",
    surplusLargeTitle: "⚠ {{pct}}% over your {{target}} kcal goal ({{kcal}} kcal surplus).",
    surplusLargeBulk: "Even for a bulk, this surplus is large — excess may convert to fat.",
    surplusLargeDefault: "This significantly exceeds your daily target and will impact your progress.",
    surplusTitle: "Calorie surplus of {{kcal}} kcal.",
    surplusBulk: "You're in a planned surplus — good for muscle building. Make sure protein is on track.",
    surplusDefault: "You've exceeded your daily target. This contributes to weight gain over time.",
    deficitLargeTitle: "⚠ {{pct}}% under your {{target}} kcal goal ({{kcal}} kcal deficit).",
    deficitLargeCut: "This deficit is too aggressive — risks muscle loss and metabolic adaptation.",
    deficitLargeDefault: "You're significantly under your target. Log missing meals or increase intake.",
    deficitTitle: "Calorie deficit of {{kcal}} kcal.",
    deficitCut: "You're on track for fat loss. Ensure you're hitting your protein target to protect muscle.",
    deficitDefault: "You're under your daily target. Log more meals if this isn't intentional.",
    suppCreatine: "Creatine Monohydrate",
    suppOmega3: "Omega-3 Fish Oil",
    suppWhey: "Whey Protein Shake",
    proteinShakeFood: "Protein Shake",
    suppCasein: "Casein Protein Shake",
    suppPlant: "Plant Protein Shake",
    suppMassGainer: "Mass Gainer Shake",
    macrosPerUnit: "Macros / {{qty}} {{unit}}",
    addCustomSupp: "+ Custom",
    favourites: "Favourites",
    addToFavourites: "+ Add to Favourites",
    pinFavouritesHint: "Pin your favourite foods here — tap \"+ Add to Favourites\" above, or tap ⭐ next to any logged meal.",
    quickRelog: "Quick Re-log",
    kcalLabel: "kcal",
    proteinG: "Protein g",
    carbsG: "Carbs g",
    fatG: "Fat g",
    protShort: "prot",
    carbsShort: "carbs",
    fatShort: "fat",
    defaultQtyLabel: "Default qty",
    logWeight: "Log Weight",
    savedConfirm: "Saved!",
    customDish: "Custom Dish",
    tagAsian: "Asian", tagLatin: "Latin / Hispanic", tagJapanese: "Japanese", tagItalian: "Italian", tagMexican: "Mexican",
    tagCaribbean: "Caribbean", tagIndian: "Indian", tagSouthAsian: "South Asian",
    tagMiddleEastern: "Middle Eastern", tagKorean: "Korean",
    tagFit: "Fit", tagKeto: "Keto", tagHighProtein: "High-Protein",
    tagVegan: "Vegan", tagVegetarian: "Vegetarian", tagGlutenFree: "Gluten-Free", tagFastFood: "Fast Food",
    tagDesserts: "Desserts", tagWholeGrain: "Whole Grain", tagLowCarb: "Low-Carb", tagHighSugar: "High-Sugar",
    tagMeats: "Meats", tagSeafood: "Seafood", tagCheese: "Cheese", tagSoups: "Soups",
    tagSausages: "Sausages", tagVegetables: "Vegetables", tagFruits: "Fruits",
    tagSmoothies: "Smoothies", tagSalads: "Salads", tagPasta: "Pasta", tagDairy: "Dairy",
    oilNone: "No oil", oilSpray: "Spray oil (~1 sec)",
    oilOliveTsp: "Olive oil \u2013 1 tsp", oilOliveTbsp: "Olive oil \u2013 1 tbsp",
    oilTsp: "Oil \u2013 1 tsp", oilTbsp: "Oil \u2013 1 tbsp",
    breadNone: "No breading", breadFlour: "Flour coat (light dusting)",
    breadBreadcrumbs: "Breadcrumbs (standard)", breadPanko: "Panko breadcrumbs",
    breadBeer: "Beer batter", breadTempura: "Tempura batter", breadCornmeal: "Cornmeal / polenta crust",
    sweetNone: "No sweetener", sweetSugarTsp: "White sugar \u2013 1 tsp",
    sweetSugarTbsp: "White sugar \u2013 1 tbsp", sweetBrownTsp: "Brown sugar \u2013 1 tsp",
    sweetHoneyTsp: "Honey \u2013 1 tsp", sweetHoneyTbsp: "Honey \u2013 1 tbsp",
    sweetAgave: "Agave syrup \u2013 1 tsp", sweetMaple: "Maple syrup \u2013 1 tsp",
    sweetStevia: "Stevia / sweetener (0)", sweetCondensed: "Condensed milk \u2013 1 tbsp",
    phaseMenstruation: "Menstruation", phaseFollicular: "Follicular",
    phaseOvulation: "Ovulation", phaseLuteal: "Luteal",
    phaseDay: "phase \u2014 Day",
    phaseMenstruationNutrition: "Boost iron (red meat, lentils, spinach) and anti-inflammatory foods (omega-3, berries, ginger). Avoid excess sodium to reduce bloating.",
    phaseMenstruationWorkout: "Gentle movement is ideal \u2014 yoga, walks, light cycling. Skip very heavy lifting if you feel fatigued.",
    phaseFollicularNutrition: "Rising oestrogen boosts insulin sensitivity. Slightly increase carbs to fuel higher-energy sessions.",
    phaseFollicularWorkout: "Great time to push intensity \u2014 strength training, intervals, and new exercises respond well.",
    phaseOvulationNutrition: "Peak performance window. Maintain protein and carbs. Zinc (pumpkin seeds, meat) supports hormonal balance.",
    phaseOvulationWorkout: "Peak strength and energy. Ideal for PRs, HIIT, and high-volume sessions. Warm up well \u2014 laxity increases near ovulation.",
    phaseLutealNutrition: "Cravings and hunger increase \u2014 prioritise magnesium (dark chocolate, nuts, seeds) and fibre to manage them. You need ~100\u2013300 kcal more.",
    phaseLutealWorkout: "Moderate your intensity as progesterone rises. Strength is maintained but recovery takes longer \u2014 prioritise sleep and rest days.",
  },
  workouts: {
    filterByMuscle: "Filter exercises by muscle group", exercise: "Exercise", recommended: "Recommended",
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
    cardio: "Cardio", mobility: "Mobility", fatLoss: "Fat Loss", general: "General",
    activityType: "Activity type",
    calorieCalcTitle: "Calorie Calculator",
    calcCalories: "Calculate calories burned from activity type →",
    stepsOptional: "Steps (optional — overrides duration)",
    stepsPlaceholder: "e.g. 8000",
    searchExercise: "Search exercise…",
    searchByNameMuscle: "Search by name or muscle…",
    anyMuscle: "Any muscle",
    noExercisesFound: "No exercises found",
    noResultsTry: "No results — try a different muscle or name",
    searching: "Searching…",
    suggestExercises: "Suggest exercises",
    exerciseNameReq: "Exercise Name *",
    primaryMuscleReq: "Primary Muscle *",
    describeExercise: "Describe how to perform this exercise…",
    instructionsOptional: "Instructions (optional)",
    equipment: "Equipment",
    createCustomExercise: "Create Custom Exercise",
    createExercise: "Create Exercise",
    workoutNamePlaceholder: "Workout name (e.g. Push Day, Leg Day…)",
    editWorkout: "Edit Workout",
    saveWorkout: "Save Workout",
    saveChanges: "Save Changes",
    logThisWorkout: "Log This Workout",
    loggedWorkout: "Logged workout",
    howDidItGo: "How did it go?",
    notesOptional: "Notes (optional)",
    notesLabel: "Notes",
    sets: "Sets",
    reps: "Reps",
    rpe: "RPE",
    rangeLabel: "Range:",
    markSetDone: "Mark set done and start rest timer",
    addToWorkout: "Add to Workout",
    noExercisesLogged: "No exercises logged",
    noPersonalTemplates: "No personal templates yet",
    noRecommendedTemplates: "No recommended templates yet",
    personalised: "Personalised for your goal",
    forkBtn: "Fork",
    smartSuggestions: "Smart Suggestions",
    forkHint: "Fork it to My Templates — then you can rename it and adjust exercises.",
    goalTemplatesFatLoss: "Your goal is weight loss — templates below are sorted by fat-loss focus.",
    goalTemplatesHypertrophy: "Your goal is muscle building — hypertrophy templates are highlighted first.",
    goalTemplatesStrength: "Your goal is strength — strength-focused programs are at the top.",
    goalTemplatesEndurance: "Your goal is endurance — cardio and full-body templates are prioritized.",
    scheduledWorkouts: "Scheduled {{count}} workouts this week!",
    selectAtLeastOneWeekday: "Select at least one weekday.",
    calendarFillSummary: "📆 Fills {{days}} day{{daysPlural}}/week × {{months}} month{{monthsPlural}} on the Calendar tab.",
    calendarEditableHint: "You can edit, move, or delete any individual day afterwards.",
    seedTemplates: "Seed Recommended Templates",
    seedDesc: "Seed the database with 24 research-based workout splits",
    fullEditor: "Full editor (notes, bulk apply)",
    selectBtn: "Select →",
    addToCalendar: "Add to Calendar",
    addToMonthlyCalendar: "Add to Monthly Calendar",
    buildMonthlyPlan: "Build Monthly Workout Plan",
    buildPlan: "Build Plan",
    applyTemplateCalendar: "Apply Template to Calendar",
    applyTemplateBtn: "Apply template",
    swapDays: "Swap days",
    swappingDays: "Swapping…",
    clearMonth: "Clear month",
    weeklySchedule: "Weekly Schedule",
    whichDays: "Which days of the week?",
    targetMuscleGroups: "Target muscle groups",
    trainingStyle: "Training style",
    trainingTypeOptional: "Training type (optional)",
    labelCalendar: "Label (shown on calendar)",
    linkTemplate: "Link to template (optional)",
    repeatWeekdays: "Repeat on weekdays",
    overwriteDays: "Overwrite days that already have a plan",
    replaceDays: "Replace days that already have a plan",
    howManyMonths: "How many months to fill?",
    howManyMonthsToFill: "How many months to fill?",
    thisMonth: "This month",
    nextMonth: "+ Next month",
    plusTwoMonths: "+ 2 months",
    prepTitle: "Warm-up & stretch",
    prepWarmup: "Warm-up",
    prepStretch: "Stretch & mobility",
    prepShortNote: "Short on time? Do the first 2 items.",
    prepUpper: "Upper-body prep",
    prepLower: "Lower-body prep",
    prepPush: "Push-day prep",
    prepPull: "Pull-day prep",
    prepFullBody: "Full-body prep",
    prepCardio: "Cardio prep",
    prepRecovery: "Recovery prep",
    prepNoteStrength: "Use a few lighter sets to prime the movement pattern before your working sets.",
    prepNoteHypertrophy: "Keep the prep snappy so you save energy for your working sets.",
    prepNoteEndurance: "Get your breathing and joints ready before the main effort.",
    prepNoteRecovery: "Stay gentle and focus on mobility, breathing, and smooth range of motion.",
    prepNoteGeneral: "Keep the warm-up simple, then move into the day’s work.",
    prepShoulderCircles: "Shoulder circles",
    prepBandPullAparts: "Band pull-aparts",
    prepScapPushUps: "Scapular push-ups",
    prepThoracicRotations: "Thoracic rotations",
    prepDoorwayChestStretch: "Doorway chest stretch",
    prepLatStretch: "Lat stretch",
    prepCrossBodyShoulderStretch: "Cross-body shoulder stretch",
    prepThoracicOpenBook: "Thoracic open-book stretch",
    prepAnkleCircles: "Ankle circles",
    prepHipHinges: "Hip hinges",
    prepBodyweightSquats: "Bodyweight squats",
    prepGluteBridges: "Glute bridges",
    prepCouchStretch: "Couch stretch",
    prepHamstringStretch: "Hamstring stretch",
    prepCalfStretch: "Calf stretch",
    prepFigureFourStretch: "Figure-four stretch",
    prepBandExternalRotations: "Band external rotations",
    prepInclinePushUps: "Incline push-ups",
    prepShoulderTaps: "Shoulder taps",
    prepWallSlides: "Wall slides",
    prepBandChestOpener: "Band chest opener",
    prepOverheadTricepsStretch: "Overhead triceps stretch",
    prepBandRows: "Band rows",
    prepScapRetractions: "Scapular retractions",
    prepDeadHang: "Dead hang",
    prepRearDeltStretch: "Rear delt stretch",
    prepBicepsWallStretch: "Biceps wall stretch",
    prepChildPoseReach: "Child’s pose reach",
    prepBriskWalk: "Brisk walk",
    prepMarching: "Marching in place",
    prepDynamicLunges: "Dynamic lunges",
    prepChestStretch: "Chest stretch",
    prepHipFlexorStretch: "Hip flexor stretch",
    prepAnkleRocks: "Ankle rocks",
    prepWorldsGreatestStretch: "World’s greatest stretch",
    prepCatCow: "Cat-cow",
    prepDeadBugBreathing: "Dead bug breathing",
    prepControlledBreathing: "Controlled breathing",
    prepPigeonStretch: "Pigeon stretch",
    prepBreathingReset: "Breathing reset",
    prepOpenBooks: "Open books",
    anyNotesDay: "Any notes for this day…",
    saveDayBtn: "Save this day",
    templateDay: "Template / Day",
    clickTrainingDays: "Click to change your training days per week",
    clickToggle: "Click to toggle workout/rest",
    wantsCustomise: "Want to customise this plan?",
    plannedWorkout: "Planned workout",
    weightsCardio: "Weights + Cardio Combos",
    aiBuilderTitle: "AI Workout Builder",
    pickTargets: "Pick your targets and let AI design your session",
    regenerate: "Regenerate",
    generateWorkout: "Generate Workout",
    generating: "Generating...",
    pickAtLeastOneMuscleGroup: "Pick at least one muscle group.",
    aiCouldNotGeneratePlan: "AI could not generate a plan. Try again or adjust your selections.",
    failedToSaveWorkout: "Failed to save workout.",
    templateFrequencyMismatch: "⚠️ You've selected {{selected}} day(s) but this template is designed for {{target}}x/week.",
    muscleChest: "Chest",
    muscleBack: "Back",
    muscleShoulders: "Shoulders",
    muscleBiceps: "Biceps",
    muscleTriceps: "Triceps",
    muscleUpperBody: "Upper Body",
    muscleLowerBody: "Lower Body",
    musclePush: "Push",
    musclePull: "Pull",
    muscleLegs: "Legs",
    muscleQuads: "Quads",
    muscleHamstrings: "Hamstrings",
    muscleCalves: "Calves",
    muscleGlutes: "Glutes",
    muscleTraps: "Traps",
    muscleForearms: "Forearms",
    muscleCore: "Core",
    muscleFullBody: "Full Body",
    muscleAdductors: "Adductors",
    muscleAbductors: "Abductors",
    nextBtn: "Next →",
    difficultyLabel: "Difficulty",
    dateLabel: "Date",
    durationLabel: "Duration",
    exerciseSuggest: "Exercise (💡 = suggest)",
    applyBtn: "Apply",
    closeBtn: "Close",
    cancelTimer: "Cancel timer",
    logged: "Logged",
    loading: "Loading…",
    todayLabel: "Today",
    doneBtn: "Done",
    viewBtn: "View",
  },
  progress: {
    title: "Progress", bodyWeight: "Body Weight", logWeight: "Log Weight",
    weightHistory: "Weight History", goalWeight: "Goal Weight",
    currentWeight: "Current Weight", startWeight: "Start Weight",
    projection: "Projection", bodyFat: "Body Fat %", analytics: "Analytics",
    noWeightData: "No weight data yet",
    bodyTab: "Body & Weight",
    strengthTab: "Strength",
    analyticsTab: "Analytics",
    predictionsTab: "Predictions",
    planTab: "Plan",
    subtitle: "Body composition, weight trend, strength, and calorie goals",
    currentStat: "Current",
    startingStat: "Starting",
    changeStat: "Change",
    lowestStat: "Lowest",
    highestStat: "Highest",
    lastDays: "Last {{days}} days",
    noWeightDataHelp: "Tap \"+ Log Weight\" to add your first entry. Your trend chart will appear once you have data.",
    estimatedFatPct: "Est. Fat%",
    invalidWeight: "Enter a valid weight (20–500 kg)",
    failedLogWeight: "Failed to log weight",
    deleteWeightConfirm: "Delete this weight entry?",
    weightNotesPlaceholder: "Morning weight, after gym…",
    rangeDay: "day",
    rangeWeek: "week",
    rangeWeeks: "weeks",
    rangeMonth: "month",
    rangeMonths: "months",
    rangeYear: "year",
  },
  goals: {
    title: "Goals", activeGoal: "Active Goal", noGoal: "No active goal",
    createGoal: "Create Goal", editGoal: "Edit Goal", type: "Goal type",
    weightLoss: "Weight Loss", weightGain: "Weight Gain", maintenance: "Maintenance",
    targetWeight: "Target weight", targetDate: "Target date",
    dailyCalories: "Daily calories", weeklyChange: "Weekly change",
    progressToDate: "Progress to date", onTrack: "On track",
    behindSchedule: "Behind schedule", ahead: "Ahead of schedule",
    goalNameOptional: "Goal Name (optional)",
    currentWeightKg: "Current Weight (kg)",
    targetWeightKg: "Target Weight (kg)",
    proteinG: "Protein (g)",
    carbsG: "Carbs (g)",
    fatsG: "Fats (g)",
    pause: "Pause",
    reactivate: "Reactivate",
    customise: "Customise",
    targets: "Targets",
    goalNamePlaceholder: "e.g. Summer cut",
    createCalorieGoalDesc: "Create a calorie goal to get a personalised macro plan",
    calorieTargetsDesc: "Calorie targets & body composition plans",
    activeGoalFallback: "Active Goal",
    emptyCreateDesc: "Create a calorie goal to get a personalised macro plan",
    emptyProfileHint: "Make sure your profile has age, height, weight, sex and activity level filled in.",
    goalRealism: "Goal realism",
    requiredPace: "Required pace",
    currentPace: "Current pace",
    adaptiveEta: "Adaptive ETA",
    needsMoreData: "Needs more data",
    aggressiveDeadline: "This deadline looks aggressive based on the adaptive model.",
    aggressiveDeadlineSuggest: "Suggested postponed date",
    forecastSubtitle: "Ideal plan vs logged trend vs adaptive forecast",
    sparseForecastTitle: "Adaptive forecast needs more data",
    sparseForecastBody: "Keep logging weight, meals, and workouts to unlock the full adaptive forecast.",
    sparseForecastDaysLogged: "Days logged",
    sparseForecastStatus: "Forecast status",
    fallbackProjection: "Showing the simpler goal projection until enough adaptive data is available.",
    actualWeight: "Actual weight",
    idealPlan: "Ideal plan",
    adaptiveForecast: "Adaptive forecast",
    whatIfPreview: "What-if preview",
    caloriesEaten: "Calories eaten",
    workoutDaysPerWeek: "Workout days/wk",
    workoutMinutesPerWeek: "Workout min/wk",
    whatIfPreviewTitle: "What-if preview",
    whatIfPreviewSubtitle: "Adjust the plan variables and compare the orange preview line before applying anything.",
    updatingPreview: "Updating preview...",
    previewHint: "Change a variable to preview the forecast.",
    previewEta: "Preview ETA",
    applyPreview: "Apply preview",
    applyPreviewConfirm: "Apply this what-if plan to your active goal?",
    analyticsTitle: "Goal analytics",
    analyticsSubtitle: "Why the adaptive forecast is moving.",
    calorieAdherence: "Calorie adherence",
    macroAdherence: "Macro adherence",
    workoutAdherence: "Workout adherence",
    weightVelocity: "Weight velocity",
    trendConfidence: "Trend confidence",
    etaDrift: "ETA drift",
    plateauRisk: "Plateau risk",
    planStatus: "Plan status",
    elevated: "Elevated",
    normal: "Normal",
    forecastStatus: "Forecast status",
    fullAdaptiveForecast: "Full adaptive forecast",
    sparseFallback: "Sparse fallback",
    lastRefresh: "Last refresh",
    normalizedOverlayHint: "Nutrition and workout overlays are normalized to 0-100 so they can be compared without distorting the weight scale.",
    aggressivenessAggressive: "Aggressive",
    aggressivenessConservative: "Conservative",
    aggressivenessReasonable: "Reasonable",
    statusNeedsMoreData: "Needs more data",
    statusTooAggressive: "Too aggressive",
    statusBehind: "Behind",
    statusAhead: "Ahead",
    statusOnTrack: "On track",
    daysVsTarget: "days vs target",
    openPlanTab: "Open plan review",
    enableMacroCycling: "Enable Macro Cycling",
    macroCyclingHelp: "Eat more on training days (~+350 kcal) and less on rest days, keeping your weekly average the same. Great for performance and body composition.",
    macroCyclingBasedOn: "Based on your {{days}} training days/week.",
    macroCyclingSettingsHint: "Set training days/week in Settings for best accuracy.",
    calculating: "Calculating…",
    previewPlan: "Preview Plan",
    fillRequiredTargets: "Fill current weight, target weight and target date",
    recalcFailed: "Recalculation failed",
    failedSave: "Failed to save",
    recalculating: "Recalculating…",
    recalculateTargets: "Recalculate macros from these targets",
    dailyTargets: "Daily Targets",
    autoFilledOverride: "auto-filled — edit to override",
    editManually: "edit manually",
    kcalFromMacrosMismatch: "⚠️ doesn't match calorie target",
    kcalFromMacrosMatch: "✓",
  },
  profile: {
    title: "Profile", personalInfo: "Personal information", firstName: "First name",
    lastName: "Last name", email: "Email", age: "Age", height: "Height",
    heightCm: "Height (cm)", weightKg: "Weight (kg)", bodyFat: "Body fat %",
    activityLevel: "Activity level", fitnessGoal: "Fitness goal",
    injuries: "Injuries / limitations", trainingDays: "Training days per week",
    saveProfile: "Save Profile", profileSaved: "Profile saved!",
    language: "Language", changeLanguage: "Change language",
    darkMode: "Dark mode",
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
    improveEndurance: "Improve endurance", notifications: "Notifications",
  },
  settings: {
    savePreferences: "Save Preferences",
    saveInjuries: "Save Injuries",
    saveCycleSettings: "Save Cycle Settings",
    updatePassword: "Update Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPasswordField: "Confirm Password",
    selectActivityLevel: "Select activity level",
    selectFitnessLevel: "Select fitness level",
    selectSex: "Select sex",
    selectDays: "Select days",
    selectDuration: "Select duration",
    daysPerWeek: "Days per week",
    hoursPerSession: "Hours per session",
    fitnessLevel: "Fitness Level",
    proteinTarget: "Protein target",
    appliedToCalc: "Applied to all new calorie goal calculations",
    whyMatters: "Why this matters",
    usedByAI: "Used by the AI and calorie calculator",
    coachPrivacyTitle: "Coach privacy and consent",
    coachPrivacySubtitle: "Choose which parts of your profile and activity a coach can see.",
    coachPrivacyHelp: "These preferences are shown in your settings and used by coach/internal views to respect your sharing choices.",
    coachVisibilityWorkouts: "Workouts",
    coachVisibilityNutrition: "Nutrition",
    coachVisibilityWeight: "Weight",
    coachVisibilityGoals: "Goals",
    coachVisibilityMealPlans: "Meal plans",
    coachVisibilityCalendar: "Calendar",
    buildVersion: "App version",
    buildId: "Build ID",
    updateReadyTitle: "A new version is ready",
    updateReadyBody: "A newer app build is available. Current UI build: {{build}}",
    refreshApp: "Refresh app",
    showWaterWidget: "Show the water intake widget on the Nutrition page",
    switchDarkMode: "Switch the app to a dark colour scheme",
    controlsAppearance: "Controls appearance and tracking features",
    preferenceSaved: "Preferences saved",
    appearancePreset: "Appearance preset",
    appearancePresetHelp: "Choose a full app look. This controls palette, background texture, and light/dark mode.",
    appearanceOptionSystemClassic: "System classic",
    appearanceOptionLightClassic: "Light classic",
    appearanceOptionDarkCharcoal: "Dark grey",
    appearanceOptionBlackGold: "Black + Golden",
    appearanceOptionWhiteGreen: "White + Green",
    appearanceOptionMidnightCyan: "Midnight cyan",
    appearanceOptionSoftSand: "Soft sand",
    appearanceOptionEditorialRose: "Editorial rose",
    appearanceOptionIndustrialSlate: "Industrial slate",
    appearanceOptionPaperIvory: "Paper ivory",
    appearanceOptionAuroraInk: "Aurora ink",
    appearanceOptionSunriseAmber: "Sunrise amber",
    colorTheme: "Color theme",
    colorThemeHelp: "Pick a base accent palette for the app",
    themeOptionDefault: "Default",
    themeOptionBlackGold: "Black + Golden",
    themeOptionWhiteGreen: "White + Green",
    injuriesSaved: "Injuries saved!",
    injurySelectHelp: "Select any areas where you have pain, discomfort, or are recovering from injury:",
    activeLimitations: "Active limitations: {{count}} area(s)",
    injuryWarning: "Workout suggestions and exercise replacement options will avoid stressing these areas. Always consult a physiotherapist before returning to full training.",
    injuryLowerBack: "Lower Back",
    injuryUpperBack: "Upper Back / Neck",
    injuryKneeLeft: "Knee (Left)",
    injuryKneeRight: "Knee (Right)",
    injuryShoulderLeft: "Shoulder (Left)",
    injuryShoulderRight: "Shoulder (Right)",
    injuryHip: "Hip",
    injuryElbowLeft: "Elbow (Left)",
    injuryElbowRight: "Elbow (Right)",
    injuryWristLeft: "Wrist (Left)",
    injuryWristRight: "Wrist (Right)",
    injuryAnkleLeft: "Ankle (Left)",
    injuryAnkleRight: "Ankle (Right)",
    injuryRotatorCuff: "Rotator Cuff",
    injuryHamstring: "Hamstring",
    injuryItBand: "IT Band",
    injuryPlantarFascia: "Plantar Fascia",
    downloadDataDesc: "Download a complete copy of your fitness data",
    irreversibleActions: "Irreversible actions — proceed with caution",
    memberSince: "Member since",
    account: "Account",
    username: "Username",
    cycleLength: "Cycle length (days)",
    firstDayPeriod: "First day of last period",
    menstrualCycleTracking: "Menstrual Cycle Tracking",
    cyclePersonalises: "Personalises nutrition & workout tips to your hormonal phase",
    avgCycleLength: "Average is 28 days (range: 21–35)",
    commonRanges: "Common ranges",
    injuriesExercises: "Exercises and templates will avoid movements that stress affected areas",
    trainingSchedule: "Training Schedule",
    goToPlan: "Go to plan →",
    goalDescription: "Set a goal in the Goals tab, or describe it here",
    equipment: "Equipment", difficulty: "Difficulty", instructions: "Instructions",
    searchFood: "Search food", passwordHint: "At least 8 characters", activityLevel: "Activity Level",
  },
  auth: {
    login: "Log in", register: "Register", logout: "Log out", email: "Email",
    password: "Password", confirmPassword: "Confirm password",
    forgotPassword: "Forgot password?", resetPassword: "Reset password",
    noAccount: "Don't have an account?", haveAccount: "Already have an account?",
    signUp: "Sign up", signIn: "Sign in", verifyEmail: "Verify your email",
    createAccount: "Create your account", createAccountDesc: "Start your fitness journey today",
    welcomeBack: "Welcome back", signInDesc: "Sign in to your FitAI Coach account",
    firstName: "First name", lastName: "Last name", username: "Username", rememberMe: "Remember me (30 days)",
    passwordRequirements: "At least 8 characters",
    serverUnavailable: "Cannot reach the server. Make sure the backend is running on port 3000.",
    invalidCredentials: "Incorrect email or password.",
    tooManyAttempts: "Too many attempts. Please wait a moment and try again.",
    sessionExpired: "Your session has expired. Please sign in again.",
    emailRequired: "Email is required",
    validEmail: "Enter a valid email address",
    usernameRequired: "Username is required",
    usernameLength: "At least 3 characters",
    usernameChars: "Letters, numbers, and underscores only",
    passwordRequired: "Password is required",
    passwordMinLength: "Password must be at least 8 characters",
    confirmPasswordRequired: "Please confirm your password",
    passwordsDoNotMatch: "Passwords do not match",
  },
  offline: {
    noConnection: "No internet connection",
    readOnlyMode: "You're offline — changes won't be saved until you reconnect",
    offline: "Offline",
    backOnline: "Back online — all systems go!",
  },
  chat: {
    title: "AI Coach", newChat: "New chat", clearHistory: "Clear history",
    thinking: "Thinking…", placeholder: "Ask anything…", send: "Send",
    noConversations: "No conversations yet",
    workoutCoach: "Workout Coach", nutritionist: "Nutritionist", generalCoach: "General Coach",
    coachDesc: "Workout plans, recovery, technique tips",
    nutritionistDesc: "Meal plans, macros, food advice",
    generalDesc: "General fitness & health questions",
    logWorkout: "Log workout", logMeal: "Log meal", suggestWorkout: "Suggest a workout",
    saving: "Saving…", notNow: "Not now",
    savedCheck: "Saved! Check {{title}}.",
    meAvatar: "Me",
    workoutsTitle: "Your Workouts",
    workoutReplaceQ: "Want to replace this saved workout template?",
    workoutSaveQ: "Want to save this workout plan to your templates?",
    workoutUpdateBtn: "Yes, update Workout",
    workoutAddBtn: "Yes, add to Workouts",
    mealPlannerTitle: "Meal Planner",
    mealReplaceQ: "Want to replace this Meal Planner plan?",
    mealAppendQ: "Want to add these meals to your Meal Planner?",
    mealSaveQ: "Want to add this plan to your Meal Planner?",
    mealUpdateBtn: "Yes, update Meal Plan",
    mealSaveBtn: "Yes, add to Meal Planner",
    goalsTitle: "Goals",
    goalSaveQ: "Want to save this calorie & macro plan to your goals?",
    goalSaveBtn: "Yes, save as Goal",
    scheduleWorkoutTitle: "Schedule this workout",
    scheduleWorkoutBody: "Your template is saved. Choose which weekdays to place it on and how many months to fill.",
    scheduleWorkoutDays: "Weekdays",
    scheduleWorkoutMonths: "How many months?",
    scheduleWorkoutOverwrite: "Overwrite planned days if something is already there",
    scheduleWorkoutConfirm: "Save to calendar",
    mealDurationTitle: "Choose meal-plan length",
    mealDurationBody: "Pick how long this plan should run before saving it to Meal Planner.",
    mealDurationConfirm: "Save meal plan",
    monthCount: "{{count}} month",
    weekCount: "{{count}} week",
    toastWorkoutScheduled: "✅ Workout added to your calendar.",
    today: "Today", yesterday: "Yesterday", daysAgo: "{{n}} days ago",
    errorMsg: "Sorry, I couldn't respond right now. Please try again.",
    clearConfirm: "Clear {{agent}} conversation history?",
    recentChats: "Recent chats", noHistory: "No history yet",
    switchToAgent: "Switch to {{agent}}?",
    switchBody: "Your current conversation is saved. You can switch back anytime.",
    stayHere: "Stay here", switchBtn: "Switch",
    inputPlaceholder: "Ask {{agent}}…  (Shift+Enter for new line)",
    starterCoach1: "Create a 4-day Upper/Lower split for me",
    starterCoach2: "What's the best routine for building a bigger back?",
    starterCoach3: "How should I structure progressive overload?",
    starterCoach4: "Give me a Push Day workout I can save",
    starterNutri1: "What should I eat to build muscle while staying lean?",
    starterNutri2: "Create a high-protein meal plan for 2500 calories",
    starterNutri3: "How much protein do I really need per day?",
    starterNutri4: "Give me a calorie plan to lose 1kg per week",
    starterGeneral1: "How many rest days should I take per week?",
    starterGeneral2: "What's the best way to track my progress?",
    starterGeneral3: "How do I avoid a training plateau?",
    starterGeneral4: "Explain the difference between cutting and bulking",
    toastWorkoutUpdated: "✅ Template updated! Check Workouts.",
    toastWorkoutSaved: "✅ Template saved! Check Workouts.",
    toastMealUpdated: "✅ Meal plan updated! Check Meal Planner.",
    toastMealSaved: "✅ Meal plan added! Check Meal Planner.",
    toastGoalSaved: "✅ Calorie goal saved! Check your Goals page.",
  },
  reports: {
    title: "Reports", monthly: "Monthly Report", noReports: "No reports yet",
    generating: "Generating…", weightDelta: "Weight change",
    workoutsLogged: "Workouts logged", avgCalories: "Avg. calories / day",
    aiSummary: "AI summary available", generateSummary: "Generate AI Summary",
    topFoods: "Top foods", consistency: "Consistency", highlights: "Highlights",
    back: "← Back to reports",
    startOfMonth: "Start of month", endOfMonth: "End of month", month: "Month", year: "Year", pastReports: "Past Reports", subtitle: "AI-powered summaries of your fitness progress",
  },
  mealPlanner: {
    title: "Meal Planner", thisWeek: "This week", addFood: "Add food",
    clearDay: "Clear day", noMeals: "No meals planned",
    breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack",
    snack1: "Snack 1", snack2: "Snack 2", snack3: "Snack 3", preWorkout: "Pre Workout", other: "Other",
    searchFood: "Search food…", servings: "Servings", logAll: "Log all to diary",
    logDay: "Log day to diary", calories: "calories", planSaved: "Plan saved!",
    savePlan: "Save plan", copyFromLast: "Copy from last week",
    aiGenerate: "AI Generate",
    myPlans: "My Plans", newPlan: "+ New Plan", noPlans: "No meal plans yet",
    noPlansDesc: "Create a weekly, monthly, or multi-month meal plan or ask the AI Coach to generate one for you.",
    createFirst: "+ Create first plan", createPlan: "Create Meal Plan",
    planName: "Plan name", weekStarting: "Start date (Monday)", planLength: "Plan length",
    createFailed: "Failed to create plan", planNamePlaceholder: "e.g. Cut Week 1",
    weekOf: "Week of", selectPlan: "Select a plan or create a new one",
    subtitle: "Plan your meals week by week or month by month — build a template, track macros, stay on goal.",
    addToMeal: "Add to {{meal}}", avgKcalDay: "avg kcal/day", avgProtein: "avg protein",
    noFoods: "No foods yet", quantity: "Quantity", unit: "Unit",
    deletePlan: "Delete this plan?", defaultPlanName: "My Meal Plan",
    searchPlaceholder: "e.g. chicken breast, oats…",
    monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday",
    friday: "Friday", saturday: "Saturday", sunday: "Sunday",
  },
  templates: {
    title: "Templates", useTemplate: "Use template", noTemplates: "No templates yet",
    createTemplate: "Create template", myTemplates: "My Templates",
    community: "Community", difficulty: "Difficulty",
    beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
    duration: "Duration", exercises: "Exercises", startWorkout: "Start Workout",
    preview: "Preview",
    recommended: "Recommended", preBuiltSplits: "Pre-built and custom workout splits",
    recommendedTemplatesEmpty: "No recommended templates yet", seedRecommendedTemplates: "Seed Recommended Templates",
    seedRecommendedDesc: "Seed the database with 24 research-based workout splits",
    personalTemplatesEmpty: "No personal templates yet",
    saveWorkoutAsTemplateHint: "Save a logged workout as a template, or ask the AI Coach to generate one.",
    askAiCoach: "Ask AI Coach", deleteTemplateConfirm: "Delete this template?",
    templateDeleted: "Template deleted.", templateRenamed: "Template renamed.", templateAdded: "Template added to My Templates.",
    splitPpl: "Push / Pull / Legs", splitUpperLower: "Upper / Lower", splitBroSplit: "Bro Split", splitFullBody: "Full Body", splitCustom: "Custom",
    splitFullBody3d: "Full Body (3×/week)", splitPpl6d: "Push Pull Legs (6×/week)", splitUpperLower4d: "Upper / Lower (4×/week)",
    splitBroSplit5d: "Bro Split (5×/week)", splitFatLoss4d: "Fat Loss (4×/week)",
    showingPlansForDays: "Showing plans for {{days}}×/week — matching your profile setting.",
    matchingProfileSetting: "matching your profile setting.",
    viewTemplate: "View template",
    failedToStartWorkout: "Failed to start workout",
    weekShort: "week",
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
  coach: {
    title: "Coach Mode",
    subtitle: "Manage your clients, publish plans, and review their current progress.",
    open: "Open",
    inviteClient: "Invite a client",
    inviteClientBody: "Create a coach invite code that a client can accept from their dashboard.",
    createInviteCode: "Create invite code",
    activeCode: "Active code",
    assignedClients: "Assigned clients",
    loadingClients: "Loading clients...",
    noClients: "No active clients yet. Share an invite code to connect someone.",
    totalClients: "Total clients",
    clientOverviewTitle: "Full client workspace",
    clientOverviewBody: "Full client workspace, current stats, and coach publishing tools.",
    backToClients: "Back to clients",
    currentGoal: "Current goal",
    recentCalories: "Recent calories",
    recentProtein: "Recent protein",
    pendingProposals: "Pending proposals",
    clientActivity: "Client activity",
    recentWorkouts: "Recent workouts",
    noLoggedWorkouts: "No logged workouts yet.",
    activeCalorieGoal: "Active calorie goal",
    noActiveCalorieGoal: "No active calorie goal.",
    currentMealPlans: "Current meal plans",
    noMealPlans: "No meal plans yet.",
    adherenceWidgets: "Adherence widgets",
    weeklyCheckIns: "Weekly check-ins",
    noWeeklyCheckIns: "No weekly check-ins yet.",
    calorieWidget: "Calories",
    proteinWidget: "Protein",
    workoutWidget: "Workouts",
    weightWidget: "Weight",
    checkInSummary: "Latest check-in summary",
    fatigue: "Fatigue",
    soreness: "Soreness",
    hunger: "Hunger",
    sleepQuality: "Sleep",
    performance: "Performance",
    needsAttentionToday: "Needs attention today",
    attentionClients: "Clients needing attention",
    attentionClientsSub: "Open a client workspace to review the exact follow-up reasons.",
    notifications: "Notifications",
    notificationsSub: "Recent coach events and client follow-ups.",
    noNotifications: "No recent coach notifications.",
    reusableLibraries: "Reusable libraries",
    reusableLibrariesSub: "Favorite templates and meal plans you can reuse quickly.",
    workoutLibraries: "Workout libraries",
    mealLibraries: "Meal libraries",
    overdueCheckIns: "Overdue check-ins",
    swapWorkout: "Use workout",
    swapMeal: "Use meal",
    addCoachNote: "Add coach note",
    coachNote: "Coach note",
    notePlaceholder: "Add a note for this check-in...",
    saveNote: "Save note",
    noWorkoutLibraries: "No saved workout libraries yet.",
    noMealLibraries: "No saved meal libraries yet.",
    newProposalNotification: "New coach proposal received",
    newProposalsNotification: "{{count}} new coach proposals received",
    proposalUpdatedNotification: "Coach proposal updated",
    proposalAcceptedNotification: "Coach proposal accepted",
    proposalRejectedNotification: "Coach proposal rejected",
    proposalCommentSaved: "Proposal comment saved",
    verifiedCoach: "Verified Coach",
    clientSnapshot: "Client snapshot",
    clientSnapshotBody: "A quick dossier of goals, recent trends, and what the client has chosen to share with their coach.",
    trainingFrequency: "Training frequency",
    trainingDaysSummary: "{{count}} training days / week",
    noTrainingFrequency: "No training frequency set yet.",
    visibilityConsent: "Visibility and consent",
    visibilityVisibleToCoach: "Visible to coach",
    visibilityPrivate: "Private",
    visibilityPendingReview: "Pending review",
    noVisibilityData: "No visibility settings available yet.",
    thisWeek: "This week",
    plansAndProposals: "Plans and proposals",
    coachTools: "Coach tools",
    latestTrendSummary: "Latest trend summary",
    loggedAtLabel: "Last updated",
    needsFollowUp: "Needs follow-up",
    planStatusLabel: "Plan status",
    quickActionsLabel: "Quick actions",
    createZone: "Create and reuse",
    reusePlan: "Reuse plan",
    reviewZone: "Review history and comments",
    statusPending: "Pending",
    statusAccepted: "Accepted",
    statusRejected: "Rejected",
    statusNeedsAttention: "Needs attention",
    statusOverdue: "Overdue",
    ownershipCoachPlan: "Coach plan",
    ownershipYourPlan: "Your plan",
    ownershipAiSuggestion: "AI suggestion",
    todayPriorities: "Today's priorities",
    recentCoachActivity: "Recent coach activity",
    libraryTools: "Library / tools",
    reusablePlans: "Reusable plans",
    topConcern: "Top concern",
    latestCheckIn: "Latest check-in",
    clientsWaitingReview: "clients needing review",
    publishDrafts: "Publish coach drafts",
    workoutTemplate: "Workout template",
    selectTemplate: "Select template",
    overwrite: "Overwrite",
    sendWorkoutDraft: "Send workout draft",
    mealPlan: "Meal plan",
    selectMealPlan: "Select meal plan",
    sendMealDraft: "Send meal-plan draft",
    goalMacros: "Goal / macros",
    selectCalorieGoal: "Select calorie goal",
    fallbackGoalName: "{{type}} goal",
    sendGoalDraft: "Send goal draft",
    proposalHistory: "Proposal history",
    noCoachProposals: "No coach proposals yet.",
    proposalDiff: "What changes",
    proposalComments: "Comments",
    noProposalComments: "No comments yet.",
    addComment: "Add comment",
    commentPlaceholder: "Write a note or question...",
    sendComment: "Send comment",
    coachUpdates: "Coach updates",
    coachUpdatesTitle: "Review coach changes before you accept them",
    coachUpdatesBody: "Coach proposals are shown here first so you can review what changed, ask a question, and decide what to apply.",
    coachProposalLabel: "Coach proposal",
    pendingYourApproval: "Pending your approval",
    whyThisChanged: "Why this changed",
    reviewDetails: "Review details",
    hideDetails: "Hide details",
    coachUpdatesInlineHint: "Coach updates are highlighted above so the rest of the dashboard stays easier to scan.",
    workoutProposal: "Workout proposal",
    mealProposal: "Meal proposal",
    goalProposal: "Goal proposal",
    fromCoach: "From {{name}}",
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
    joinCoach: "Join a coach",
    joinCoachBody: "Paste the invite code your coach shared with you.",
    coachConnectSectionTitle: "Enter your coach code",
    coachConnectSectionBody: "Use the code your coach sent you to connect your account and start receiving plans, updates, and feedback.",
    coachConnectSectionHelp: "Ask your coach for the invite code if you do not have it yet.",
    coachConnectMovedHint: "The coach code entry now lives at the end of the dashboard so it is easier to find.",
    haveCoachCode: "Have a coach code?",
    haveCoachCodeHelp: "Jump straight to the coach connect section.",
    connectBannerTitle: "Connect with your coach",
    connectBannerBody: "Add your coach code to unlock shared plans, feedback, and coach updates.",
    connectCardTitle: "Got a coach code? Link your account in one step.",
    connectCardBody: "Use the code your coach sent you to start receiving training plans, meal plans, and review notes inside your dashboard.",
    coachConnectedTitle: "Coach connected",
    coachConnectedBody: "Your account is now linked. Coach updates and pending proposals will appear in your dashboard and notifications.",
    coachConnectedBadge: "Connected to coach",
    coachConnectedBanner: "Coach connected. Your coach updates are ready to review above.",
    reviewCoachUpdates: "Review coach updates",
    inviteCodePlaceholder: "AB12CD34",
    connect: "Connect",
    createCoachInvite: "Create coach invite",
    createCoachInviteBody: "Generate a client code valid for 7 days.",
    generate: "Generate",
    inviteCode: "Invite code",
    coachLinkActivated: "Coach link activated.",
    failedAcceptInvite: "Failed to accept invite.",
    loadingProposals: "Loading proposals...",
    noPendingProposals: "No pending coach proposals right now.",
    accept: "Accept",
    reject: "Reject",
    oneMonth: "1 month",
    twoMonths: "2 months",
    threeMonths: "3 months",
    quickSchedule: "Quick schedule",
    advancedPerDay: "Advanced per-day",
    startDate: "Start date",
    duration: "Duration",
    weeks: "weeks",
    months: "months",
    restDay: "Rest day",
    workoutNamePlaceholder: "Workout name",
    muscleGroupsPlaceholder: "Muscle groups, comma-separated",
    notesPlaceholder: "Notes",
    existingPlan: "Existing plan",
    createFromScratch: "Create from scratch",
    scratchMealDefaultName: "Coach meal plan",
    mealLineFormat: "One food per line: food | kcal | protein | carbs | fats | quantity | unit",
    searchMealBuilderHint: "Search foods in any language, add them to each meal, then adjust quantities or macros as needed.",
    addFoodToMeal: "Add food to meal",
    emptyMealHint: "No foods yet. Search below to add one.",
    dayTotal: "Day total",
    computedDuration: "Planner duration: {{count}} weeks",
    oneWeek: "1 week",
    fourWeeks: "4 weeks",
    eightWeeks: "8 weeks",
    twelveWeeks: "12 weeks",
    weekCount: "{{count}} week(s)",
  },
  notifications: {
    title: "Notifications",
    subtitleCoach: "Recent coach events, client follow-ups, and proposal activity.",
    subtitleUser: "Your recent coach updates, proposals, and saved actions.",
    center: "Notification Center",
    centerSub: "One place for timeline items, attention signals, and proposal updates.",
    modeCoach: "Coach inbox",
    modeUser: "User inbox",
    unread: "unread",
    noNotifications: "No notifications yet.",
    markAllRead: "Mark all read",
    markRead: "Mark read",
    sectionUnread: "Unread",
    sectionToday: "Today",
    sectionEarlier: "Earlier",
    proposalTimeline: "Proposal timeline",
    coachFeed: "Coach feed",
    userFeed: "User feed",
    openCoach: "Open coach mode",
    openDashboard: "Open dashboard",
    viewDetails: "View details",
    attentionQueue: "Clients needing attention",
    attentionQueueSub: "Reason-based client cards pulled from the shared coach feed.",
    searchPlaceholder: "Search notifications, clients, or reasons...",
    proposalWaiting: "Proposal waiting for review.",
    emptyCoachTitle: "No coach activity yet",
    emptyCoachBody: "New proposal updates, check-ins, invites, and follow-ups will show up here.",
    emptyUserTitle: "All caught up",
    emptyUserBody: "You have no pending coach proposals or fresh review items right now.",
    emptyFilteredTitle: "Nothing matched this search",
    emptyFilteredBody: "Try another keyword or clear the search to see the full inbox again.",
    emptyAttentionTitle: "No clients need attention right now",
    emptyAttentionBody: "The shared attention queue will show overdue check-ins, pending approvals, and other follow-up reasons here.",
  },
  admin: {
    title: "Admin / Dev Mode",
    subtitle: "Internal operations, role assignment, relationships, and global diagnostics.",
    userLookup: "User lookup and role assignment",
    searchPlaceholder: "Search username, email, first or last name",
    search: "Search",
    coachRelationships: "Coach relationships",
    noRelationships: "No coach/client relationships yet.",
    coachToClient: "Coach: {{coach}} -> Client: {{client}}",
    roleUser: "user",
    roleCoach: "coach",
    roleAdmin: "admin",
    roleDeveloper: "developer",
    openWorkspace: "Open workspace",
    backToInternal: "← Back to internal overview",
    workspaceTitle: "{{user}} workspace",
    joinedOn: "Joined",
    profileAndRole: "Profile and role",
    roleLabel: "Role",
    trainingDaysLabel: "Training days per week",
    permissionFlagsLabel: "Permission flags",
    statsOverview: "Stats overview",
    activeGoalLabel: "Active goal",
    goalTypeLabel: "Goal type",
    dailyCaloriesLabel: "Daily calories",
    targetWeightLabel: "Target weight",
    targetDateLabel: "Target date",
    noActiveGoal: "No active calorie goal.",
    recentNutrition: "Recent nutrition",
    noRecentNutrition: "No recent nutrition logs in the current window.",
    recentWorkouts: "Recent workouts",
    noRecentWorkouts: "No workouts logged yet.",
    recentWeight: "Recent weight",
    noRecentWeight: "No weight logs yet.",
    recentMealPlans: "Recent meal plans",
    noMealPlans: "No meal plans yet.",
    calendarPreview: "Calendar preview",
    calendarPreviewSubtitle: "Scheduled days through {{end}}",
    noCalendarDays: "No scheduled calendar days in the current window.",
    relationshipsForUser: "Relationships for this user",
    noRelationshipsForUser: "No coach/client relationships for this user.",
    pendingProposals: "Pending coach proposals",
    noPendingProposals: "No pending coach proposals.",
    exerciseCountLabel: "exercises",
    restDayLabel: "Rest day",
    totalUsers: "Users",
    totalCoaches: "Coaches",
    totalInternalUsers: "Internal users",
    totalPendingProposals: "Pending proposals",
    systemTotals: "System totals",
    recentUsageSignals: "Recent usage signals",
    recentUsageSignalsSub: "Rolling activity indicators for the last 7 to 30 days.",
    metricSignups7d: "Signups (7d)",
    metricWorkouts7d: "Workouts (7d)",
    metricFoodLogs7d: "Food logs (7d)",
    metricWeights7d: "Weight logs (7d)",
    metricChats7d: "Chat messages (7d)",
    metricActiveGoals: "Active goals",
    metricCalendarDays30d: "Calendar days (30d)",
    metricPendingCoachLinks: "Pending coach links",
    recentAuditLogs: "Recent audit logs",
    recentAuditLogsSub: "Latest privileged actions and internal activity.",
    noAuditLogs: "No audit logs yet.",
    readOnlyView: "Read-only view",
    readOnlyBannerTitle: "Read-only view as user",
    readOnlyBannerBody: "This internal mode is intentionally read-only. Use it to inspect the user experience safely without mutating their data.",
    impersonationBanner: "{{actor}} is currently impersonating {{user}}.",
    endImpersonation: "End impersonation",
    startImpersonation: "Impersonate",
    coachPrivacyTitle: "Coach privacy visibility",
    coachPrivacySubtitle: "See which parts of the client profile are currently shared.",
    coachTestTitle: "Coach test access",
    coachTestSub: "Open the selected client in coach mode from this internal workspace.",
    coachTestBody: "Use this to validate coach-only flows against a specific client without leaving the internal surface.",
    actAsCoachForClient: "Act as coach for this client",
    visibleToCoach: "Visible to coach",
    hiddenFromCoach: "Hidden from coach",
    featureFlags: "Feature flags",
    featureFlagsSub: "Internal rollout switches and controlled behavior toggles.",
    noFeatureFlags: "No feature flags configured yet.",
    enabled: "Enabled",
    disabled: "Disabled",
    contentOps: "Content ops",
    contentOpsSub: "Read-only content inventory and seeded catalog overview.",
    repairTools: "Repair tools",
    repairToolsSub: "Safe internal repair actions with audit logging.",
    repairUserIdLabel: "Target user ID",
    repairUserIdPlaceholder: "Enter user ID",
    repairSyncWeight: "Sync profile weight from latest log",
    repairCleanupInvites: "Cleanup expired coach invites",
  },
};

export default en;
// Keep TranslationKeys as alias for Translation so i18n/index.tsx compiles
export type { Translation as TranslationKeys };
