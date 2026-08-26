import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  listerTerrainsProprietaire,
  trouverTerrainProprietaire,
  creerTerrain,
  modifierTerrain,
  supprimerTerrain,
} from "@/lib/terrains/gestion";

async function creerProprietaire(email = "owner@example.com") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role: "proprietaire",
      profile: { create: { prenom: "Owner", ville: "Tunis" } },
    },
  });
}

const inputBase = {
  nom: "Terrain Test",
  adresse: "Rue Test",
  ville: "Tunis",
  type: "gazon_synthetique" as const,
};

const formatValide = { format: "cinq" as const, capacite: 10, prixParCreneau: 60000 };
const horaireValide = { jourSemaine: 1, ouvre: "08:00", ferme: "22:00" };

describe("gestion des terrains propriétaire", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("creerTerrain / listerTerrainsProprietaire / trouverTerrainProprietaire", () => {
    it("creates a terrain owned by the given user, en_attente by default", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, {
        ...inputBase,
        formats: [formatValide],
        horaires: [horaireValide],
      });

      const terrain = await prisma.terrain.findUnique({ where: { id } });
      expect(terrain?.ownerId).toBe(owner.id);
      expect(terrain?.statut).toBe("en_attente");
    });

    it("creates the format and horaire rows alongside the terrain", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, {
        ...inputBase,
        formats: [formatValide],
        horaires: [horaireValide],
      });

      const formats = await prisma.terrainFormatOffre.findMany({ where: { terrainId: id } });
      const horaires = await prisma.terrainHoraire.findMany({ where: { terrainId: id } });
      expect(formats).toHaveLength(1);
      expect(horaires).toHaveLength(1);
    });

    it("lists only the calling owner's terrains", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      await creerTerrain(other.id, {
        ...inputBase,
        nom: "Autre",
        formats: [formatValide],
        horaires: [horaireValide],
      });

      const liste = await listerTerrainsProprietaire(owner.id);
      expect(liste).toHaveLength(1);
      expect(liste[0].nom).toBe("Terrain Test");
      expect(liste[0].nombreFormats).toBe(1);
      expect(liste[0].nombreHoraires).toBe(1);
    });

    it("finds a terrain by id only for its owner", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, {
        ...inputBase,
        formats: [formatValide],
        horaires: [horaireValide],
      });

      expect(await trouverTerrainProprietaire(id, owner.id)).not.toBeNull();
      expect(await trouverTerrainProprietaire(id, other.id)).toBeNull();
    });

    it("returns null for a non-existent terrain id", async () => {
      const owner = await creerProprietaire();
      expect(await trouverTerrainProprietaire("inexistant", owner.id)).toBeNull();
    });
  });

  describe("modifierTerrain", () => {
    it("updates the terrain's base fields for its owner", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await modifierTerrain(id, owner.id, { ...inputBase, nom: "Nouveau nom" });
      expect(resultat).toEqual({ ok: true });

      const terrain = await prisma.terrain.findUnique({ where: { id } });
      expect(terrain?.nom).toBe("Nouveau nom");
    });

    it("refuses to update a terrain owned by someone else", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await modifierTerrain(id, other.id, inputBase);
      expect(resultat).toEqual({ ok: false, raison: "non_autorise" });
    });

    it("returns introuvable for a non-existent terrain", async () => {
      const owner = await creerProprietaire();
      const resultat = await modifierTerrain("inexistant", owner.id, inputBase);
      expect(resultat).toEqual({ ok: false, raison: "introuvable" });
    });
  });

  describe("supprimerTerrain", () => {
    it("deletes a terrain with no active reservation or match", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await supprimerTerrain(id, owner.id);
      expect(resultat).toEqual({ ok: true });
      expect(await prisma.terrain.findUnique({ where: { id } })).toBeNull();
    });

    it("refuses to delete a terrain owned by someone else", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      expect(await supprimerTerrain(id, other.id)).toEqual({ ok: false, raison: "non_autorise" });
    });

    it("refuses to delete a terrain with a confirmed future reservation", async () => {
      const owner = await creerProprietaire();
      const player = await prisma.user.create({
        data: {
          email: "joueur@example.com",
          passwordHash: await hashPassword("motdepasse123"),
          profile: { create: { prenom: "J", ville: "Tunis" } },
        },
      });
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      await prisma.reservation.create({
        data: { terrainId: id, userId: player.id, date: "2099-01-01", heureDebut: "10:00", heureFin: "11:30" },
      });

      const resultat = await supprimerTerrain(id, owner.id, new Date("2026-01-01"));
      expect(resultat).toEqual({ ok: false, raison: "reservations_actives" });
      expect(await prisma.terrain.findUnique({ where: { id } })).not.toBeNull();
    });

    it("allows deleting a terrain whose only reservation is in the past", async () => {
      const owner = await creerProprietaire();
      const player = await prisma.user.create({
        data: {
          email: "joueur2@example.com",
          passwordHash: await hashPassword("motdepasse123"),
          profile: { create: { prenom: "J", ville: "Tunis" } },
        },
      });
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      await prisma.reservation.create({
        data: { terrainId: id, userId: player.id, date: "2020-01-01", heureDebut: "10:00", heureFin: "11:30" },
      });

      const resultat = await supprimerTerrain(id, owner.id, new Date("2026-01-01"));
      expect(resultat).toEqual({ ok: true });
    });
  });
});
