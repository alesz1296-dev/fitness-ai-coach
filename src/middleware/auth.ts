import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../lib/logger.js";
import { env } from "../config/env.js";
import prisma from "../lib/prisma.js";

const JWT_SECRET = env.JWT_SECRET;

const db = prisma as any;

export type AppRole = "user" | "coach" | "admin" | "developer";
export type PermissionFlag =
  | "manage_users"
  | "manage_relationships"
  | "manage_content"
  | "view_system_analytics"
  | "feature_flags"
  | "impersonate"
  | "repair_data";

function parsePermissionFlags(raw: unknown): PermissionFlag[] {
  if (Array.isArray(raw)) return raw as PermissionFlag[];
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PermissionFlag[]) : [];
  } catch {
    return [];
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: AppRole;
    permissionFlags: PermissionFlag[];
    actualUserId: number;
    actualEmail: string;
    impersonationTargetUserId?: number | null;
    impersonationSessionToken?: string | null;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
    };

    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, permissionFlags: true },
    });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    let effectiveId = user.id;
    let effectiveEmail = user.email;
    let impersonationTargetUserId: number | null = null;
    let impersonationSessionToken: string | null = null;
    const actorRole = (user.role ?? "user") as AppRole;
    const permissionFlags = parsePermissionFlags(user.permissionFlags);

    const impersonationToken = req.header("X-Impersonation-Session");
    if (
      impersonationToken &&
      (actorRole === "admin" || actorRole === "developer") &&
      permissionFlags.includes("impersonate")
    ) {
      const session = await db.impersonationSession.findFirst({
        where: {
          token: impersonationToken,
          actorUserId: user.id,
          status: "active",
        },
        include: {
          target: { select: { id: true, email: true } },
        },
      });
      if (session?.target) {
        effectiveId = session.target.id;
        effectiveEmail = session.target.email;
        impersonationTargetUserId = session.target.id;
        impersonationSessionToken = session.token;
      }
    }

    req.user = {
      id: effectiveId,
      email: effectiveEmail,
      role: actorRole,
      permissionFlags,
      actualUserId: user.id,
      actualEmail: user.email,
      impersonationTargetUserId,
      impersonationSessionToken,
    };
    next();
  } catch (error) {
    logger.warn(`Invalid token attempt: ${error}`);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const requireRole =
  (...roles: AppRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };

export const requirePermission =
  (...flags: PermissionFlag[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (
      !req.user ||
      !flags.every((flag) => req.user!.permissionFlags.includes(flag))
    ) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };

export const requireCoachClientAccess =
  (paramName = "clientId") =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const raw = req.params[paramName];
    const clientId = Number(raw);
    if (!req.user || !Number.isInteger(clientId) || clientId < 1) {
      res.status(400).json({ error: "Invalid client id" });
      return;
    }
    if (req.user.role === "admin" || req.user.role === "developer") {
      next();
      return;
    }
    if (req.user.role !== "coach") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const link = await db.coachClientLink.findFirst({
      where: {
        coachId: req.user.id,
        clientId,
        status: "active",
      },
    });
    if (!link) {
      res.status(403).json({ error: "No access to this client" });
      return;
    }
    next();
  };
