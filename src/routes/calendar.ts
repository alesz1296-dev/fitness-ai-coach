import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
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

router.get("/",          getCalendarMonth);   // GET  /api/calendar?month=YYYY-MM
router.post("/populate", populateCalendar);   // POST /api/calendar/populate
router.post("/swap",     swapCalendarDays);   // POST /api/calendar/swap
router.delete("/clear",  clearCalendarMonth); // DELETE /api/calendar/clear?month=YYYY-MM
router.put("/:date",     updateCalendarDay);  // PUT  /api/calendar/:date
router.delete("/:date",  deleteCalendarDay);  // DELETE /api/calendar/:date

export default router;
