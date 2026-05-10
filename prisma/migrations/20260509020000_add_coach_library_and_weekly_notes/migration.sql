ALTER TABLE "WeeklyReview" ADD COLUMN IF NOT EXISTS "coachNote" TEXT;

CREATE TABLE IF NOT EXISTS "CoachLibraryFavorite" (
  "id" SERIAL PRIMARY KEY,
  "coachId" INTEGER NOT NULL,
  "itemType" TEXT NOT NULL,
  "sourceId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE ("coachId", "itemType", "sourceId")
);

CREATE INDEX IF NOT EXISTS "idx_coachlibraryfavorite_coach_itemtype"
  ON "CoachLibraryFavorite" ("coachId", "itemType");
