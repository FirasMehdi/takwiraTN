-- Wave 1 foundation: multi-format terrain pricing, unified conversations, notifications.
-- Every backfilled row below is a one-time migration artifact — ids use
-- gen_random_uuid() (built into Postgres 13+, no extension needed) rather
-- than cuid() purely because this runs in plain SQL, not Prisma; the id
-- column is untyped TEXT so this has no functional effect.

-- 1. Multi-format terrain pricing/capacity ----------------------------------

CREATE TYPE "FormatEquipe" AS ENUM ('quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'onze');

CREATE TABLE "TerrainFormatOffre" (
    "id" TEXT NOT NULL,
    "terrainId" TEXT NOT NULL,
    "format" "FormatEquipe" NOT NULL,
    "capacite" INTEGER NOT NULL,
    "prixParCreneau" INTEGER NOT NULL,
    CONSTRAINT "TerrainFormatOffre_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TerrainFormatOffre_terrainId_format_key" ON "TerrainFormatOffre"("terrainId", "format");
CREATE INDEX "TerrainFormatOffre_terrainId_idx" ON "TerrainFormatOffre"("terrainId");

ALTER TABLE "TerrainFormatOffre" ADD CONSTRAINT "TerrainFormatOffre_terrainId_fkey"
  FOREIGN KEY ("terrainId") REFERENCES "Terrain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one offer per existing terrain from its old scalar format/price.
-- Capacity is derived from the old format label (standard squad sizing).
INSERT INTO "TerrainFormatOffre" ("id", "terrainId", "format", "capacite", "prixParCreneau")
SELECT
  gen_random_uuid()::text,
  "id",
  "format"::text::"FormatEquipe",
  CASE "format"::text
    WHEN 'cinq' THEN 10
    WHEN 'sept' THEN 14
    WHEN 'onze' THEN 22
    ELSE 10
  END,
  "prixParCreneau"
FROM "Terrain";

ALTER TABLE "Terrain" DROP COLUMN "format";
ALTER TABLE "Terrain" DROP COLUMN "prixParCreneau";
DROP TYPE "TerrainFormat";

-- 2. Unified conversations ---------------------------------------------------

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "estGroupe" BOOLEAN NOT NULL DEFAULT false,
    "nom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message" ADD COLUMN "conversationId" TEXT;

-- One conversation per unique unordered pair of (expediteur, destinataire)
-- that has ever exchanged a message, seeded from the existing Message rows.
CREATE TEMP TABLE "_pair_conversation" AS
SELECT
  LEAST("expediteurId", "destinataireId") AS "userA",
  GREATEST("expediteurId", "destinataireId") AS "userB",
  gen_random_uuid()::text AS "conversationId",
  MIN("createdAt") AS "createdAt"
FROM "Message"
WHERE "expediteurId" != "destinataireId"
GROUP BY LEAST("expediteurId", "destinataireId"), GREATEST("expediteurId", "destinataireId");

INSERT INTO "Conversation" ("id", "estGroupe", "createdAt")
SELECT "conversationId", false, "createdAt" FROM "_pair_conversation";

INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId", "joinedAt")
SELECT gen_random_uuid()::text, "conversationId", "userA", "createdAt" FROM "_pair_conversation"
UNION ALL
SELECT gen_random_uuid()::text, "conversationId", "userB", "createdAt" FROM "_pair_conversation";

UPDATE "Message" m
SET "conversationId" = pc."conversationId"
FROM "_pair_conversation" pc
WHERE LEAST(m."expediteurId", m."destinataireId") = pc."userA"
  AND GREATEST(m."expediteurId", m."destinataireId") = pc."userB";

DROP TABLE "_pair_conversation";

ALTER TABLE "Message" ALTER COLUMN "conversationId" SET NOT NULL;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

ALTER TABLE "Message" DROP CONSTRAINT "Message_destinataireId_fkey";
DROP INDEX IF EXISTS "Message_expediteurId_destinataireId_idx";
DROP INDEX IF EXISTS "Message_destinataireId_expediteurId_idx";
ALTER TABLE "Message" DROP COLUMN "destinataireId";
CREATE INDEX "Message_expediteurId_idx" ON "Message"("expediteurId");

-- 3. Notifications ------------------------------------------------------------

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "lien" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_lu_idx" ON "Notification"("userId", "lu");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
