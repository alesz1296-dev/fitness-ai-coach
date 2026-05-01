import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  listCustomExercises,
  createCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
} from "../controllers/customExerciseController.js";

const router = Router();
router.use(authenticate);

router.get   ("/",    listCustomExercises);
router.post  ("/",    createCustomExercise);
router.put   ("/:id", updateCustomExercise);
router.delete("/:id", deleteCustomExercise);

export default router;
