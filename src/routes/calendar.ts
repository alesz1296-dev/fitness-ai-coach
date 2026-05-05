import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { idempotency } from "../middleware/idempotency.js";
import { validate } from "../middleware/validate.js";
import {
  populateCalendarSchema,
  swapCalendarDaysSchema,
  updateCalendarDaySchema,
} from "../middleware/schemas.js";
import {
  getCalendarMonth,
  populateCalendar,
  updateCalendarDay,
  deleteCalendarDay,
  swapCalendarDays,
  clearCalendarMonth,
} from "../controllers/calendarController.js";

const router = Router();
router.use(authenticate);
router.use(idempotency);

router.get("/", getCalendarMonth);
router.post("/populate", validate(populateCalendarSchema), populateCalendar);
router.post("/swap", validate(swapCalendarDaysSchema), swapCalendarDays);
router.delete("/clear", clearCalendarMonth);
router.put("/:date", validate(updateCalendarDaySchema), updateCalendarDay);
router.delete("/:date", deleteCalendarDay);

export default router;
