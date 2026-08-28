import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { promouvoirAdmin } from "../../scripts/promouvoir-admin";

describe("promouvoirAdmin", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("promotes an existing user to administrateur", async () => {
    const user = await prisma.user.create({
      data: {
        email: "futur-admin@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "Test", ville: "Tunis" } },
      },
    });

    const resultat = await promouvoirAdmin("futur-admin@example.com", prisma);
    expect(resultat).toEqual({ ok: true, email: "futur-admin@example.com" });

    const misAJour = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(misAJour.role).toBe("administrateur");
  });

  it("returns introuvable for an unknown email", async () => {
    const resultat = await promouvoirAdmin("inconnu@example.com", prisma);
    expect(resultat).toEqual({ ok: false, raison: "introuvable" });
  });

  it("does not change the role of unrelated users", async () => {
    await prisma.user.create({
      data: {
        email: "autre@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "Autre", ville: "Sfax" } },
      },
    });
    const cible = await prisma.user.create({
      data: {
        email: "cible@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "Cible", ville: "Tunis" } },
      },
    });

    await promouvoirAdmin("cible@example.com", prisma);

    const autre = await prisma.user.findUniqueOrThrow({ where: { email: "autre@example.com" } });
    expect(autre.role).toBe("joueur");
    const misAJour = await prisma.user.findUniqueOrThrow({ where: { id: cible.id } });
    expect(misAJour.role).toBe("administrateur");
  });
});
