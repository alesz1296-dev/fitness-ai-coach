import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
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
} from "../controllers/workoutController.js";

const router = Router();
router.use(authenticate);

// ── Static sub-paths first (before /:id) ─────────────────────────────────────
// GET  /api/workouts/stats
router.get("/stats", getStats);

// GET  /api/workouts/exercises/:name/progression
router.get("/exercises/:name/progression", getExerciseProgression);

// PUT    /api/workouts/exercises/:exerciseId  (inline edit a set/rep/weight row)
router.put("/exercises/:exerciseId", updateExerciseEntry);

// DELETE /api/workouts/exercises/:exerciseId  (remove a row from a workout)
router.delete("/exercises/:exerciseId", deleteExerciseEntry);

// ── Workout CRUD ──────────────────────────────────────────────────────────────
// GET  /api/workouts
router.get("/", getWorkouts);

// POST /api/workouts
router.post("/", createWorkout);

// GET  /api/workouts/:id
router.get("/:id", getWorkout);

// PUT  /api/workouts/:id
router.put("/:id", updateWorkout);

// DELETE /api/workouts/:id
router.delete("/:id", deleteWorkout);

export default router;
