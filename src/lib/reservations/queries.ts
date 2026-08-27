import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DELAI_ANNULATION_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" + "HH:MM" locale → Date locale (pas d'aller-retour UTC). */
function versDateLocale(date: string, heure: string): Date {
  const [annee, mois, jour] = date.split("-").map(Number);
  const [h, m] = heure.split(":").map(Number);
  return new Date(annee, mois - 1, jour, h, m);
}

export async function findTakenSlotsForTerrains(
  terrainIds: string[],
  date: string
): Promise<Map<string, string[]>> {
  const reservations = await prisma.reservation.findMany({
    where: { terrainId: { in: terrainIds }, date, statut: "confirmee" },
    select: { terrainId: true, heureDebut: true },
  });

  const parTerrain = new Map<string, string[]>();
  for (const r of reservations) {
    const liste = parTerrain.get(r.terrainId) ?? [];
    liste.push(r.heureDebut);
    parTerrain.set(r.terrainId, liste);
  }
  return parTerrain;
}

export async function findTakenSlots(terrainId: string, date: string): Promise<string[]> {
  const parTerrain = await findTakenSlotsForTerrains([terrainId], date);
  return parTerrain.get(terrainId) ?? [];
}

export type CreerReservationInput = {
  terrainId: string;
  userId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
};

export type CreerReservationResultat =
  | { ok: true; id: string }
  | { ok: false; raison: "conflit" };

/**
 * Le second paramètre permet d'écrire la réservation dans la transaction de
 * l'appelant (décision de réservation en fin de match, cf.
 * src/lib/matchs/queries.ts) plutôt que dans une transaction implicite à
 * elle seule. Par défaut, c'est le client global — tous les appels existants
 * sont inchangés.
 *
 * Attention côté appelant : en cas de conflit, Postgres a déjà avorté la
 * transaction englobante ; il faut la faire échouer (throw) et non continuer
 * à y écrire.
 */
export async function creerReservation(
  input: CreerReservationInput,
  client: Prisma.TransactionClient = prisma
): Promise<CreerReservationResultat> {
  try {
    const reservation = await client.reservation.create({ data: input });
    return { ok: true, id: reservation.id };
  } catch (error) {
    // P2002 = violation de contrainte d'unicité. Le seul index unique sur
    // Reservation est l'index partiel "un seul créneau confirmé par
    // terrain/date/heure" ajouté à la main dans la migration (voir Task 1,
    // Step 2) — Prisma le détecte via le SQLSTATE Postgres 23505 renvoyé par
    // le driver, pas via son propre schéma, donc ça fonctionne même pour un
    // index qu'il n'a pas déclaré lui-même. N'importe quel P2002 ici signifie
    // donc sans ambiguïté "ce créneau est déjà réservé".
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, raison: "conflit" };
    }
    throw error;
  }
}

export type AnnulerReservationResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "trop_tard" };

export async function annulerReservation(
  id: string,
  userId: string,
  maintenant: Date = new Date()
): Promise<AnnulerReservationResultat> {
  const reservation = await prisma.reservation.findFirst({
    where: { id, userId, statut: "confirmee" },
  });

  // Ne jamais distinguer "n'existe pas" de "appartient à quelqu'un d'autre" —
  // même principe que le 404 terrain inactif du sous-projet Terrains.
  if (!reservation) return { ok: false, raison: "introuvable" };

  const debutCreneau = versDateLocale(reservation.date, reservation.heureDebut);
  if (debutCreneau.getTime() - maintenant.getTime() < DELAI_ANNULATION_MS) {
    return { ok: false, raison: "trop_tard" };
  }

  await prisma.reservation.update({
    where: { id },
    data: { statut: "annulee", canceledAt: maintenant },
  });

  return { ok: true };
}

export type ReservationAnnulable = {
  id: string;
  terrainId: string;
  terrainNom: string;
  terrainVille: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  statut: "confirmee" | "annulee";
  annulable: boolean;
};

export async function findReservationsForUser(
  userId: string,
  maintenant: Date = new Date()
): Promise<ReservationAnnulable[]> {
  const reservations = await prisma.reservation.findMany({
    where: { userId },
    include: { terrain: { select: { nom: true, ville: true } } },
    orderBy: [{ date: "asc" }, { heureDebut: "asc" }],
  });

  return reservations.map((r) => {
    const debutCreneau = versDateLocale(r.date, r.heureDebut);
    const annulable =
      r.statut === "confirmee" &&
      debutCreneau.getTime() - maintenant.getTime() >= DELAI_ANNULATION_MS;

    return {
      id: r.id,
      terrainId: r.terrainId,
      terrainNom: r.terrain.nom,
      terrainVille: r.terrain.ville,
      date: r.date,
      heureDebut: r.heureDebut,
      heureFin: r.heureFin,
      statut: r.statut,
      annulable,
    };
  });
}
