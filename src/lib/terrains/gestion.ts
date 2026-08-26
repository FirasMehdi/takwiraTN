import type { FormatEquipe, TerrainStatut, TerrainType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Toute la logique de mutation des terrains (création, édition, suppression,
 * formats, horaires) vit ici — c'est le seul endroit du sous-projet Hoster
 * qui écrit sur Terrain / TerrainFormatOffre / TerrainHoraire. La lecture
 * publique (src/lib/terrains/queries.ts) n'est jamais modifiée par ce
 * fichier ; on duplique ici les quelques petits utilitaires dont on a besoin
 * (ex. formatDateLocale) plutôt que d'y toucher.
 */

export type FormatInput = {
  format: FormatEquipe;
  capacite: number;
  prixParCreneau: number;
};

export type HoraireInput = {
  jourSemaine: number;
  ouvre: string;
  ferme: string;
};

export type TerrainBaseInput = {
  nom: string;
  description?: string | null;
  adresse: string;
  ville: string;
  latitude?: number | null;
  longitude?: number | null;
  type: TerrainType;
  dureeCreneauMinutes?: number;
  equipements?: string[];
};

export type TerrainGestionResume = {
  id: string;
  nom: string;
  ville: string;
  type: TerrainType;
  statut: TerrainStatut;
  nombreFormats: number;
  nombreHoraires: number;
  createdAt: Date;
};

export type TerrainGestionDetail = TerrainBaseInput & {
  id: string;
  statut: TerrainStatut;
  ownerId: string;
  formats: (FormatInput & { id: string })[];
  horaires: (HoraireInput & { id: string })[];
};

/** "YYYY-MM-DD" en heure locale — même convention que le reste du domaine terrains. */
function formatDateLocale(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

export async function listerTerrainsProprietaire(
  ownerId: string
): Promise<TerrainGestionResume[]> {
  const terrains = await prisma.terrain.findMany({
    where: { ownerId },
    include: { _count: { select: { formats: true, horaires: true } } },
    orderBy: { createdAt: "desc" },
  });

  return terrains.map((terrain) => ({
    id: terrain.id,
    nom: terrain.nom,
    ville: terrain.ville,
    type: terrain.type,
    statut: terrain.statut,
    nombreFormats: terrain._count.formats,
    nombreHoraires: terrain._count.horaires,
    createdAt: terrain.createdAt,
  }));
}

export async function trouverTerrainProprietaire(
  id: string,
  ownerId: string
): Promise<TerrainGestionDetail | null> {
  const terrain = await prisma.terrain.findFirst({
    where: { id, ownerId },
    include: { formats: true, horaires: true },
  });
  if (!terrain) return null;

  return {
    id: terrain.id,
    nom: terrain.nom,
    description: terrain.description,
    adresse: terrain.adresse,
    ville: terrain.ville,
    latitude: terrain.latitude,
    longitude: terrain.longitude,
    type: terrain.type,
    dureeCreneauMinutes: terrain.dureeCreneauMinutes,
    equipements: terrain.equipements,
    statut: terrain.statut,
    ownerId: terrain.ownerId as string,
    formats: terrain.formats.map((f) => ({
      id: f.id,
      format: f.format,
      capacite: f.capacite,
      prixParCreneau: f.prixParCreneau,
    })),
    horaires: terrain.horaires.map((h) => ({
      id: h.id,
      jourSemaine: h.jourSemaine,
      ouvre: h.ouvre,
      ferme: h.ferme,
    })),
  };
}

export async function creerTerrain(
  ownerId: string,
  input: TerrainBaseInput & { formats: FormatInput[]; horaires: HoraireInput[] }
): Promise<{ id: string }> {
  const terrain = await prisma.terrain.create({
    data: {
      nom: input.nom,
      description: input.description ?? null,
      adresse: input.adresse,
      ville: input.ville,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      type: input.type,
      dureeCreneauMinutes: input.dureeCreneauMinutes ?? 90,
      equipements: input.equipements ?? [],
      photos: [],
      // Un terrain créé par un propriétaire part en attente de validation —
      // il n'apparaît pas dans la recherche publique (qui ne montre que
      // statut = actif) tant qu'il n'a pas été activé. Aucun flux
      // d'activation n'est construit par ce sous-projet ; c'est un état
      // délibérément en attente d'un futur outil de modération.
      statut: "en_attente",
      ownerId,
      formats: { create: input.formats },
      horaires: { create: input.horaires },
    },
  });
  return { id: terrain.id };
}

export async function verifierProprietaire(
  terrainId: string,
  ownerId: string
): Promise<{ ok: true } | { ok: false; raison: "introuvable" | "non_autorise" }> {
  const terrain = await prisma.terrain.findUnique({
    where: { id: terrainId },
    select: { ownerId: true },
  });
  if (!terrain) return { ok: false, raison: "introuvable" };
  if (terrain.ownerId !== ownerId) return { ok: false, raison: "non_autorise" };
  return { ok: true };
}

export type ModifierTerrainResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "non_autorise" };

export async function modifierTerrain(
  terrainId: string,
  ownerId: string,
  input: TerrainBaseInput
): Promise<ModifierTerrainResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  await prisma.terrain.update({
    where: { id: terrainId },
    data: {
      nom: input.nom,
      description: input.description ?? null,
      adresse: input.adresse,
      ville: input.ville,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      type: input.type,
      dureeCreneauMinutes: input.dureeCreneauMinutes ?? 90,
      equipements: input.equipements ?? [],
    },
  });
  return { ok: true };
}

export type SupprimerTerrainResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "non_autorise" | "reservations_actives" };

/**
 * Supprime un terrain. Refuse si des réservations confirmées ou des matchs
 * ouverts/complets à venir y sont encore attachés : Reservation.terrainId et
 * Match.terrainId sont `onDelete: Cascade` dans le schéma, donc supprimer le
 * terrain les supprimerait silencieusement avec lui — un vrai propriétaire
 * ne doit pas pouvoir effacer des réservations de joueurs de cette façon.
 */
export async function supprimerTerrain(
  terrainId: string,
  ownerId: string,
  maintenant: Date = new Date()
): Promise<SupprimerTerrainResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  const dateStr = formatDateLocale(maintenant);
  const [reservationActive, matchActif] = await Promise.all([
    prisma.reservation.findFirst({
      where: { terrainId, statut: "confirmee", date: { gte: dateStr } },
      select: { id: true },
    }),
    prisma.match.findFirst({
      where: { terrainId, statut: { in: ["ouvert", "complet"] }, date: { gte: dateStr } },
      select: { id: true },
    }),
  ]);
  if (reservationActive || matchActif) {
    return { ok: false, raison: "reservations_actives" };
  }

  await prisma.terrain.delete({ where: { id: terrainId } });
  return { ok: true };
}

export type AjouterFormatResultat =
  | { ok: true; id: string }
  | { ok: false; raison: "introuvable" | "non_autorise" | "format_existe" };

export async function ajouterFormat(
  terrainId: string,
  ownerId: string,
  input: FormatInput
): Promise<AjouterFormatResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  const existant = await prisma.terrainFormatOffre.findUnique({
    where: { terrainId_format: { terrainId, format: input.format } },
  });
  if (existant) return { ok: false, raison: "format_existe" };

  const created = await prisma.terrainFormatOffre.create({
    data: {
      terrainId,
      format: input.format,
      capacite: input.capacite,
      prixParCreneau: input.prixParCreneau,
    },
  });
  return { ok: true, id: created.id };
}

export type ModifierFormatResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "non_autorise" };

export async function modifierFormat(
  terrainId: string,
  ownerId: string,
  formatId: string,
  input: { capacite: number; prixParCreneau: number }
): Promise<ModifierFormatResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  const format = await prisma.terrainFormatOffre.findFirst({
    where: { id: formatId, terrainId },
  });
  if (!format) return { ok: false, raison: "introuvable" };

  await prisma.terrainFormatOffre.update({
    where: { id: formatId },
    data: { capacite: input.capacite, prixParCreneau: input.prixParCreneau },
  });
  return { ok: true };
}

export type SupprimerFormatResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "non_autorise" | "dernier_format" };

/** Un terrain doit toujours garder au moins un format — le dernier ne peut pas être retiré. */
export async function supprimerFormat(
  terrainId: string,
  ownerId: string,
  formatId: string
): Promise<SupprimerFormatResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  const format = await prisma.terrainFormatOffre.findFirst({
    where: { id: formatId, terrainId },
  });
  if (!format) return { ok: false, raison: "introuvable" };

  const total = await prisma.terrainFormatOffre.count({ where: { terrainId } });
  if (total <= 1) return { ok: false, raison: "dernier_format" };

  await prisma.terrainFormatOffre.delete({ where: { id: formatId } });
  return { ok: true };
}

export type ModifierHorairesResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "non_autorise" };

/** Remplace intégralement les horaires du terrain par le nouvel ensemble fourni. */
export async function modifierHoraires(
  terrainId: string,
  ownerId: string,
  horaires: HoraireInput[]
): Promise<ModifierHorairesResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  await prisma.$transaction([
    prisma.terrainHoraire.deleteMany({ where: { terrainId } }),
    prisma.terrainHoraire.createMany({
      data: horaires.map((h) => ({
        terrainId,
        jourSemaine: h.jourSemaine,
        ouvre: h.ouvre,
        ferme: h.ferme,
      })),
    }),
  ]);
  return { ok: true };
}
