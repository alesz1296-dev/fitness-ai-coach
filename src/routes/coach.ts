import { Router } from "express";
import {
  authenticate,
  requireCoachClientAccess,
  requireRole,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  acceptCoachInviteSchema,
  coachProposalActionSchema,
  createCoachInviteSchema,
  createCoachProposalSchema,
} from "../middleware/schemas.js";
import {
  acceptInvite,
  actOnProposal,
  addProposalComment,
  createInvite,
  createProposal,
  getCoachDashboard,
  getCoachLibrary,
  getClientOverview,
  getMyClients,
  listMyPendingProposals,
  listProposalsForClient,
  toggleCoachLibraryFavorite,
  updateWeeklyReviewNote,
} from "../controllers/coachController.js";

const router = Router();
router.use(authenticate);

router.post("/accept-invite", validate(acceptCoachInviteSchema), acceptInvite);
router.get("/proposals/pending", listMyPendingProposals);
router.post("/proposals/:id/action", validate(coachProposalActionSchema), actOnProposal);
router.post("/proposals/:id/comments", addProposalComment);

router.use(requireRole("coach", "admin", "developer"));
router.get("/dashboard", getCoachDashboard);
router.get("/clients", getMyClients);
router.get("/library", getCoachLibrary);
router.post("/library/favorite", toggleCoachLibraryFavorite);
router.post("/invites", validate(createCoachInviteSchema), createInvite);
router.get("/clients/:clientId", requireCoachClientAccess(), getClientOverview);
router.get("/clients/:clientId/proposals", requireCoachClientAccess(), listProposalsForClient);
router.put("/clients/:clientId/weekly-reviews/:weekStart/note", updateWeeklyReviewNote);
router.post("/proposals", validate(createCoachProposalSchema), createProposal);

export default router;
