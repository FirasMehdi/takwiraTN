import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import { findJoueurs, findJoueurById } from "@/lib/joueurs/queries";

async function creerJoueur(
  overrides: {
    email?: string;
    role?: "joueur" | "proprietaire" | "administrateur";
    prenom?: string;
    ville?: string;
    poste?: string | null;
    niveau?: string | null;
    piedPrefere?: string | null;
    telephone?: string | null;
    photoUrl?: string | null;
    bio?: string | null;
  } = {}
) {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `${Math.random().toString(36).slice(2)}@example.com`,
      passwordHash: await hashPassword("motdepasse123"),
      role: overrides.role ?? "joueur",
      profile: {
        create: {
          prenom: overrides.prenom ?? "Sami",
          ville: overrides.ville ?? "Tunis",
          poste: overrides.poste ?? "milieu",
          niveau: overrides.niveau ?? "intermediaire",
          piedPrefere: overrides.piedPrefere,
          telephone: overrides.telephone,
          photoUrl: overrides.photoUrl,
          bio: overrides.bio,
        },
      },
    },
    include: { profile: true },
  });
}

describe("findJoueurs", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns joueur profiles", async () => {
    await creerJoueur({ prenom: "Amine" });

    const resultats = await findJoueurs({});
    expect(resultats).toHaveLength(1);
    expect(resultats[0].prenom).toBe("Amine");
  });

  it("excludes non-joueur roles", async () => {
    await creerJoueur({ role: "proprietaire", prenom: "Owner" });

    const resultats = await findJoueurs({});
    expect(resultats).toHaveLength(0);
  });

  it("filters by ville, case-insensitively", async () => {
    await creerJoueur({ prenom: "A", ville: "Tunis" });
    await creerJoueur({ prenom: "B", ville: "Sfax" });

    const resultats = await findJoueurs({ ville: "tunis" });
    expect(resultats.map((j) => j.prenom)).toEqual(["A"]);
  });

  it("filters by poste", async () => {
    await creerJoueur({ prenom: "A", poste: "gardien" });
    await creerJoueur({ prenom: "B", poste: "attaquant" });

    const resultats = await findJoueurs({ poste: "gardien" });
    expect(resultats.map((j) => j.prenom)).toEqual(["A"]);
  });

  it("never exposes the phone number", async () => {
    await creerJoueur({ telephone: "12345678" });

    const resultats = await findJoueurs({});
    expect(resultats[0]).not.toHaveProperty("telephone");
  });
});

describe("findJoueurById", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns the joueur's public profile", async () => {
    const user = await creerJoueur({ prenom: "Amine", bio: "Défenseur central" });

    const resultat = await findJoueurById(user.id);
    expect(resultat?.prenom).toBe("Amine");
    expect(resultat?.bio).toBe("Défenseur central");
    expect(resultat).not.toHaveProperty("telephone");
  });

  it("returns null for an unknown id", async () => {
    const resultat = await findJoueurById("inconnu");
    expect(resultat).toBeNull();
  });

  it("returns null for a non-joueur role", async () => {
    const user = await creerJoueur({ role: "administrateur" });
    const resultat = await findJoueurById(user.id);
    expect(resultat).toBeNull();
  });
});
