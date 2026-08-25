import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";

describe("terrain schema", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a terrain with its opening hours", async () => {
    const terrain = await prisma.terrain.create({
      data: {
        nom: "Complexe El Menzah",
        adresse: "Rue de Rome",
        ville: "Tunis",
        type: "gazon_synthetique",
        formats: { create: [{ format: "cinq", capacite: 10, prixParCreneau: 60000 }] },
        equipements: ["vestiaires", "eclairage"],
        photos: [],
        horaires: {
          create: [
            { jourSemaine: 1, ouvre: "08:00", ferme: "22:00" },
            { jourSemaine: 2, ouvre: "08:00", ferme: "22:00" },
          ],
        },
      },
      include: { horaires: true },
    });

    expect(terrain.statut).toBe("actif");
    expect(terrain.dureeCreneauMinutes).toBe(90);
    expect(terrain.horaires).toHaveLength(2);
  });

  it("deletes opening hours when the terrain is deleted", async () => {
    const terrain = await prisma.terrain.create({
      data: {
        nom: "Stade Sfax",
        adresse: "Avenue Habib Bourguiba",
        ville: "Sfax",
        type: "beton",
        formats: { create: [{ format: "sept", capacite: 14, prixParCreneau: 45000 }] },
        equipements: [],
        photos: [],
        horaires: { create: [{ jourSemaine: 5, ouvre: "09:00", ferme: "23:00" }] },
      },
    });

    await prisma.terrain.delete({ where: { id: terrain.id } });

    const orphans = await prisma.terrainHoraire.findMany({
      where: { terrainId: terrain.id },
    });
    expect(orphans).toHaveLength(0);
  });

  it("resetDb clears terrains between tests", async () => {
    expect(await prisma.terrain.count()).toBe(0);
  });
});
