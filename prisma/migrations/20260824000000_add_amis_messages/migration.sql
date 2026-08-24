-- CreateEnum
CREATE TYPE "StatutAmitie" AS ENUM ('en_attente', 'acceptee', 'refusee');

-- CreateTable
CREATE TABLE "Amitie" (
    "id" TEXT NOT NULL,
    "demandeurId" TEXT NOT NULL,
    "destinataireId" TEXT NOT NULL,
    "statut" "StatutAmitie" NOT NULL DEFAULT 'en_attente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Amitie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "expediteurId" TEXT NOT NULL,
    "destinataireId" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "luAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Amitie_destinataireId_statut_idx" ON "Amitie"("destinataireId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Amitie_demandeurId_destinataireId_key" ON "Amitie"("demandeurId", "destinataireId");

-- CreateIndex
CREATE INDEX "Message_expediteurId_destinataireId_idx" ON "Message"("expediteurId", "destinataireId");

-- CreateIndex
CREATE INDEX "Message_destinataireId_expediteurId_idx" ON "Message"("destinataireId", "expediteurId");

-- AddForeignKey
ALTER TABLE "Amitie" ADD CONSTRAINT "Amitie_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amitie" ADD CONSTRAINT "Amitie_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_expediteurId_fkey" FOREIGN KEY ("expediteurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

