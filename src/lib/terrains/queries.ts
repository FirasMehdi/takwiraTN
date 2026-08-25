import type { FormatEquipe, Prisma, TerrainType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSlots, type Slot } from "@/lib/terrains/slots";
import { findTakenSlots, findTakenSlotsForTerrains } from "@/lib/reservations/queries";
import type { TerrainListQuery } from "@/lib/validation/terrain";

export type TerrainFormatResume = {
  format: FormatEquipe;
  capacite: number;
  prixParCreneau: number;
};

export type TerrainResume = {
  id: string;
  nom: string;
  ville: string;
  adresse: string;
  type: TerrainType;
  formats: TerrainFormatResume[];
  prixAPartirDe: number;
  photo: string | null;
  creneauxLibres: number;
};

export type TerrainDetail = {
  id: string;
  nom: string;
  description: string | null;
  adresse: string;
  ville: string;
  latitude: number | null;
  longitude: number | null;
  type: TerrainType;
  formats: TerrainFormatResume[];
  prixAPartirDe: number;
  dureeCreneauMinutes: number;
  equipements: string[];
  photos: string[];
  /** Jour affiché, "YYYY-MM-DD". */
  date: string;
  creneaux: Slot[];
};

/** "YYYY-MM-DD" → Date locale (minuit local, pour éviter tout aller-retour par l'UTC). */
function parseDateLocale(valeur: string): Date {
  const [annee, mois, jour] = valeur.split("-").map(Number);
  return new Date(annee, mois - 1, jour);
}

function formatDateLocale(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

function toMinutes(hhmm: string): number {
  const [heures, minutes] = hhmm.split(":").map(Number);
  return heures * 60 + minutes;
}

function toFormatResumes(
  formats: { format: FormatEquipe; capacite: number; prixParCreneau: number }[]
): TerrainFormatResume[] {
  return formats.map((f) => ({
    format: f.format,
    capacite: f.capacite,
    prixParCreneau: f.prixParCreneau,
  }));
}

function prixAPartirDe(formats: TerrainFormatResume[]): number {
  if (formats.length === 0) return 0;
  return Math.min(...formats.map((f) => f.prixParCreneau));
}

export async function findTerrains(
  query: TerrainListQuery,
  maintenant: Date = new Date()
): Promise<TerrainResume[]> {
  const where: Prisma.TerrainWhereInput = { statut: "actif" };

  if (query.ville) {
    where.ville = { equals: query.ville, mode: "insensitive" };
  }
  // Un même "offre" doit satisfaire le format ET le prix max ensemble —
  // sinon un terrain à 5v5 cher mais 11v11 pas cher passerait à tort un
  // filtre "5v5, prix max bas".
  if (query.format || query.prixMax !== undefined) {
    where.formats = {
      some: {
        ...(query.format ? { format: query.format } : {}),
        ...(query.prixMax !== undefined ? { prixParCreneau: { lte: query.prixMax } } : {}),
      },
    };
  }

  const terrains = await prisma.terrain.findMany({
    where,
    include: { horaires: true, formats: true },
    orderBy: { nom: "asc" },
    take: 100, // Sécurité : borne le coût de la requête et de la génération de
               // créneaux qui suit. Ce n'est pas une pagination — juste un
               // plafond. Une vraie pagination viendra si le catalogue dépasse
               // ce seuil.
  });

  const date = query.date ? parseDateLocale(query.date) : maintenant;
  const dateStr = formatDateLocale(date);
  const parTerrain = await findTakenSlotsForTerrains(terrains.map((t) => t.id), dateStr);

  const resumes = terrains.map((terrain) => {
    const creneaux = generateSlots({
      horaires: terrain.horaires,
      date,
      dureeCreneauMinutes: terrain.dureeCreneauMinutes,
      taken: parTerrain.get(terrain.id) ?? [],
      maintenant,
    });
    const formats = toFormatResumes(terrain.formats);

    return {
      terrain,
      creneaux,
      resume: {
        id: terrain.id,
        nom: terrain.nom,
        ville: terrain.ville,
        adresse: terrain.adresse,
        type: terrain.type,
        formats,
        prixAPartirDe: prixAPartirDe(formats),
        photo: terrain.photos[0] ?? null,
        creneauxLibres: creneaux.filter((c) => c.disponible).length,
      },
    };
  });

  // Le filtre par heure demande de connaître les créneaux : il s'applique
  // après génération, en mémoire.
  const filtres = query.heure
    ? resumes.filter(({ creneaux }) => {
        const h = toMinutes(query.heure!);
        return creneaux.some(
          (c) => c.disponible && toMinutes(c.debut) <= h && h < toMinutes(c.fin)
        );
      })
    : resumes;

  return filtres.map(({ resume }) => resume);
}

export async function findTerrainById(
  id: string,
  date?: string,
  maintenant: Date = new Date()
): Promise<TerrainDetail | null> {
  const terrain = await prisma.terrain.findFirst({
    where: { id, statut: "actif" },
    include: { horaires: true, formats: true },
  });

  if (!terrain) return null;

  const jour = date ? parseDateLocale(date) : maintenant;
  const jourStr = formatDateLocale(jour);
  const taken = await findTakenSlots(id, jourStr);
  const formats = toFormatResumes(terrain.formats);

  return {
    id: terrain.id,
    nom: terrain.nom,
    description: terrain.description,
    adresse: terrain.adresse,
    ville: terrain.ville,
    latitude: terrain.latitude,
    longitude: terrain.longitude,
    type: terrain.type,
    formats,
    prixAPartirDe: prixAPartirDe(formats),
    dureeCreneauMinutes: terrain.dureeCreneauMinutes,
    equipements: terrain.equipements,
    photos: terrain.photos,
    date: jourStr,
    creneaux: generateSlots({
      horaires: terrain.horaires,
      date: jour,
      dureeCreneauMinutes: terrain.dureeCreneauMinutes,
      taken,
      maintenant,
    }),
  };
}
