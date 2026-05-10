CREATE TABLE IF NOT EXISTS "CoachProposalComment" (
  "id" SERIAL PRIMARY KEY,
  "proposalId" INTEGER NOT NULL,
  "authorUserId" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("proposalId") REFERENCES "CoachProposal"("id") ON DELETE CASCADE,
  FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_coachproposalcomment_proposal_createdat" ON "CoachProposalComment" ("proposalId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_coachproposalcomment_author_createdat" ON "CoachProposalComment" ("authorUserId", "createdAt");
