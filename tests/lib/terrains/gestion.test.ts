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
  ajouterFormat,
  modifierFormat,
  supprimerFormat,
  modifierHoraires,
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

  describe("ajouterFormat / modifierFormat / supprimerFormat", () => {
    it("adds a new format offer", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await ajouterFormat(id, owner.id, { format: "sept", capacite: 14, prixParCreneau: 80000 });
      expect(resultat.ok).toBe(true);
      const count = await prisma.terrainFormatOffre.count({ where: { terrainId: id } });
      expect(count).toBe(2);
    });

    it("refuses a duplicate format on the same terrain", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await ajouterFormat(id, owner.id, formatValide);
      expect(resultat).toEqual({ ok: false, raison: "format_existe" });
    });

    it("refuses to add a format for another owner's terrain", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await ajouterFormat(id, other.id, { format: "sept", capacite: 14, prixParCreneau: 80000 });
      expect(resultat).toEqual({ ok: false, raison: "non_autorise" });
    });

    it("updates a format's capacite and prix", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id } });

      const resultat = await modifierFormat(id, owner.id, format.id, { capacite: 12, prixParCreneau: 65000 });
      expect(resultat).toEqual({ ok: true });
      const updated = await prisma.terrainFormatOffre.findUnique({ where: { id: format.id } });
      expect(updated?.capacite).toBe(12);
      expect(updated?.prixParCreneau).toBe(65000);
    });

    it("refuses to modify a format belonging to another owner's terrain", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id } });

      const resultat = await modifierFormat(id, other.id, format.id, { capacite: 12, prixParCreneau: 65000 });
      expect(resultat).toEqual({ ok: false, raison: "non_autorise" });
    });

    it("deletes a format when more than one remains", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, {
        ...inputBase,
        formats: [formatValide, { format: "sept", capacite: 14, prixParCreneau: 80000 }],
        horaires: [horaireValide],
      });
      const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id, format: "cinq" } });

      const resultat = await supprimerFormat(id, owner.id, format.id);
      expect(resultat).toEqual({ ok: true });
      const count = await prisma.terrainFormatOffre.count({ where: { terrainId: id } });
      expect(count).toBe(1);
    });

    it("refuses to delete the last remaining format", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id } });

      const resultat = await supprimerFormat(id, owner.id, format.id);
      expect(resultat).toEqual({ ok: false, raison: "dernier_format" });
      const count = await prisma.terrainFormatOffre.count({ where: { terrainId: id } });
      expect(count).toBe(1);
    });
  });

  describe("modifierHoraires", () => {
    it("replaces the terrain's horaires with the new set", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await modifierHoraires(id, owner.id, [
        { jourSemaine: 0, ouvre: "09:00", ferme: "12:00" },
        { jourSemaine: 0, ouvre: "16:00", ferme: "20:00" },
      ]);
      expect(resultat).toEqual({ ok: true });

      const horaires = await prisma.terrainHoraire.findMany({ where: { terrainId: id } });
      expect(horaires).toHaveLength(2);
      expect(horaires.every((h) => h.jourSemaine === 0)).toBe(true);
    });

    it("refuses to modify horaires for another owner's terrain", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await modifierHoraires(id, other.id, [horaireValide]);
      expect(resultat).toEqual({ ok: false, raison: "non_autorise" });
    });

    it("returns introuvable for a non-existent terrain", async () => {
      const owner = await creerProprietaire();
      const resultat = await modifierHoraires("inexistant", owner.id, [horaireValide]);
      expect(resultat).toEqual({ ok: false, raison: "introuvable" });
    });
  });
});
