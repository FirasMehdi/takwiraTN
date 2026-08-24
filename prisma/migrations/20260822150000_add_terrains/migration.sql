-- CreateEnum
CREATE TYPE "TerrainType" AS ENUM ('gazon_synthetique', 'gazon_naturel', 'beton');

-- CreateEnum
CREATE TYPE "TerrainFormat" AS ENUM ('cinq', 'sept', 'onze');

-- CreateEnum
CREATE TYPE "TerrainStatut" AS ENUM ('actif', 'en_attente', 'suspendu');

-- CreateTable
CREATE TABLE "Terrain" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "type" "TerrainType" NOT NULL,
    "format" "TerrainFormat" NOT NULL,
    "prixParCreneau" INTEGER NOT NULL,
    "dureeCreneauMinutes" INTEGER NOT NULL DEFAULT 90,
    "equipements" TEXT[],
    "photos" TEXT[],
    "statut" "TerrainStatut" NOT NULL DEFAULT 'actif',
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Terrain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerrainHoraire" (
    "id" TEXT NOT NULL,
    "terrainId" TEXT NOT NULL,
    "jourSemaine" INTEGER NOT NULL,
    "ouvre" TEXT NOT NULL,
    "ferme" TEXT NOT NULL,

    CONSTRAINT "TerrainHoraire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Terrain_ville_idx" ON "Terrain"("ville");

-- CreateIndex
CREATE INDEX "Terrain_statut_idx" ON "Terrain"("statut");

-- CreateIndex
CREATE INDEX "TerrainHoraire_terrainId_jourSemaine_idx" ON "TerrainHoraire"("terrainId", "jourSemaine");

-- AddForeignKey
ALTER TABLE "Terrain" ADD CONSTRAINT "Terrain_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerrainHoraire" ADD CONSTRAINT "TerrainHoraire_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "Terrain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
