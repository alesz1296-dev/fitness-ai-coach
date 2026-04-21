import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate, validateIdParam } from "../middleware/validate.js";
import {
  createTemplateSchema,
  updateTemplateSchema,
  addTemplateExerciseSchema,
  createFromWorkoutSchema,
} from "../middleware/schemas.js";
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
router.post("/from-workout/:workoutId", validateIdParam("workoutId"), validate(createFromWorkoutSchema), createFromWorkout);

// GET  /api/templates
router.get("/", getTemplates);

// POST /api/templates
router.post("/", validate(createTemplateSchema), createTemplate);

// GET  /api/templates/:id
router.get("/:id", validateIdParam(), getTemplate);

// PUT  /api/templates/:id
router.put("/:id", validateIdParam(), validate(updateTemplateSchema), updateTemplate);

// DELETE /api/templates/:id
router.delete("/:id", validateIdParam(), deleteTemplate);

// POST   /api/templates/:id/exercises
router.post("/:id/exercises", validateIdParam(), validate(addTemplateExerciseSchema), addExercise);

// PUT    /api/templates/:id/exercises/:exerciseId
router.put("/:id/exercises/:exerciseId", validateIdParam(), validateIdParam("exerciseId"), updateExercise);

// DELETE /api/templates/:id/exercises/:exerciseId
router.delete("/:id/exercises/:exerciseId", validateIdParam(), validateIdParam("exerciseId"), removeExercise);

export default router;
