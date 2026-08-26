import { prisma } from "@/lib/prisma";

export type AdminAnnulation = {
  id: string;
  type: "match" | "reservation";
  raison: string;
  raisonAutre: string | null;
  createdAt: Date;
  userEmail: string;
  cible: string;
};

export async function findAdminAnnulations(): Promise<AdminAnnulation[]> {
  const annulations = await prisma.annulation.findMany({
    include: {
      user: { select: { email: true } },
      match: { include: { terrain: { select: { nom: true } } } },
      reservation: { include: { terrain: { select: { nom: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return annulations.map((a) => {
    const type: "match" | "reservation" = a.matchId ? "match" : "reservation";
    const cible = a.match
      ? `Match — ${a.match.terrain.nom}, ${a.match.date} ${a.match.heureDebut}`
      : a.reservation
        ? `Réservation — ${a.reservation.terrain.nom}, ${a.reservation.date} ${a.reservation.heureDebut}`
        : "Cible supprimée";

    return {
      id: a.id,
      type,
      raison: a.raison,
      raisonAutre: a.raisonAutre,
      createdAt: a.createdAt,
      userEmail: a.user.email,
      cible,
    };
  });
}
