import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  findAdminJoueurs,
  findAdminJoueurById,
  updateAdminJoueur,
  deleteAdminJoueur,
} from "@/lib/admin/joueurs";

async function creerJoueur(email: string, prenom: string, role: "joueur" | "proprietaire" = "joueur") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role,
      ...(role === "joueur"
        ? { profile: { create: { prenom, ville: "Tunis" } } }
        : {}),
    },
  });
}

describe("findAdminJoueurs", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists joueurs with their email", async () => {
    await creerJoueur("amine@example.com", "Amine");
    const resultats = await findAdminJoueurs();
    expect(resultats).toHaveLength(1);
    expect(resultats[0].email).toBe("amine@example.com");
  });

  it("excludes non-joueur roles", async () => {
    await creerJoueur("owner@example.com", "Owner", "proprietaire");
    const resultats = await findAdminJoueurs();
    expect(resultats).toHaveLength(0);
  });

  it("filters by email substring, case-insensitively", async () => {
    await creerJoueur("amine@example.com", "Amine");
    await creerJoueur("sami@example.com", "Sami");
    const resultats = await findAdminJoueurs("AMINE");
    expect(resultats.map((r) => r.email)).toEqual(["amine@example.com"]);
  });

  it("filters by prenom substring", async () => {
    await creerJoueur("a@example.com", "Amine");
    await creerJoueur("b@example.com", "Sami");
    const resultats = await findAdminJoueurs("sam");
    expect(resultats.map((r) => r.prenom)).toEqual(["Sami"]);
  });
});

describe("findAdminJoueurById", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns the full detail including telephone", async () => {
    const user = await prisma.user.create({
      data: {
        email: "detail@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "Amine", ville: "Sousse", telephone: "20123456" } },
      },
    });
    const detail = await findAdminJoueurById(user.id);
    expect(detail?.telephone).toBe("20123456");
  });

  it("returns null for an unknown id", async () => {
    expect(await findAdminJoueurById("inconnu")).toBeNull();
  });

  it("returns null for a non-joueur role", async () => {
    const user = await creerJoueur("owner2@example.com", "Owner", "proprietaire");
    expect(await findAdminJoueurById(user.id)).toBeNull();
  });
});

describe("updateAdminJoueur", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("updates the profile fields", async () => {
    const user = await creerJoueur("update@example.com", "Amine");
    const resultat = await updateAdminJoueur(user.id, {
      prenom: "Amine K.",
      ville: "Sfax",
      poste: null,
      niveau: null,
      piedPrefere: null,
      telephone: null,
      bio: null,
    });
    expect(resultat).toEqual({ ok: true });

    const profil = await prisma.playerProfile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(profil.prenom).toBe("Amine K.");
    expect(profil.ville).toBe("Sfax");
  });

  it("returns introuvable for an unknown id", async () => {
    const resultat = await updateAdminJoueur("inconnu", {
      prenom: "X",
      ville: "Y",
      poste: null,
      niveau: null,
      piedPrefere: null,
      telephone: null,
      bio: null,
    });
    expect(resultat).toEqual({ ok: false, raison: "introuvable" });
  });
});

describe("deleteAdminJoueur", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("deletes the user and cascades the profile", async () => {
    const user = await creerJoueur("delete@example.com", "Amine");
    const resultat = await deleteAdminJoueur(user.id);
    expect(resultat).toEqual({ ok: true });

    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await prisma.playerProfile.findUnique({ where: { userId: user.id } })).toBeNull();
  });

  it("returns introuvable for an unknown id", async () => {
    expect(await deleteAdminJoueur("inconnu")).toEqual({ ok: false, raison: "introuvable" });
  });
});
