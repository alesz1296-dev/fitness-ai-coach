/**
 * Built-in exercise library — 120+ common gym exercises.
 * Plug in RapidAPI ExerciseDB key (EXERCISEDB_API_KEY) to override with live data.
 */

export interface ExerciseItem {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  instructions: string;
}

export const EXERCISE_DB: ExerciseItem[] = [
  // ── Chest ─────────────────────────────────────────────────────────────────
  { id: "e001", name: "Bench Press",              primaryMuscle: "Chest",    secondaryMuscles: ["Triceps","Front Delts"], equipment: "Barbell",    difficulty: "intermediate", instructions: "Lie flat, grip barbell slightly wider than shoulder width, lower to chest and press up." },
  { id: "e002", name: "Incline Bench Press",      primaryMuscle: "Chest",    secondaryMuscles: ["Triceps","Front Delts"], equipment: "Barbell",    difficulty: "intermediate", instructions: "Set bench to 30–45°. Press barbell from upper chest to full extension." },
  { id: "e003", name: "Decline Bench Press",      primaryMuscle: "Chest",    secondaryMuscles: ["Triceps"],              equipment: "Barbell",    difficulty: "intermediate", instructions: "Set bench to -15°. Targets lower chest." },
  { id: "e004", name: "Dumbbell Chest Press",     primaryMuscle: "Chest",    secondaryMuscles: ["Triceps","Front Delts"], equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Lie flat, press dumbbells from chest level to full arm extension." },
  { id: "e005", name: "Incline Dumbbell Press",   primaryMuscle: "Chest",    secondaryMuscles: ["Front Delts"],          equipment: "Dumbbell",   difficulty: "intermediate", instructions: "Incline bench 30–45°, press dumbbells targeting upper chest." },
  { id: "e006", name: "Dumbbell Fly",             primaryMuscle: "Chest",    secondaryMuscles: [],                       equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Lie flat, arms wide, bring dumbbells together over chest in arc motion." },
  { id: "e007", name: "Cable Fly",                primaryMuscle: "Chest",    secondaryMuscles: [],                       equipment: "Cable",      difficulty: "beginner",     instructions: "Stand between cable towers, cross cables at chest height." },
  { id: "e008", name: "Push-Up",                  primaryMuscle: "Chest",    secondaryMuscles: ["Triceps","Core"],       equipment: "Bodyweight", difficulty: "beginner",     instructions: "Plank position, lower chest to floor, press back up." },
  { id: "e009", name: "Dips",                     primaryMuscle: "Chest",    secondaryMuscles: ["Triceps"],              equipment: "Bodyweight", difficulty: "intermediate", instructions: "Lean forward on parallel bars, lower until upper arms are parallel to floor." },
  { id: "e010", name: "Pec Deck Machine",         primaryMuscle: "Chest",    secondaryMuscles: [],                       equipment: "Machine",    difficulty: "beginner",     instructions: "Sit upright, bring handles together in front of chest." },

  // ── Back ──────────────────────────────────────────────────────────────────
  { id: "e020", name: "Barbell Row",              primaryMuscle: "Back",     secondaryMuscles: ["Biceps","Rear Delts"],  equipment: "Barbell",    difficulty: "intermediate", instructions: "Hinge at hips, pull barbell to lower chest, keep back flat." },
  { id: "e021", name: "Dumbbell Row",             primaryMuscle: "Back",     secondaryMuscles: ["Biceps"],               equipment: "Dumbbell",   difficulty: "beginner",     instructions: "One arm on bench, pull dumbbell to hip, elbow close to body." },
  { id: "e022", name: "Pull-Up",                  primaryMuscle: "Back",     secondaryMuscles: ["Biceps"],               equipment: "Bodyweight", difficulty: "intermediate", instructions: "Dead hang, pull chin over bar using lats. Pronated grip." },
  { id: "e023", name: "Chin-Up",                  primaryMuscle: "Back",     secondaryMuscles: ["Biceps"],               equipment: "Bodyweight", difficulty: "intermediate", instructions: "Dead hang, supinated grip (palms toward you), pull chin over bar." },
  { id: "e024", name: "Lat Pulldown",             primaryMuscle: "Back",     secondaryMuscles: ["Biceps"],               equipment: "Cable",      difficulty: "beginner",     instructions: "Pull bar to upper chest, elbows drive down to lats." },
  { id: "e025", name: "Seated Cable Row",         primaryMuscle: "Back",     secondaryMuscles: ["Biceps","Rear Delts"],  equipment: "Cable",      difficulty: "beginner",     instructions: "Sit upright, pull handle to abdomen, squeeze shoulder blades." },
  { id: "e026", name: "T-Bar Row",                primaryMuscle: "Back",     secondaryMuscles: ["Biceps"],               equipment: "Barbell",    difficulty: "intermediate", instructions: "Straddle bar, pull to chest, keep back flat." },
  { id: "e027", name: "Deadlift",                 primaryMuscle: "Back",     secondaryMuscles: ["Glutes","Hamstrings","Traps"], equipment: "Barbell", difficulty: "advanced", instructions: "Hinge at hips, bar over mid-foot, pull to full hip extension." },
  { id: "e028", name: "Romanian Deadlift",        primaryMuscle: "Back",     secondaryMuscles: ["Hamstrings","Glutes"],  equipment: "Barbell",    difficulty: "intermediate", instructions: "Soft knee bend, hinge hips back, lower bar along legs." },
  { id: "e029", name: "Cable Pullover",           primaryMuscle: "Back",     secondaryMuscles: ["Chest"],                equipment: "Cable",      difficulty: "beginner",     instructions: "Facing away from cable, pull straight bar over head to hips." },
  { id: "e030", name: "Hyperextension",           primaryMuscle: "Back",     secondaryMuscles: ["Glutes","Hamstrings"],  equipment: "Machine",    difficulty: "beginner",     instructions: "Face-down on hyperextension bench, raise torso to neutral spine." },

  // ── Shoulders ─────────────────────────────────────────────────────────────
  { id: "e040", name: "Overhead Press",           primaryMuscle: "Shoulders",secondaryMuscles: ["Triceps","Traps"],      equipment: "Barbell",    difficulty: "intermediate", instructions: "Press barbell from upper chest to overhead lockout." },
  { id: "e041", name: "Dumbbell Shoulder Press",  primaryMuscle: "Shoulders",secondaryMuscles: ["Triceps"],              equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Seated or standing, press dumbbells from shoulder height overhead." },
  { id: "e042", name: "Lateral Raise",            primaryMuscle: "Shoulders",secondaryMuscles: [],                       equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Slight bend in elbows, raise arms to shoulder height." },
  { id: "e043", name: "Front Raise",              primaryMuscle: "Shoulders",secondaryMuscles: [],                       equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Arms straight, raise to eye level alternating or together." },
  { id: "e044", name: "Rear Delt Fly",            primaryMuscle: "Shoulders",secondaryMuscles: ["Traps"],                equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Hinge forward, raise dumbbells out to sides squeezing rear delts." },
  { id: "e045", name: "Face Pull",                primaryMuscle: "Shoulders",secondaryMuscles: ["Traps","Rear Delts"],   equipment: "Cable",      difficulty: "beginner",     instructions: "Rope at face height, pull to face, elbows flared." },
  { id: "e046", name: "Arnold Press",             primaryMuscle: "Shoulders",secondaryMuscles: ["Triceps"],              equipment: "Dumbbell",   difficulty: "intermediate", instructions: "Start palms facing you, rotate and press overhead." },
  { id: "e047", name: "Upright Row",              primaryMuscle: "Shoulders",secondaryMuscles: ["Traps","Biceps"],       equipment: "Barbell",    difficulty: "intermediate", instructions: "Pull bar up to chin level, elbows lead." },
  { id: "e048", name: "Cable Lateral Raise",      primaryMuscle: "Shoulders",secondaryMuscles: [],                       equipment: "Cable",      difficulty: "beginner",     instructions: "Side-on to cable, raise arm to shoulder height with constant tension." },

  // ── Biceps ────────────────────────────────────────────────────────────────
  { id: "e050", name: "Barbell Curl",             primaryMuscle: "Biceps",   secondaryMuscles: ["Forearms"],             equipment: "Barbell",    difficulty: "beginner",     instructions: "Supinated grip, curl bar to shoulder height, control descent." },
  { id: "e051", name: "Dumbbell Curl",            primaryMuscle: "Biceps",   secondaryMuscles: ["Forearms"],             equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Alternate or simultaneous curl, supinate at top." },
  { id: "e052", name: "Hammer Curl",              primaryMuscle: "Biceps",   secondaryMuscles: ["Brachialis","Forearms"],equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Neutral grip (palms facing each other), curl to shoulder." },
  { id: "e053", name: "Incline Dumbbell Curl",    primaryMuscle: "Biceps",   secondaryMuscles: [],                       equipment: "Dumbbell",   difficulty: "intermediate", instructions: "Recline on incline bench, full stretch at bottom." },
  { id: "e054", name: "Cable Curl",               primaryMuscle: "Biceps",   secondaryMuscles: [],                       equipment: "Cable",      difficulty: "beginner",     instructions: "Low pulley, constant tension curl to shoulder height." },
  { id: "e055", name: "Preacher Curl",            primaryMuscle: "Biceps",   secondaryMuscles: [],                       equipment: "Barbell",    difficulty: "intermediate", instructions: "Arms on preacher pad, curl from full extension." },
  { id: "e056", name: "Concentration Curl",       primaryMuscle: "Biceps",   secondaryMuscles: [],                       equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Seated, elbow against inner thigh, curl dumbbell to shoulder." },

  // ── Triceps ───────────────────────────────────────────────────────────────
  { id: "e060", name: "Skull Crusher",            primaryMuscle: "Triceps",  secondaryMuscles: [],                       equipment: "Barbell",    difficulty: "intermediate", instructions: "Lower bar to forehead lying flat, extend arms to lockout." },
  { id: "e061", name: "Tricep Pushdown",          primaryMuscle: "Triceps",  secondaryMuscles: [],                       equipment: "Cable",      difficulty: "beginner",     instructions: "Straight or rope attachment, push down to full extension." },
  { id: "e062", name: "Overhead Tricep Extension",primaryMuscle: "Triceps",  secondaryMuscles: [],                       equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Hold dumbbell overhead with both hands, lower behind head." },
  { id: "e063", name: "Close Grip Bench Press",   primaryMuscle: "Triceps",  secondaryMuscles: ["Chest"],                equipment: "Barbell",    difficulty: "intermediate", instructions: "Shoulder-width grip, elbows tight to body, full press." },
  { id: "e064", name: "Diamond Push-Up",          primaryMuscle: "Triceps",  secondaryMuscles: ["Chest"],                equipment: "Bodyweight", difficulty: "intermediate", instructions: "Hands form diamond under chest, push-up motion." },
  { id: "e065", name: "Tricep Dips",              primaryMuscle: "Triceps",  secondaryMuscles: ["Chest"],                equipment: "Bodyweight", difficulty: "intermediate", instructions: "Upright torso on parallel bars, lower and press using triceps." },
  { id: "e066", name: "Rope Pushdown",            primaryMuscle: "Triceps",  secondaryMuscles: [],                       equipment: "Cable",      difficulty: "beginner",     instructions: "Rope attachment, spread rope at bottom, squeeze triceps." },

  // ── Forearms ─────────────────────────────────────────────────────────────
  { id: "e067", name: "Barbell Wrist Curl",       primaryMuscle: "Forearms", secondaryMuscles: [],                       equipment: "Barbell",    difficulty: "beginner",     instructions: "Forearms on thighs, curl wrists upward, full range of motion." },
  { id: "e068", name: "Reverse Wrist Curl",       primaryMuscle: "Forearms", secondaryMuscles: [],                       equipment: "Barbell",    difficulty: "beginner",     instructions: "Overhand grip, curl wrists upward, targets extensor muscles." },
  { id: "e069a", name: "Farmer's Carry",          primaryMuscle: "Forearms", secondaryMuscles: ["Traps","Core"],          equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Hold heavy dumbbells at sides, walk with upright posture." },
  { id: "e069b", name: "Plate Pinch",             primaryMuscle: "Forearms", secondaryMuscles: [],                       equipment: "Barbell",    difficulty: "beginner",     instructions: "Pinch weight plate between thumb and fingers, hold for time." },
  { id: "e069c", name: "Dead Hang",               primaryMuscle: "Forearms", secondaryMuscles: ["Back","Shoulders"],      equipment: "Bodyweight", difficulty: "beginner",     instructions: "Hang from pull-up bar with straight arms, build grip endurance." },

  // ── Legs ──────────────────────────────────────────────────────────────────
  { id: "e070", name: "Barbell Squat",            primaryMuscle: "Quads",    secondaryMuscles: ["Glutes","Hamstrings"],  equipment: "Barbell",    difficulty: "advanced",     instructions: "Bar on upper back, squat to parallel or below, drive through heels." },
  { id: "e071", name: "Goblet Squat",             primaryMuscle: "Quads",    secondaryMuscles: ["Glutes","Core"],        equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Hold dumbbell at chest, squat deep, chest up." },
  { id: "e072", name: "Leg Press",                primaryMuscle: "Quads",    secondaryMuscles: ["Glutes","Hamstrings"],  equipment: "Machine",    difficulty: "beginner",     instructions: "Feet shoulder-width on platform, press to full extension." },
  { id: "e073", name: "Leg Extension",            primaryMuscle: "Quads",    secondaryMuscles: [],                       equipment: "Machine",    difficulty: "beginner",     instructions: "Sit on machine, extend legs to lockout." },
  { id: "e074", name: "Romanian Deadlift",        primaryMuscle: "Hamstrings",secondaryMuscles: ["Glutes","Back"],       equipment: "Barbell",    difficulty: "intermediate", instructions: "Soft knees, hinge at hips, lower bar along legs to mid-shin." },
  { id: "e075", name: "Leg Curl",                 primaryMuscle: "Hamstrings",secondaryMuscles: ["Glutes"],              equipment: "Machine",    difficulty: "beginner",     instructions: "Curl weight to glutes, control the negative." },
  { id: "e076", name: "Hip Thrust",               primaryMuscle: "Glutes",   secondaryMuscles: ["Hamstrings"],           equipment: "Barbell",    difficulty: "intermediate", instructions: "Upper back on bench, bar on hips, drive hips to lockout." },
  { id: "e077", name: "Glute Bridge",             primaryMuscle: "Glutes",   secondaryMuscles: ["Hamstrings"],           equipment: "Bodyweight", difficulty: "beginner",     instructions: "Lie on back, feet flat, drive hips up and squeeze glutes." },
  { id: "e078", name: "Bulgarian Split Squat",    primaryMuscle: "Quads",    secondaryMuscles: ["Glutes","Hamstrings"],  equipment: "Dumbbell",   difficulty: "intermediate", instructions: "Rear foot elevated on bench, lower front leg to 90°." },
  { id: "e079", name: "Walking Lunge",            primaryMuscle: "Quads",    secondaryMuscles: ["Glutes","Hamstrings"],  equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Step forward, lower back knee toward floor, walk forward." },
  { id: "e080", name: "Calf Raise",               primaryMuscle: "Calves",   secondaryMuscles: [],                       equipment: "Machine",    difficulty: "beginner",     instructions: "Full range of motion — full stretch at bottom, full contraction at top." },
  { id: "e081", name: "Seated Calf Raise",        primaryMuscle: "Calves",   secondaryMuscles: [],                       equipment: "Machine",    difficulty: "beginner",     instructions: "Seated, knees bent 90°, raise heels as high as possible." },
  { id: "e082", name: "Front Squat",              primaryMuscle: "Quads",    secondaryMuscles: ["Core","Glutes"],         equipment: "Barbell",    difficulty: "advanced",     instructions: "Bar in front rack, upright torso, deep squat." },
  { id: "e083", name: "Sumo Deadlift",            primaryMuscle: "Glutes",   secondaryMuscles: ["Quads","Hamstrings"],   equipment: "Barbell",    difficulty: "advanced",     instructions: "Wide stance, toes out, pull bar from floor between legs." },

  // ── Core ──────────────────────────────────────────────────────────────────
  { id: "e090", name: "Plank",                    primaryMuscle: "Core",     secondaryMuscles: ["Shoulders"],            equipment: "Bodyweight", difficulty: "beginner",     instructions: "Forearms on floor, body straight, hold position." },
  { id: "e091", name: "Crunch",                   primaryMuscle: "Core",     secondaryMuscles: [],                       equipment: "Bodyweight", difficulty: "beginner",     instructions: "Lie on back, knees bent, curl shoulders toward hips." },
  { id: "e092", name: "Sit-Up",                   primaryMuscle: "Core",     secondaryMuscles: ["Hip Flexors"],          equipment: "Bodyweight", difficulty: "beginner",     instructions: "Full range crunch, elbows back, sit upright." },
  { id: "e093", name: "Leg Raise",                primaryMuscle: "Core",     secondaryMuscles: ["Hip Flexors"],          equipment: "Bodyweight", difficulty: "intermediate", instructions: "Lie flat, raise legs to 90° keeping them straight." },
  { id: "e094", name: "Russian Twist",            primaryMuscle: "Core",     secondaryMuscles: ["Obliques"],             equipment: "Bodyweight", difficulty: "beginner",     instructions: "Seated, feet off floor, rotate torso side to side." },
  { id: "e095", name: "Cable Crunch",             primaryMuscle: "Core",     secondaryMuscles: [],                       equipment: "Cable",      difficulty: "beginner",     instructions: "Kneel at cable, rope behind head, crunch elbows to knees." },
  { id: "e096", name: "Ab Wheel Rollout",         primaryMuscle: "Core",     secondaryMuscles: ["Shoulders","Lats"],     equipment: "Ab Wheel",   difficulty: "advanced",     instructions: "Kneel with wheel, roll out to full extension, return." },
  { id: "e097", name: "Side Plank",               primaryMuscle: "Core",     secondaryMuscles: ["Obliques"],             equipment: "Bodyweight", difficulty: "beginner",     instructions: "Balance on one forearm and foot, body in straight line." },
  { id: "e098", name: "Hanging Leg Raise",        primaryMuscle: "Core",     secondaryMuscles: ["Hip Flexors","Lats"],   equipment: "Bodyweight", difficulty: "advanced",     instructions: "Dead hang from pull-up bar, raise legs to 90° or higher." },

  // ── Compound / Olympic ────────────────────────────────────────────────────
  { id: "e100", name: "Power Clean",              primaryMuscle: "Full Body", secondaryMuscles: ["Traps","Glutes","Quads"],equipment: "Barbell",   difficulty: "advanced",     instructions: "Explosive pull from floor, catch bar at shoulders in squat." },
  { id: "e101", name: "Clean and Press",          primaryMuscle: "Full Body", secondaryMuscles: [],                       equipment: "Barbell",   difficulty: "advanced",     instructions: "Power clean into overhead press." },
  { id: "e102", name: "Kettlebell Swing",         primaryMuscle: "Glutes",   secondaryMuscles: ["Hamstrings","Core","Back"],equipment: "Kettlebell",difficulty: "intermediate",instructions: "Hinge at hips, drive hips forward to swing kettlebell to shoulder height." },
  { id: "e103", name: "Burpee",                   primaryMuscle: "Full Body", secondaryMuscles: [],                       equipment: "Bodyweight",difficulty: "intermediate", instructions: "Stand, drop to push-up, jump feet to hands, jump up." },
  { id: "e104", name: "Thruster",                 primaryMuscle: "Full Body", secondaryMuscles: [],                       equipment: "Barbell",   difficulty: "advanced",     instructions: "Front squat directly into overhead press in one fluid movement." },

  // ── Cardio ────────────────────────────────────────────────────────────────
  { id: "e110", name: "Treadmill Run",            primaryMuscle: "Cardio",   secondaryMuscles: [],                       equipment: "Machine",    difficulty: "beginner",     instructions: "Set desired speed and incline. Maintain steady pace." },
  { id: "e111", name: "Cycling",                  primaryMuscle: "Cardio",   secondaryMuscles: ["Quads","Calves"],        equipment: "Machine",    difficulty: "beginner",     instructions: "Adjust seat height, maintain cadence 80–100 RPM." },
  { id: "e112", name: "Rowing Machine",           primaryMuscle: "Cardio",   secondaryMuscles: ["Back","Biceps","Legs"],  equipment: "Machine",    difficulty: "intermediate", instructions: "Drive with legs first, then lean back, then pull arms." },
  { id: "e113", name: "Jump Rope",                primaryMuscle: "Cardio",   secondaryMuscles: ["Calves","Shoulders"],    equipment: "Bodyweight", difficulty: "beginner",     instructions: "Jump with both feet, rotate rope with wrists." },
  { id: "e114", name: "Stair Climber",            primaryMuscle: "Cardio",   secondaryMuscles: ["Glutes","Quads"],        equipment: "Machine",    difficulty: "beginner",     instructions: "Step fully onto each step, maintain upright posture." },
];

// Unique muscle groups for filter UI
export const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms",
  "Legs", "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Full Body", "Cardio",
];

export const EQUIPMENT_TYPES = [
  "Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Ab Wheel",
];

export function searchExercises(
  query: string,
  options: { muscle?: string; equipment?: string; difficulty?: string } = {},
  limit = 25
): ExerciseItem[] {
  const q = query.toLowerCase().trim();

  // "Legs" is a broad filter that includes Quads, Hamstrings, Glutes, Calves
  const LEG_MUSCLES = new Set(["Quads", "Hamstrings", "Glutes", "Calves"]);

  let results = EXERCISE_DB.filter((e) => {
    const matchesQuery = !q || e.name.toLowerCase().includes(q) ||
      e.primaryMuscle.toLowerCase().includes(q) ||
      e.secondaryMuscles.some((m) => m.toLowerCase().includes(q));
    const matchesMuscle = !options.muscle
      || e.primaryMuscle === options.muscle
      || (options.muscle === "Legs" && LEG_MUSCLES.has(e.primaryMuscle));
    const matchesEquipment = !options.equipment || e.equipment === options.equipment;
    const matchesDifficulty= !options.difficulty|| e.difficulty === options.difficulty;
    return matchesQuery && matchesMuscle && matchesEquipment && matchesDifficulty;
  });

  // Rank: name prefix match > name contains > muscle match
  if (q) {
    results.sort((a, b) => {
      const aScore = a.name.toLowerCase().startsWith(q) ? 3 :
                     a.name.toLowerCase().includes(q) ? 2 : 1;
      const bScore = b.name.toLowerCase().startsWith(q) ? 3 :
                     b.name.toLowerCase().includes(q) ? 2 : 1;
      return bScore - aScore || a.name.localeCompare(b.name);
    });
  }

  return results.slice(0, limit);
}
