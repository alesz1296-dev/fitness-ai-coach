-- AlterTable: add profileComplete to User
ALTER TABLE "User" ADD COLUMN "profileComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add metadata to Conversation
ALTER TABLE "Conversation" ADD COLUMN "metadata" TEXT;
