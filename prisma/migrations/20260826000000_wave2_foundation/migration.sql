-- Wave 2 foundation: match lifecycle fields (format, organizer participation,
-- linked group chat, linked booking, reminder flag) and a unified
-- cancellation record spanning both matches and reservations.
--
-- Purely additive: no columns dropped, no data backfilled. Existing Match
-- rows get organisateurParticipe=true (matches current behaviour — the
-- organizer has always been auto-joined as a participant) and
-- rappelEnvoye=false (safe: no reminder has been sent for them). format,
-- conversationId, and reservationId stay NULL on existing rows; the
-- application treats a NULL format as "unspecified" for legacy matches and
-- always sets it on new ones, and lazily creates a group conversation for a
-- legacy match on first access rather than backfilling one for every row.

ALTER TABLE "Match" ADD COLUMN "format" "FormatEquipe";
ALTER TABLE "Match" ADD COLUMN "organisateurParticipe" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Match" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "Match" ADD COLUMN "reservationId" TEXT;
ALTER TABLE "Match" ADD COLUMN "rappelEnvoye" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Match_conversationId_key" ON "Match"("conversationId");
CREATE UNIQUE INDEX "Match_reservationId_key" ON "Match"("reservationId");

ALTER TABLE "Match" ADD CONSTRAINT "Match_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "RaisonAnnulation" AS ENUM ('personnel', 'pas_assez_joueurs', 'conflit_horaire', 'terrain_indisponible', 'autre');

CREATE TABLE "Annulation" (
    "id" TEXT NOT NULL,
    "matchId" TEXT,
    "reservationId" TEXT,
    "userId" TEXT NOT NULL,
    "raison" "RaisonAnnulation" NOT NULL,
    "raisonAutre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Annulation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Annulation_exactly_one_target" CHECK ((("matchId" IS NOT NULL)::int + ("reservationId" IS NOT NULL)::int) = 1)
);

CREATE UNIQUE INDEX "Annulation_matchId_key" ON "Annulation"("matchId");
CREATE UNIQUE INDEX "Annulation_reservationId_key" ON "Annulation"("reservationId");
CREATE INDEX "Annulation_userId_idx" ON "Annulation"("userId");

ALTER TABLE "Annulation" ADD CONSTRAINT "Annulation_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Annulation" ADD CONSTRAINT "Annulation_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Annulation" ADD CONSTRAINT "Annulation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
