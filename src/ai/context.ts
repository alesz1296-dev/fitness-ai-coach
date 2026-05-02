import prisma from "../lib/prisma.js";
import type { UserContext } from "./prompts.js";
import type { ChatMessage } from "./agent.js";
import type { AgentType } from "./prompts.js";

// AgentMessage is a new Prisma model added in migration 20260502000000.
// Until `prisma generate` is run locally, the generated client won't include it.
// The cast below keeps the codebase compilable in all environments; remove it
// (or leave it -- it's harmless) after running `prisma generate`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// ---------------------------------------------------------------------------
// buildUserContext
//
// Loads the user profile from DB and returns a fully-typed UserContext.
// Centralises the profile query so chatController, proactive scheduler,
// goal advisor, and any future server-side trigger can all call one function.
//
// Returns null if the user doesn't exist.
// ---------------------------------------------------------------------------

export async function buildUserContext(
  userId: number,
  language = "en",
): Promise<(UserContext & { id: number }) | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      age: true,
      weight: true,
      height: true,
      fitnessLevel: true,
      goal: true,
      sex: true,
      activityLevel: true,
      proteinMultiplier: true,
      trainingDaysPerWeek: true,
      trainingHoursPerDay: true,
      injuries: true,
      waterTargetMl: true,
    },
  });

  if (!user) return null;

  return { ...user, language };
}

// ---------------------------------------------------------------------------
// Agent conversation memory helpers
//
// loadAgentHistory  -- fetch last N messages for a thread (userId + agentType)
// saveAgentExchange -- write user + assistant rows, then trim to MAX_MESSAGES
//
// AgentMessage is the agent working memory; separate from the Conversation
// table which drives the chat UI history display.
// ---------------------------------------------------------------------------

const MAX_MESSAGES = 20; // per (userId, agentType) thread

export async function loadAgentHistory(
  userId: number,
  agentType: AgentType,
): Promise<ChatMessage[]> {
  const rows: Array<{ role: string; content: string }> =
    await db.agentMessage.findMany({
      where: { userId, agentType },
      orderBy: { createdAt: "asc" },
      take: MAX_MESSAGES,
      select: { role: true, content: true },
    });

  return rows.map((r) => ({
    role: r.role as "user" | "assistant",
    content: r.content,
  }));
}

export async function saveAgentExchange(
  userId: number,
  agentType: AgentType,
  userMessage: string,
  assistantReply: string,
): Promise<void> {
  // Write both messages in a single transaction
  await prisma.$transaction([
    db.agentMessage.create({
      data: { userId, agentType, role: "user", content: userMessage },
    }),
    db.agentMessage.create({
      data: { userId, agentType, role: "assistant", content: assistantReply },
    }),
  ]);

  // Trim oldest rows so the thread never exceeds MAX_MESSAGES.
  const count: number = await db.agentMessage.count({
    where: { userId, agentType },
  });

  if (count > MAX_MESSAGES) {
    const excess = count - MAX_MESSAGES;
    const oldest: Array<{ id: number }> = await db.agentMessage.findMany({
      where: { userId, agentType },
      orderBy: { createdAt: "asc" },
      take: excess,
      select: { id: true },
    });
    await db.agentMessage.deleteMany({
      where: { id: { in: oldest.map((r) => r.id) } },
    });
  }
}
