import { NextFunction, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";
import type { AuthRequest } from "./auth.js";

type IdempotencyRow = {
  id: number;
  userId: number;
  key: string;
  method: string;
  path: string;
  requestHash: string;
  status: string;
  responseStatus: number | null;
  responseBody: string | null;
  responseContentType: string | null;
};

type StoredResponse = {
  status: number;
  body: string | null;
  contentType: string | null;
};

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const normalize = (input: unknown): unknown => {
    if (input === null || typeof input !== "object") return input;
    if (input instanceof Date) return input.toISOString();
    if (Array.isArray(input)) return input.map((item) => normalize(item));
    if (seen.has(input as object)) return null;
    seen.add(input as object);

    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input as Record<string, unknown>).sort()) {
      out[key] = normalize((input as Record<string, unknown>)[key]);
    }
    return out;
  };

  return JSON.stringify(normalize(value));
}

function hashRequest(req: AuthRequest): string {
  const payload = {
    method: req.method,
    path: req.originalUrl,
    body: req.body ?? null,
  };
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function serializeBody(body: unknown): string | null {
  if (body == null) return null;
  if (typeof body === "string") return body;
  if (Buffer.isBuffer(body)) return body.toString("utf8");
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

function parseStoredBody(body: string | null, contentType: string | null): unknown {
  if (body == null) return null;
  if (contentType?.includes("application/json")) {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function sendStoredResponse(res: Response, stored: StoredResponse): void {
  if (stored.status === 204 || stored.body == null || stored.body === "") {
    res.status(stored.status).end();
    return;
  }

  const parsed = parseStoredBody(stored.body, stored.contentType);
  if (stored.contentType?.includes("application/json") || typeof parsed === "object") {
    res.status(stored.status).json(parsed);
    return;
  }

  res.status(stored.status);
  if (stored.contentType) res.type(stored.contentType);
  res.send(parsed as string);
}

function isReplayableMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

async function findRecord(userId: number, key: string): Promise<IdempotencyRow | null> {
  const rows = await prisma.$queryRaw<IdempotencyRow[]>`
    SELECT
      "id",
      "userId",
      "key",
      "method",
      "path",
      "requestHash",
      "status",
      "responseStatus",
      "responseBody",
      "responseContentType"
    FROM "IdempotencyRecord"
    WHERE "userId" = ${userId} AND "key" = ${key}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function createRecord(row: {
  userId: number;
  key: string;
  method: string;
  path: string;
  requestHash: string;
}): Promise<IdempotencyRow | null> {
  const rows = await prisma.$queryRaw<IdempotencyRow[]>`
    INSERT INTO "IdempotencyRecord" (
      "userId",
      "key",
      "method",
      "path",
      "requestHash",
      "status",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${row.userId},
      ${row.key},
      ${row.method},
      ${row.path},
      ${row.requestHash},
      'pending',
      NOW(),
      NOW()
    )
    ON CONFLICT ("userId", "key") DO NOTHING
    RETURNING
      "id",
      "userId",
      "key",
      "method",
      "path",
      "requestHash",
      "status",
      "responseStatus",
      "responseBody",
      "responseContentType"
  `;
  return rows[0] ?? null;
}

async function updateRecord(userId: number, key: string, stored: StoredResponse): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "IdempotencyRecord"
    SET
      "status" = 'completed',
      "responseStatus" = ${stored.status},
      "responseBody" = ${stored.body},
      "responseContentType" = ${stored.contentType},
      "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND "key" = ${key}
  `;
}

export const idempotency = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!isReplayableMethod(req.method) || !req.user?.id) {
    next();
    return;
  }

  const rawKey = req.header("X-Idempotency-Key") ?? req.header("x-idempotency-key");
  if (!rawKey) {
    next();
    return;
  }

  const key = rawKey.trim();
  if (!key) {
    next();
    return;
  }

  const requestHash = hashRequest(req);
  const method = req.method.toUpperCase();
  const path = req.originalUrl;

  try {
    const existing = await findRecord(req.user.id, key);

    if (existing) {
      const sameRequest =
        existing.method === method &&
        existing.path === path &&
        existing.requestHash === requestHash;

      if (!sameRequest) {
        res.status(409).json({
          error: "Idempotency key already used for a different request.",
        });
        return;
      }

      if (existing.status === "completed") {
        sendStoredResponse(res, {
          status: existing.responseStatus ?? 200,
          body: existing.responseBody,
          contentType: existing.responseContentType,
        });
        return;
      }

      res.status(409).json({
        error: "Request is still processing. Please retry shortly.",
      });
      return;
    }

    const created = await createRecord({
      userId: req.user.id,
      key,
      method,
      path,
      requestHash,
    });

    if (!created) {
      const retry = await findRecord(req.user.id, key);
      if (retry) {
        const sameRequest =
          retry.method === method &&
          retry.path === path &&
          retry.requestHash === requestHash;

        if (!sameRequest) {
          res.status(409).json({
            error: "Idempotency key already used for a different request.",
          });
          return;
        }

        if (retry.status === "completed") {
          sendStoredResponse(res, {
            status: retry.responseStatus ?? 200,
            body: retry.responseBody,
            contentType: retry.responseContentType,
          });
          return;
        }

        res.status(409).json({
          error: "Request is still processing. Please retry shortly.",
        });
        return;
      }
    }
  } catch (error: unknown) {
    logger.warn(`Idempotency middleware failed: ${String(error)}`);
    next();
    return;
  }

  let capturedBody: unknown = null;
  let capturedContentType: string | null = null;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = ((body: unknown) => {
    capturedBody = body;
    capturedContentType = "application/json";
    return originalJson(body);
  }) as typeof res.json;

  res.send = ((body: unknown) => {
    capturedBody = body;
    const header = res.getHeader("content-type");
    if (typeof header === "string") capturedContentType = header;
    return originalSend(body as never);
  }) as typeof res.send;

  res.on("finish", () => {
    void updateRecord(req.user!.id, key, {
      status: res.statusCode,
      body: serializeBody(capturedBody),
      contentType: capturedContentType,
    }).catch((error: unknown) => {
      logger.warn(`Failed to persist idempotency response: ${String(error)}`);
    });
  });

  next();
};
