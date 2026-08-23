import type { Prisma, TerrainFormat, TerrainType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSlots, type Slot } from "@/lib/terrains/slots";
import type { TerrainListQuery } from "@/lib/validation/terrain";

export type TerrainResume = {
  id: string;
  nom: string;
  ville: string;
  adresse: string;
  type: TerrainType;
  format: TerrainFormat;
  prixParCreneau: number;
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
  format: TerrainFormat;
  prixParCreneau: number;
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

export async function findTerrains(
  query: TerrainListQuery,
  maintenant: Date = new Date()
): Promise<TerrainResume[]> {
  const where: Prisma.TerrainWhereInput = { statut: "actif" };

  if (query.ville) {
    where.ville = { equals: query.ville, mode: "insensitive" };
  }
  if (query.format) {
    where.format = query.format;
  }
  if (query.prixMax !== undefined) {
    where.prixParCreneau = { lte: query.prixMax };
  }

  const terrains = await prisma.terrain.findMany({
    where,
    include: { horaires: true },
    orderBy: { nom: "asc" },
    take: 100, // Sécurité : borne le coût de la requête et de la génération de
               // créneaux qui suit. Ce n'est pas une pagination — juste un
               // plafond. Une vraie pagination viendra si le catalogue dépasse
               // ce seuil.
  });

  const date = query.date ? parseDateLocale(query.date) : maintenant;

  const resumes = terrains.map((terrain) => {
    const creneaux = generateSlots({
      horaires: terrain.horaires,
      date,
      dureeCreneauMinutes: terrain.dureeCreneauMinutes,
      taken: [], // Rempli au sous-projet 3, quand les réservations existeront.
      maintenant,
    });

    return {
      terrain,
      creneaux,
      resume: {
        id: terrain.id,
        nom: terrain.nom,
        ville: terrain.ville,
        adresse: terrain.adresse,
        type: terrain.type,
        format: terrain.format,
        prixParCreneau: terrain.prixParCreneau,
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
    include: { horaires: true },
  });

  if (!terrain) return null;

  const jour = date ? parseDateLocale(date) : maintenant;

  return {
    id: terrain.id,
    nom: terrain.nom,
    description: terrain.description,
    adresse: terrain.adresse,
    ville: terrain.ville,
    latitude: terrain.latitude,
    longitude: terrain.longitude,
    type: terrain.type,
    format: terrain.format,
    prixParCreneau: terrain.prixParCreneau,
    dureeCreneauMinutes: terrain.dureeCreneauMinutes,
    equipements: terrain.equipements,
    photos: terrain.photos,
    date: formatDateLocale(jour),
    creneaux: generateSlots({
      horaires: terrain.horaires,
      date: jour,
      dureeCreneauMinutes: terrain.dureeCreneauMinutes,
      taken: [],
      maintenant,
    }),
  };
}
