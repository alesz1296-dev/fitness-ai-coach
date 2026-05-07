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
  createInvite,
  createProposal,
  getClientOverview,
  getMyClients,
  listMyPendingProposals,
  listProposalsForClient,
} from "../controllers/coachController.js";

const router = Router();
router.use(authenticate);

router.post("/accept-invite", validate(acceptCoachInviteSchema), acceptInvite);
router.get("/proposals/pending", listMyPendingProposals);
router.post("/proposals/:id/action", validate(coachProposalActionSchema), actOnProposal);

router.use(requireRole("coach", "admin", "developer"));
router.get("/clients", getMyClients);
router.post("/invites", validate(createCoachInviteSchema), createInvite);
router.get("/clients/:clientId", requireCoachClientAccess(), getClientOverview);
router.get("/clients/:clientId/proposals", requireCoachClientAccess(), listProposalsForClient);
router.post("/proposals", validate(createCoachProposalSchema), createProposal);

export default router;
