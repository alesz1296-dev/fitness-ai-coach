import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { foodSearch, exerciseSearch } from "../controllers/searchController.js";

const router = Router();
router.use(authenticate);

router.get("/foods",     foodSearch);
router.get("/exercises", exerciseSearch);

export default router;
