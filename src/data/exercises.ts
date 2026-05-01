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

  // ── Glutes (additional) ───────────────────────────────────────────────────
  { id: "e084", name: "Cable Kickback",          primaryMuscle: "Glutes",    secondaryMuscles: ["Hamstrings"],           equipment: "Cable",      difficulty: "beginner",     instructions: "Attach ankle cuff to low pulley, kick leg back squeezing glute at top." },
  { id: "e085", name: "Donkey Kick",             primaryMuscle: "Glutes",    secondaryMuscles: [],                       equipment: "Bodyweight", difficulty: "beginner",     instructions: "On hands and knees, kick one leg up keeping knee bent, squeeze glute at top." },
  { id: "e086", name: "Sumo Squat",              primaryMuscle: "Glutes",    secondaryMuscles: ["Quads","Hamstrings","Adductors"], equipment: "Dumbbell", difficulty: "beginner", instructions: "Wide stance, toes pointed 45° out, hold dumbbell at chest or between legs, squat deep." },
  { id: "e087", name: "Frog Pump",               primaryMuscle: "Glutes",    secondaryMuscles: [],                       equipment: "Bodyweight", difficulty: "beginner",     instructions: "Lie on back, feet together, knees out like a frog, pump hips up and squeeze glutes." },
  { id: "e088", name: "Single-Leg Hip Thrust",   primaryMuscle: "Glutes",    secondaryMuscles: ["Hamstrings","Core"],    equipment: "Bodyweight", difficulty: "intermediate", instructions: "Upper back on bench, one leg extended, drive single hip to lockout squeezing glute." },

  // ── Traps ─────────────────────────────────────────────────────────────────
  { id: "e115", name: "Barbell Shrug",           primaryMuscle: "Traps",     secondaryMuscles: ["Forearms"],             equipment: "Barbell",    difficulty: "beginner",     instructions: "Hold barbell at hip level, shrug shoulders straight up, brief pause at top." },
  { id: "e116", name: "Dumbbell Shrug",          primaryMuscle: "Traps",     secondaryMuscles: ["Forearms"],             equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Hold dumbbells at sides, shrug shoulders toward ears, hold briefly at top." },
  { id: "e117", name: "Rack Pull",               primaryMuscle: "Traps",     secondaryMuscles: ["Back","Glutes","Forearms"], equipment: "Barbell", difficulty: "intermediate", instructions: "Set bar at knee height on rack, pull to full hip extension — great for upper back and traps overload." },
  { id: "e118", name: "Cable Shrug",             primaryMuscle: "Traps",     secondaryMuscles: [],                       equipment: "Cable",      difficulty: "beginner",     instructions: "Low pulley, arms straight, shrug shoulders up with constant cable tension." },

  // ── Brachialis ───────────────────────────────────────────────────────────
  { id: "e130", name: "Hammer Curl",              primaryMuscle: "Brachialis", secondaryMuscles: ["Biceps","Forearms"],    equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Neutral grip (palms facing each other), curl to shoulder height. Peak contraction stresses brachialis." },
  { id: "e131", name: "Cross-Body Hammer Curl",   primaryMuscle: "Brachialis", secondaryMuscles: ["Biceps"],              equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Curl dumbbell across body toward opposite shoulder. Great brachialis isolation." },
  { id: "e132", name: "Reverse Curl",             primaryMuscle: "Brachialis", secondaryMuscles: ["Forearms","Biceps"],   equipment: "Barbell",    difficulty: "beginner",     instructions: "Overhand (pronated) grip, curl barbell to shoulder height. Strongly activates brachialis and brachioradialis." },
  { id: "e133", name: "Zottman Curl",             primaryMuscle: "Brachialis", secondaryMuscles: ["Biceps","Forearms"],   equipment: "Dumbbell",   difficulty: "intermediate", instructions: "Curl up with supinated grip, rotate to pronated at top, lower with overhand grip. Trains brachialis and forearm extensors." },
  { id: "e134", name: "Cable Hammer Curl",        primaryMuscle: "Brachialis", secondaryMuscles: ["Biceps"],              equipment: "Cable",      difficulty: "beginner",     instructions: "Rope attachment, low pulley, neutral grip curl to shoulder with constant cable tension." },
  { id: "e135", name: "Rope Cable Curl",          primaryMuscle: "Brachialis", secondaryMuscles: ["Biceps","Forearms"],   equipment: "Cable",      difficulty: "beginner",     instructions: "Use rope on low pulley, keep palms facing each other throughout the full curl." },

  // ── Glutes — Extended ─────────────────────────────────────────────────────
  { id: "e140", name: "Abduction Machine",        primaryMuscle: "Glutes",    secondaryMuscles: ["Abductors"],            equipment: "Machine",    difficulty: "beginner",     instructions: "Sit on machine, push knees outward against resistance. Targets glute med and hip abductors." },
  { id: "e141", name: "Banded Side Walk",         primaryMuscle: "Glutes",    secondaryMuscles: ["Abductors"],            equipment: "Bodyweight", difficulty: "beginner",     instructions: "Loop resistance band above knees, squat slightly, step laterally keeping tension on band throughout." },
  { id: "e142", name: "Cable Hip Abduction",      primaryMuscle: "Glutes",    secondaryMuscles: ["Abductors"],            equipment: "Cable",      difficulty: "beginner",     instructions: "Ankle cuff on low pulley, stand side-on, swing leg away from cable stack. Glute med focus." },
  { id: "e143", name: "Step-Up",                  primaryMuscle: "Glutes",    secondaryMuscles: ["Quads","Hamstrings"],   equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Step onto bench or box, drive through heel to stand, controlled return. Add dumbbells for load." },
  { id: "e144", name: "Clamshell",                primaryMuscle: "Glutes",    secondaryMuscles: ["Abductors"],            equipment: "Bodyweight", difficulty: "beginner",     instructions: "Lie on side, knees bent, rotate top knee up like a clamshell. Add band for resistance." },
  { id: "e145", name: "Nordic Hamstring Curl",    primaryMuscle: "Hamstrings", secondaryMuscles: ["Glutes"],              equipment: "Bodyweight", difficulty: "advanced",     instructions: "Kneel with feet anchored, lower body slowly using hamstrings only. One of the highest hamstring activation exercises." },
  { id: "e146", name: "Reverse Hyperextension",   primaryMuscle: "Glutes",    secondaryMuscles: ["Hamstrings","Lower Back"], equipment: "Machine", difficulty: "beginner",     instructions: "Lie face down, swing legs up to parallel using glute contraction. Decompress the lumbar spine while training posterior chain." },
  { id: "e147", name: "Lateral Band Walk",        primaryMuscle: "Glutes",    secondaryMuscles: ["Abductors"],            equipment: "Bodyweight", difficulty: "beginner",     instructions: "Band above ankles, slight squat, walk sideways maintaining tension. Warm-up and glute activation staple." },

  // ── Traps — Extended ─────────────────────────────────────────────────────
  { id: "e150", name: "Snatch-Grip Deadlift",     primaryMuscle: "Traps",     secondaryMuscles: ["Back","Glutes","Hamstrings"], equipment: "Barbell", difficulty: "advanced",     instructions: "Wide snatch grip deadlift — upper trap activation is significantly higher than conventional due to longer moment arm." },
  { id: "e151", name: "Trap Bar Shrug",           primaryMuscle: "Traps",     secondaryMuscles: ["Forearms"],             equipment: "Machine",    difficulty: "beginner",     instructions: "Stand inside hex/trap bar, neutral grip, shrug straight up. Allows heavier load with less wrist strain than barbell." },
  { id: "e152", name: "Meadows Row",              primaryMuscle: "Traps",     secondaryMuscles: ["Back","Rear Delts"],    equipment: "Barbell",    difficulty: "intermediate", instructions: "Perpendicular to landmine, row bar to hip with explosive pull. Heavy upper-mid trap and rhomboid activation." },
  { id: "e153", name: "High Pull",                primaryMuscle: "Traps",     secondaryMuscles: ["Shoulders","Biceps"],   equipment: "Barbell",    difficulty: "intermediate", instructions: "Explosive pull from hang, elbows flare high — traps contract hard at top. Olympic movement variation." },

  // ── Core — Weighted Abs ────────────────────────────────────────────────────
  { id: "e099a", name: "Weighted Crunch",        primaryMuscle: "Core",      secondaryMuscles: [],                       equipment: "Plate",      difficulty: "intermediate", instructions: "Hold weight plate on chest, perform crunch with controlled tempo." },
  { id: "e099b", name: "Dragon Flag",            primaryMuscle: "Core",      secondaryMuscles: ["Shoulders","Lats"],     equipment: "Bodyweight", difficulty: "advanced",     instructions: "Grip bench behind head, raise body to vertical then lower slowly keeping body rigid." },
  { id: "e099c", name: "Pallof Press",           primaryMuscle: "Core",      secondaryMuscles: ["Obliques","Shoulders"], equipment: "Cable",      difficulty: "beginner",     instructions: "Stand perpendicular to cable, press handle away from chest and return — resists rotation." },
  { id: "e099d", name: "Landmine Oblique Twist", primaryMuscle: "Core",      secondaryMuscles: ["Obliques","Shoulders"], equipment: "Barbell",    difficulty: "intermediate", instructions: "Hold bar end overhead, rotate to each side controlling the arc with your core." },
  { id: "e099e", name: "Decline Sit-Up",         primaryMuscle: "Core",      secondaryMuscles: ["Hip Flexors"],          equipment: "Bodyweight", difficulty: "intermediate", instructions: "Feet secured on decline bench, perform full sit-up with hands behind head." },

  // ── Stretching / Mobility ─────────────────────────────────────────────────
  { id: "e120", name: "Hip Flexor Stretch",      primaryMuscle: "Stretching", secondaryMuscles: ["Quads"],               equipment: "Bodyweight", difficulty: "beginner",     instructions: "Kneel on one knee, shift hips forward until you feel a stretch in the front of the hip. Hold 30–60 s per side." },
  { id: "e121", name: "Hamstring Stretch",       primaryMuscle: "Stretching", secondaryMuscles: [],                      equipment: "Bodyweight", difficulty: "beginner",     instructions: "Sit with legs straight, reach toward toes keeping back flat. Hold 30–60 s." },
  { id: "e122", name: "Chest Stretch",           primaryMuscle: "Stretching", secondaryMuscles: ["Front Delts"],         equipment: "Bodyweight", difficulty: "beginner",     instructions: "Clasp hands behind back, gently raise arms and open chest. Hold 30 s." },
  { id: "e123", name: "Cross-Body Shoulder Stretch", primaryMuscle: "Stretching", secondaryMuscles: ["Rear Delts"],      equipment: "Bodyweight", difficulty: "beginner",     instructions: "Pull one arm across chest with opposite hand. Hold 30 s per side." },
  { id: "e124", name: "Pigeon Pose",             primaryMuscle: "Stretching", secondaryMuscles: ["Glutes","Hip Flexors"],equipment: "Bodyweight", difficulty: "intermediate", instructions: "From push-up position, bring one knee forward behind same-side wrist. Lower hips and hold 60 s." },
  { id: "e125", name: "Cat-Cow Stretch",         primaryMuscle: "Stretching", secondaryMuscles: ["Core","Back"],         equipment: "Bodyweight", difficulty: "beginner",     instructions: "On hands and knees, alternate between arching and rounding your spine slowly for 10 reps." },
  { id: "e126", name: "Thoracic Rotation",       primaryMuscle: "Stretching", secondaryMuscles: ["Back"],                equipment: "Bodyweight", difficulty: "beginner",     instructions: "Sit cross-legged or in a chair, rotate torso left and right with hands behind head. 10 reps each side." },
  { id: "e127", name: "Standing Quad Stretch",   primaryMuscle: "Stretching", secondaryMuscles: ["Quads"],               equipment: "Bodyweight", difficulty: "beginner",     instructions: "Balance on one foot, pull opposite foot to glutes. Hold 30 s per side." },
  { id: "e128", name: "World's Greatest Stretch",primaryMuscle: "Stretching", secondaryMuscles: ["Hip Flexors","Thoracic Spine","Glutes"], equipment: "Bodyweight", difficulty: "intermediate", instructions: "From lunge, place same-side hand inside foot, rotate upper arm to sky. 5 reps per side." },

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

  // ── Chest (extra) ─────────────────────────────────────────────────────────
  { id: "e130", name: "Landmine Press",              primaryMuscle: "Chest",      secondaryMuscles: ["Shoulders","Triceps"],        equipment: "Barbell",    difficulty: "intermediate", instructions: "Fix barbell in landmine, press at 45-degree angle targeting upper chest and front delt." },
  { id: "e131", name: "Chest Press Machine",         primaryMuscle: "Chest",      secondaryMuscles: ["Triceps","Front Delts"],      equipment: "Machine",    difficulty: "beginner",     instructions: "Adjust seat so handles are at chest height, press forward to full extension." },
  { id: "e132", name: "Svend Press",                 primaryMuscle: "Chest",      secondaryMuscles: [],                             equipment: "Plate",      difficulty: "beginner",     instructions: "Squeeze a plate between palms and press forward at chest height. Constant pec tension." },
  { id: "e133", name: "Incline Cable Fly",           primaryMuscle: "Chest",      secondaryMuscles: ["Front Delts"],                equipment: "Cable",      difficulty: "beginner",     instructions: "Set cables low, lie on incline bench, fly up to chest height emphasising upper chest." },
  { id: "e134", name: "High-to-Low Cable Fly",       primaryMuscle: "Chest",      secondaryMuscles: [],                             equipment: "Cable",      difficulty: "beginner",     instructions: "Set cables high, pull down and in to hips. Targets lower chest." },
  { id: "e135", name: "Wide Push-Up",                primaryMuscle: "Chest",      secondaryMuscles: ["Triceps"],                    equipment: "Bodyweight", difficulty: "beginner",     instructions: "Hands wider than shoulder-width to increase chest stretch at the bottom." },

  // ── Back (extra) ──────────────────────────────────────────────────────────
  { id: "e140", name: "Meadows Row",                 primaryMuscle: "Back",       secondaryMuscles: ["Biceps","Rear Delts"],        equipment: "Barbell",    difficulty: "intermediate", instructions: "Stand beside landmine, pull bar to hip with single arm, elbows flared for lat width." },
  { id: "e141", name: "Pendlay Row",                 primaryMuscle: "Back",       secondaryMuscles: ["Biceps","Traps"],             equipment: "Barbell",    difficulty: "intermediate", instructions: "Bar starts on floor each rep, explosive pull to chest, strict horizontal torso." },
  { id: "e142", name: "Chest-Supported Row",         primaryMuscle: "Back",       secondaryMuscles: ["Biceps","Rear Delts"],        equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Lie face-down on incline bench, row dumbbells to hips. No momentum, pure back contraction." },
  { id: "e143", name: "Straight-Arm Pulldown",       primaryMuscle: "Back",       secondaryMuscles: ["Core"],                       equipment: "Cable",      difficulty: "beginner",     instructions: "Stand at cable, arms straight, push bar from eye level to thighs using lats only." },
  { id: "e144", name: "Wide-Grip Cable Row",         primaryMuscle: "Back",       secondaryMuscles: ["Rear Delts","Traps"],         equipment: "Cable",      difficulty: "beginner",     instructions: "Use wide-grip bar, pull to upper chest rather than lower abdomen. Targets upper back." },
  { id: "e145", name: "Good Morning",                primaryMuscle: "Back",       secondaryMuscles: ["Hamstrings","Glutes"],        equipment: "Barbell",    difficulty: "intermediate", instructions: "Bar on upper back, soft knee bend, hinge at hips until torso is near parallel to floor." },
  { id: "e146", name: "Back Extension",              primaryMuscle: "Back",       secondaryMuscles: ["Glutes","Hamstrings"],        equipment: "Machine",    difficulty: "beginner",     instructions: "Hinge at hips on GHD or hyperextension bench, raise torso to neutral spine." },
  { id: "e147", name: "Kelso Shrug",                 primaryMuscle: "Back",       secondaryMuscles: ["Traps"],                     equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Lie face-down on low incline, retract and depress scapula without moving arms." },

  // ── Shoulders (extra) ─────────────────────────────────────────────────────
  { id: "e150", name: "Lateral Raise Machine",       primaryMuscle: "Shoulders",  secondaryMuscles: [],                             equipment: "Machine",    difficulty: "beginner",     instructions: "Sit with arms against pads, raise laterally to shoulder height with constant resistance." },
  { id: "e151", name: "Cuban Press",                 primaryMuscle: "Shoulders",  secondaryMuscles: ["Rear Delts","Traps"],         equipment: "Dumbbell",   difficulty: "beginner",     instructions: "External rotation then press: row to 90-degree elbow, rotate forearms up, press overhead." },
  { id: "e152", name: "Plate Front Raise",           primaryMuscle: "Shoulders",  secondaryMuscles: ["Traps"],                     equipment: "Plate",      difficulty: "beginner",     instructions: "Hold plate with both hands, raise to eye level with straight arms." },
  { id: "e153", name: "Bradford Press",              primaryMuscle: "Shoulders",  secondaryMuscles: ["Triceps","Traps"],            equipment: "Barbell",    difficulty: "intermediate", instructions: "Alternate pressing bar from front to back over head without fully locking out." },
  { id: "e154", name: "Y-T-W Raise",                primaryMuscle: "Shoulders",  secondaryMuscles: ["Rear Delts","Traps"],         equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Lie prone on incline, raise arms in Y, T, then W shapes — great for rotator cuff health." },
  { id: "e155", name: "Seated Dumbbell Press",       primaryMuscle: "Shoulders",  secondaryMuscles: ["Triceps"],                   equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Back supported at 90 degrees, press from ear level to full extension overhead." },

  // ── Biceps (extra) ────────────────────────────────────────────────────────
  { id: "e160", name: "Spider Curl",                 primaryMuscle: "Biceps",     secondaryMuscles: [],                             equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Lie chest-down on incline bench, curl dumbbells — eliminates momentum completely." },
  { id: "e161", name: "Cable Hammer Curl",           primaryMuscle: "Biceps",     secondaryMuscles: ["Brachialis","Forearms"],     equipment: "Cable",      difficulty: "beginner",     instructions: "Rope attachment, neutral grip, curl from low pulley maintaining elbow position." },
  { id: "e162", name: "Drag Curl",                   primaryMuscle: "Biceps",     secondaryMuscles: [],                             equipment: "Barbell",    difficulty: "beginner",     instructions: "Drag bar up the torso (elbows go back rather than staying still) for peak contraction." },
  { id: "e163", name: "EZ Bar Curl",                 primaryMuscle: "Biceps",     secondaryMuscles: ["Forearms"],                  equipment: "Barbell",    difficulty: "beginner",     instructions: "Use angled EZ bar for reduced wrist strain. Curl to shoulder height, full range." },
  { id: "e164", name: "21s Curl",                    primaryMuscle: "Biceps",     secondaryMuscles: [],                             equipment: "Barbell",    difficulty: "beginner",     instructions: "7 reps lower half, 7 reps upper half, 7 reps full range. Maximum time under tension." },

  // ── Triceps (extra) ───────────────────────────────────────────────────────
  { id: "e170", name: "JM Press",                    primaryMuscle: "Triceps",    secondaryMuscles: ["Chest"],                     equipment: "Barbell",    difficulty: "intermediate", instructions: "Hybrid between close-grip bench and skull crusher. Lower bar to neck/chin area." },
  { id: "e171", name: "Cable Overhead Tricep Ext",  primaryMuscle: "Triceps",    secondaryMuscles: [],                             equipment: "Cable",      difficulty: "beginner",     instructions: "Rope at high pulley, face away, extend rope forward overhead for long-head emphasis." },
  { id: "e172", name: "Dumbbell Kickback",           primaryMuscle: "Triceps",    secondaryMuscles: [],                             equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Hinge forward, upper arm parallel to floor, extend forearm back to lockout." },
  { id: "e173", name: "Tricep Dip Machine",          primaryMuscle: "Triceps",    secondaryMuscles: ["Chest"],                     equipment: "Machine",    difficulty: "beginner",     instructions: "Grip handles with elbows tucked, press down to full elbow extension." },

  // ── Quads (extra) ─────────────────────────────────────────────────────────
  { id: "e180", name: "Hack Squat",                  primaryMuscle: "Quads",      secondaryMuscles: ["Glutes","Hamstrings"],        equipment: "Machine",    difficulty: "intermediate", instructions: "Feet shoulder-width on plate, lower sled to 90-degree knee angle." },
  { id: "e181", name: "Smith Machine Squat",         primaryMuscle: "Quads",      secondaryMuscles: ["Glutes"],                    equipment: "Machine",    difficulty: "beginner",     instructions: "Position bar on upper back, feet slightly forward, squat to parallel." },
  { id: "e182", name: "Step-Up",                     primaryMuscle: "Quads",      secondaryMuscles: ["Glutes","Hamstrings"],        equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Hold dumbbells, step onto box or bench, drive through heel to fully stand." },
  { id: "e183", name: "Sissy Squat",                 primaryMuscle: "Quads",      secondaryMuscles: [],                             equipment: "Bodyweight", difficulty: "advanced",     instructions: "Hold fixed object, lean back and bend knees, raising heels. Extreme quad stretch." },
  { id: "e184", name: "Box Jump",                    primaryMuscle: "Quads",      secondaryMuscles: ["Glutes","Calves","Core"],     equipment: "Bodyweight", difficulty: "intermediate", instructions: "Stand in front of box, dip and explosively jump onto it, land softly with bent knees." },
  { id: "e185", name: "Pause Squat",                 primaryMuscle: "Quads",      secondaryMuscles: ["Glutes","Core"],             equipment: "Barbell",    difficulty: "intermediate", instructions: "Regular squat with 2-3 second pause at bottom. Builds strength out of hole." },

  // ── Hamstrings (extra) ────────────────────────────────────────────────────
  { id: "e190", name: "Nordic Hamstring Curl",       primaryMuscle: "Hamstrings", secondaryMuscles: ["Glutes"],                    equipment: "Bodyweight", difficulty: "advanced",     instructions: "Partner holds ankles, lower torso toward floor under control, push up." },
  { id: "e191", name: "Standing Leg Curl",           primaryMuscle: "Hamstrings", secondaryMuscles: ["Glutes"],                    equipment: "Machine",    difficulty: "beginner",     instructions: "Single-leg curl standing up, better stretch than seated version." },
  { id: "e192", name: "Dumbbell Romanian Deadlift",  primaryMuscle: "Hamstrings", secondaryMuscles: ["Glutes","Back"],             equipment: "Dumbbell",   difficulty: "intermediate", instructions: "Hold dumbbells, hinge at hips keeping back flat, feel hamstring stretch." },
  { id: "e193", name: "Swiss Ball Leg Curl",         primaryMuscle: "Hamstrings", secondaryMuscles: ["Glutes","Core"],             equipment: "Bodyweight", difficulty: "intermediate", instructions: "Lie on back, heels on ball, drive hips up and curl ball toward glutes." },

  // ── Glutes (extra) ────────────────────────────────────────────────────────
  { id: "e196", name: "Cable Pull-Through",          primaryMuscle: "Glutes",     secondaryMuscles: ["Hamstrings"],                equipment: "Cable",      difficulty: "beginner",     instructions: "Face away from cable between legs, hinge at hips, squeeze glutes to stand." },
  { id: "e197", name: "Single-Leg Romanian Deadlift",primaryMuscle: "Glutes",     secondaryMuscles: ["Hamstrings","Core"],         equipment: "Dumbbell",   difficulty: "intermediate", instructions: "Hinge at hip on one leg, opposite leg extends behind, feel glute and hamstring stretch." },
  { id: "e198", name: "Banded Clamshell",            primaryMuscle: "Glutes",     secondaryMuscles: [],                             equipment: "Bodyweight", difficulty: "beginner",     instructions: "Lie on side with band above knees, rotate top knee up like a clamshell opening." },
  { id: "e199", name: "Step-Up Knee Drive",          primaryMuscle: "Glutes",     secondaryMuscles: ["Quads","Core"],              equipment: "Dumbbell",   difficulty: "beginner",     instructions: "Step up onto box, drive opposite knee to chest at top for glute and core activation." },

  // ── Calves (extra) ────────────────────────────────────────────────────────
  { id: "e200", name: "Donkey Calf Raise",           primaryMuscle: "Calves",     secondaryMuscles: [],                             equipment: "Machine",    difficulty: "beginner",     instructions: "Lean forward at 90 degrees, raise heels high. Great for maximum gastrocnemius stretch." },
  { id: "e201", name: "Single-Leg Calf Raise",       primaryMuscle: "Calves",     secondaryMuscles: [],                             equipment: "Bodyweight", difficulty: "beginner",     instructions: "Stand on one foot on a step edge, full range of motion. Harder than bilateral version." },
  { id: "e202", name: "Leg Press Calf Raise",        primaryMuscle: "Calves",     secondaryMuscles: [],                             equipment: "Machine",    difficulty: "beginner",     instructions: "Use leg press machine, push sled with just the balls of your feet for calf raise." },

  // ── Core (extra) ──────────────────────────────────────────────────────────
  { id: "e205", name: "Bicycle Crunch",              primaryMuscle: "Core",       secondaryMuscles: ["Obliques"],                  equipment: "Bodyweight", difficulty: "beginner",     instructions: "Alternating elbow to opposite knee, rotate torso fully each rep." },
  { id: "e206", name: "V-Up",                        primaryMuscle: "Core",       secondaryMuscles: ["Hip Flexors"],               equipment: "Bodyweight", difficulty: "intermediate", instructions: "Simultaneously raise legs and torso to meet in middle, balancing on tailbone." },
  { id: "e207", name: "Hollow Body Hold",            primaryMuscle: "Core",       secondaryMuscles: ["Hip Flexors"],               equipment: "Bodyweight", difficulty: "intermediate", instructions: "Lower back pressed to floor, arms overhead, raise legs and shoulder blades slightly. Hold." },
  { id: "e208", name: "Dead Bug",                    primaryMuscle: "Core",       secondaryMuscles: ["Hip Flexors"],               equipment: "Bodyweight", difficulty: "beginner",     instructions: "On back, arms up, opposite arm and leg extend toward floor maintaining lower-back contact." },
  { id: "e209", name: "Copenhagen Plank",            primaryMuscle: "Core",       secondaryMuscles: ["Adductors"],                 equipment: "Bodyweight", difficulty: "advanced",     instructions: "Side plank with top foot on bench, lift bottom leg to meet it. Adductor and core challenge." },
  { id: "e210", name: "Toes-to-Bar",                 primaryMuscle: "Core",       secondaryMuscles: ["Hip Flexors","Lats"],        equipment: "Bodyweight", difficulty: "advanced",     instructions: "Dead hang from pull-up bar, raise feet to touch bar controlling the swing." },

  // ── Cardio (extra) ────────────────────────────────────────────────────────
  { id: "e215", name: "Battle Ropes",                primaryMuscle: "Cardio",     secondaryMuscles: ["Shoulders","Core","Arms"],   equipment: "Machine",    difficulty: "intermediate", instructions: "Hold rope ends, alternate or simultaneous wave motion for 20-40 seconds." },
  { id: "e216", name: "Sled Push",                   primaryMuscle: "Cardio",     secondaryMuscles: ["Quads","Glutes","Core"],     equipment: "Machine",    difficulty: "intermediate", instructions: "Drive sled forward with low body position, short powerful steps." },
  { id: "e217", name: "Swimming",                    primaryMuscle: "Cardio",     secondaryMuscles: ["Back","Shoulders","Core"],   equipment: "Bodyweight", difficulty: "beginner",     instructions: "Freestyle or any stroke. Maintain steady breathing rhythm." },
  { id: "e218", name: "Sprint Intervals",            primaryMuscle: "Cardio",     secondaryMuscles: ["Quads","Hamstrings","Calves"],equipment: "Bodyweight", difficulty: "advanced",     instructions: "All-out sprint for 20-30s, walk 60-90s recovery. Repeat 6-10 rounds." },

  // ── Adductors / Abductors ─────────────────────────────────────────────────
  { id: "e220", name: "Hip Adductor Machine",        primaryMuscle: "Adductors",  secondaryMuscles: [],                             equipment: "Machine",    difficulty: "beginner",     instructions: "Sit with legs on pads, squeeze legs together against resistance. Full range of motion." },
  { id: "e221", name: "Hip Abductor Machine",        primaryMuscle: "Abductors",  secondaryMuscles: ["Glutes"],                    equipment: "Machine",    difficulty: "beginner",     instructions: "Sit with pads on outside of knees, push legs apart against resistance." },
  { id: "e222", name: "Lateral Band Walk",           primaryMuscle: "Abductors",  secondaryMuscles: ["Glutes"],                    equipment: "Bodyweight", difficulty: "beginner",     instructions: "Resistance band above knees, squat slightly, sidestep maintaining band tension." },
  { id: "e223", name: "Sumo Walk",                   primaryMuscle: "Adductors",  secondaryMuscles: ["Glutes","Quads"],            equipment: "Bodyweight", difficulty: "beginner",     instructions: "Wide stance, toes out, walk forward staying in squat position. Targets inner thighs." },

  // ── Full Body (extra) ─────────────────────────────────────────────────────
  { id: "e225", name: "Turkish Get-Up",              primaryMuscle: "Full Body",  secondaryMuscles: ["Core","Shoulders","Glutes"], equipment: "Kettlebell", difficulty: "advanced",     instructions: "From lying, press KB overhead and stand up in a controlled sequence. Reverse to start." },
  { id: "e226", name: "Man Maker",                   primaryMuscle: "Full Body",  secondaryMuscles: [],                             equipment: "Dumbbell",   difficulty: "advanced",     instructions: "Dumbbell burpee: push-up, renegade row each side, clean, then press overhead." },
  { id: "e227", name: "Sandbag Carry",               primaryMuscle: "Full Body",  secondaryMuscles: ["Core","Traps"],              equipment: "Bodyweight", difficulty: "intermediate", instructions: "Bear hug or shoulder carry a sandbag for distance or time. Total body stabilisation." },
  { id: "e228", name: "Bear Crawl",                  primaryMuscle: "Full Body",  secondaryMuscles: ["Core","Shoulders"],          equipment: "Bodyweight", difficulty: "beginner",     instructions: "On hands and feet, move forward keeping knees 2 inches off the ground. Stay low." },
];

// Unique muscle groups for filter UI
export const MUSCLE_GROUPS = [
  // Specific muscle groups
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Brachialis",
  "Legs", "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Traps",
  "Full Body", "Cardio", "Stretching", "Adductors", "Abductors",
];

// Compound groupings — these map to multiple primaryMuscle values
export const COMPOUND_GROUP_MAP: Record<string, string[]> = {
  "Push":       ["Chest", "Shoulders", "Triceps"],
  "Pull":       ["Back", "Biceps", "Traps", "Brachialis"],
  "Upper Body": ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Brachialis", "Traps"],
  "Lower Body": ["Quads", "Hamstrings", "Glutes", "Calves", "Adductors", "Abductors"],
};

export const EQUIPMENT_TYPES = [
  "Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Ab Wheel", "Plate",
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
    const compoundSet = options.muscle ? COMPOUND_GROUP_MAP[options.muscle] : undefined;
    const matchesMuscle = !options.muscle
      || e.primaryMuscle === options.muscle
      || (options.muscle === "Legs" && LEG_MUSCLES.has(e.primaryMuscle))
      || (compoundSet && compoundSet.includes(e.primaryMuscle));
    const matchesEquipment = !options.equipment || e.equipment === options.equipment;
    const matchesDifficulty= !options.difficulty|| e.difficulty === options.difficulty;
    // When no muscle filter is set, exclude Stretching from default results
    // (they appear only when explicitly filtered)
    const notHiddenStretching = options.muscle
      ? true
      : e.primaryMuscle !== "Stretching";
    return matchesQuery && matchesMuscle && matchesEquipment && matchesDifficulty && notHiddenStretching;
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
