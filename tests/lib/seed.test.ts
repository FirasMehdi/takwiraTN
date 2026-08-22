import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { seedTerrains } from "../../prisma/seed";

describe("seedTerrains", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates terrains with opening hours", async () => {
    await seedTerrains(prisma);

    const count = await prisma.terrain.count();
    expect(count).toBeGreaterThan(0);

    const avecHoraires = await prisma.terrain.findMany({ include: { horaires: true } });
    expect(avecHoraires.every((t) => t.horaires.length > 0)).toBe(true);
  });

  it("is idempotent — running twice does not duplicate terrains", async () => {
    await seedTerrains(prisma);
    const apresUn = await prisma.terrain.count();

    await seedTerrains(prisma);
    const apresDeux = await prisma.terrain.count();

    expect(apresDeux).toBe(apresUn);
  });

  it("includes a terrain that is closed at least one day of the week", async () => {
    await seedTerrains(prisma);

    const terrains = await prisma.terrain.findMany({ include: { horaires: true } });
    const jamaisOuvertTousLesJours = terrains.some((t) => {
      const jours = new Set(t.horaires.map((h) => h.jourSemaine));
      return jours.size < 7;
    });

    expect(jamaisOuvertTousLesJours).toBe(true);
  });
});
