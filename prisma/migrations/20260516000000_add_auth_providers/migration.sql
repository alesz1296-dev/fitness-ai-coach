CREATE TABLE "AuthProvider" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "email" TEXT,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuthProvider_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthProvider_provider_providerUserId_key" ON "AuthProvider"("provider", "providerUserId");
CREATE INDEX "AuthProvider_userId_idx" ON "AuthProvider"("userId");
CREATE INDEX "AuthProvider_provider_email_idx" ON "AuthProvider"("provider", "email");

ALTER TABLE "AuthProvider"
ADD CONSTRAINT "AuthProvider_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
