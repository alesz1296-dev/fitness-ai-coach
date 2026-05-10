import { Router } from "express";
import {
  authenticate,
  requirePermission,
  requireRole,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateUserRoleSchema } from "../middleware/schemas.js";
import {
  getAdminSummary,
  getContentSummary,
  getUserDetail,
  getUserWorkspace,
  listAuditLogs,
  listFeatureFlags,
  listRelationships,
  runRepairAction,
  searchUsers,
  startCoachTestAccess,
  startImpersonation,
  stopImpersonation,
  upsertFeatureFlag,
  updateUserRole,
} from "../controllers/adminController.js";

const router = Router();
router.use(authenticate);
router.use(requireRole("admin", "developer"));

router.get("/summary", getAdminSummary);
router.get("/audit", requirePermission("manage_users"), listAuditLogs);
router.post("/impersonation/start", requirePermission("impersonate"), startImpersonation);
router.post("/impersonation/stop", requirePermission("impersonate"), stopImpersonation);
router.post("/coach-test/start", requirePermission("manage_relationships"), startCoachTestAccess);
router.get("/feature-flags", requirePermission("feature_flags"), listFeatureFlags);
router.put("/feature-flags", requirePermission("feature_flags"), upsertFeatureFlag);
router.get("/content/summary", requirePermission("manage_content"), getContentSummary);
router.post("/repair", requirePermission("repair_data"), runRepairAction);
router.get("/users", requirePermission("manage_users"), searchUsers);
router.get("/users/:userId", requirePermission("manage_users"), getUserDetail);
router.get(
  "/users/:userId/workspace",
  requirePermission("manage_users"),
  getUserWorkspace,
);
router.put(
  "/users/:userId/role",
  requirePermission("manage_users"),
  validate(updateUserRoleSchema),
  updateUserRole,
);
router.get(
  "/relationships",
  requirePermission("manage_relationships"),
  listRelationships,
);

export default router;
