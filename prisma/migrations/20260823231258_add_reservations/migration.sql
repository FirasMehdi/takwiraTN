-- CreateEnum
CREATE TYPE "ReservationStatut" AS ENUM ('confirmee', 'annulee');

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "terrainId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "statut" "ReservationStatut" NOT NULL DEFAULT 'confirmee',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");

-- CreateIndex
CREATE INDEX "Reservation_terrainId_date_idx" ON "Reservation"("terrainId", "date");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "Terrain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Un index unique partiel : l'unicité ne porte que sur les réservations
-- actives, pour qu'un créneau annulé redevienne réservable par quelqu'un
-- d'autre. Prisma ne peut pas exprimer un index partiel dans le schéma —
-- cette ligne est écrite à la main, comme les migrations Terrain et
-- sessionVersion avant elle. C'est la garantie de dernier recours contre
-- une course entre deux requêtes simultanées sur le même créneau.
CREATE UNIQUE INDEX "Reservation_slot_actif_key"
  ON "Reservation" ("terrainId", "date", "heureDebut")
  WHERE "statut" = 'confirmee';
