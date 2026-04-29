import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate, validateIdParam } from "../middleware/validate.js";
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  updateExerciseEntrySchema,
  addExerciseToWorkoutSchema,
  startFromTemplateSchema,
} from "../middleware/schemas.js";
import {
  getWorkouts,
  getWorkout,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  getStats,
  getExerciseProgression,
  updateExerciseEntry,
  deleteExerciseEntry,
  addExerciseToWorkout,
  startFromTemplate,
} from "../controllers/workoutController.js";

const router = Router();
router.use(authenticate);

// ── Static sub-paths first (before /:id) ─────────────────────────────────────
// GET  /api/workouts/stats
router.get("/stats", getStats);

// GET  /api/workouts/exercises/:name/progression
router.get("/exercises/:name/progression", getExerciseProgression);

// PUT    /api/workouts/exercises/:exerciseId  (inline edit a set/rep/weight row)
router.put(
  "/exercises/:exerciseId",
  validateIdParam("exerciseId"),
  validate(updateExerciseEntrySchema),
  updateExerciseEntry
);

// DELETE /api/workouts/exercises/:exerciseId  (remove a row from a workout)
router.delete(
  "/exercises/:exerciseId",
  validateIdParam("exerciseId"),
  deleteExerciseEntry
);

// POST   /api/workouts/start-from-template/:templateId
router.post("/start-from-template/:templateId", validateIdParam("templateId"), validate(startFromTemplateSchema), startFromTemplate);

// ── Workout CRUD ──────────────────────────────────────────────────────────────
// GET  /api/workouts
router.get("/", getWorkouts);

// POST /api/workouts
router.post("/", validate(createWorkoutSchema), createWorkout);

// GET  /api/workouts/:id
router.get("/:id", validateIdParam(), getWorkout);

// PUT  /api/workouts/:id
router.put("/:id", validateIdParam(), validate(updateWorkoutSchema), updateWorkout);

// DELETE /api/workouts/:id
router.delete("/:id", validateIdParam(), deleteWorkout);

// POST /api/workouts/:id/exercises  (add exercise to existing workout)
router.post("/:id/exercises", validateIdParam(), validate(addExerciseToWorkoutSchema), addExerciseToWorkout);

export default router;
