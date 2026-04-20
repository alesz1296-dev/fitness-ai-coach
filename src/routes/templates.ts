import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getTemplates,
  getRecommended,
  getTemplate,
  createTemplate,
  updateTemplate,
  addExercise,
  updateExercise,
  removeExercise,
  deleteTemplate,
  createFromWorkout,
  seedRecommended,
} from "../controllers/templateController.js";

const router = Router();
router.use(authenticate);

// GET  /api/templates/recommended
router.get("/recommended", getRecommended);

// POST /api/templates/seed  (run once to populate system splits)
router.post("/seed", seedRecommended);

// POST /api/templates/from-workout/:workoutId
router.post("/from-workout/:workoutId", createFromWorkout);

// GET  /api/templates
router.get("/", getTemplates);

// POST /api/templates
router.post("/", createTemplate);

// GET  /api/templates/:id
router.get("/:id", getTemplate);

// PUT  /api/templates/:id
router.put("/:id", updateTemplate);

// DELETE /api/templates/:id
router.delete("/:id", deleteTemplate);

// POST   /api/templates/:id/exercises
router.post("/:id/exercises", addExercise);

// PUT    /api/templates/:id/exercises/:exerciseId
router.put("/:id/exercises/:exerciseId", updateExercise);

// DELETE /api/templates/:id/exercises/:exerciseId
router.delete("/:id/exercises/:exerciseId", removeExercise);

export default router;
