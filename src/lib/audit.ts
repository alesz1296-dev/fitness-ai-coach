import prisma from "./prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

const db = prisma as any;

interface AuditInput {
  req?: AuthRequest;
  actorUserId?: number | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: number | null;
  targetUserId?: number | null;
  metadata?: Record<string, unknown> | null;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    const actorUserId =
      input.actorUserId ?? input.req?.user?.actualUserId ?? input.req?.user?.id ?? null;
    const actorRole =
      input.actorRole ?? input.req?.user?.role ?? "system";

    await db.auditLog.create({
      data: {
        actorUserId,
        actorRole,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        targetUserId: input.targetUserId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.req?.ip ?? null,
        userAgent: input.req?.headers["user-agent"] ?? null,
      },
    });
  } catch {
    // Audit logging should never block the main request path.
  }
}
