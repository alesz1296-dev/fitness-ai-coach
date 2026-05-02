-- CreateTable: AgentMessage
-- One row per message (user or assistant) per agent thread.
-- Trim-on-insert in application code keeps this table bounded at ~20 rows
-- per (userId, agentType) thread.

CREATE TABLE "AgentMessage" (
    "id"        SERIAL          NOT NULL,
    "userId"    INTEGER         NOT NULL,
    "agentType" TEXT            NOT NULL,
    "role"      TEXT            NOT NULL,
    "content"   TEXT            NOT NULL,
    "createdAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

-- Index for efficient per-thread queries (userId + agentType + time order)
CREATE INDEX "AgentMessage_userId_agentType_createdAt_idx"
    ON "AgentMessage"("userId", "agentType", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentMessage"
    ADD CONSTRAINT "AgentMessage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
