import { prisma } from "@/lib/prisma";

export type StatutRelation = "aucune" | "demande_envoyee" | "demande_recue" | "amis";

export async function statutRelation(userIdA: string, userIdB: string): Promise<StatutRelation> {
  if (userIdA === userIdB) return "aucune";

  const amitie = await prisma.amitie.findFirst({
    where: {
      OR: [
        { demandeurId: userIdA, destinataireId: userIdB },
        { demandeurId: userIdB, destinataireId: userIdA },
      ],
    },
  });

  if (!amitie) return "aucune";
  if (amitie.statut === "refusee") return "aucune"; // une demande refusée peut être retentée
  if (amitie.statut === "acceptee") return "amis";
  return amitie.demandeurId === userIdA ? "demande_envoyee" : "demande_recue";
}

export type EnvoyerDemandeResultat =
  | { ok: true; id: string }
  | { ok: false; raison: "deja_amis" | "demande_existante" | "soi_meme" };

export async function envoyerDemande(
  demandeurId: string,
  destinataireId: string
): Promise<EnvoyerDemandeResultat> {
  if (demandeurId === destinataireId) return { ok: false, raison: "soi_meme" };

  const existante = await prisma.amitie.findFirst({
    where: {
      OR: [
        { demandeurId, destinataireId },
        { demandeurId: destinataireId, destinataireId: demandeurId },
      ],
    },
  });

  if (existante) {
    if (existante.statut === "acceptee") return { ok: false, raison: "deja_amis" };
    if (existante.statut === "en_attente") return { ok: false, raison: "demande_existante" };

    // Une demande refusée laisse une ligne en base à cause de la contrainte
    // d'unicité (demandeurId, destinataireId) : on la retente en réutilisant
    // cette même ligne plutôt qu'en essayant d'en créer une nouvelle.
    const amitie = await prisma.amitie.update({
      where: { id: existante.id },
      data: { demandeurId, destinataireId, statut: "en_attente", respondedAt: null },
    });
    return { ok: true, id: amitie.id };
  }

  const amitie = await prisma.amitie.create({ data: { demandeurId, destinataireId } });
  return { ok: true, id: amitie.id };
}

export type RepondreResultat = { ok: true } | { ok: false; raison: "introuvable" };

export async function accepterDemande(id: string, userId: string): Promise<RepondreResultat> {
  const { count } = await prisma.amitie.updateMany({
    where: { id, destinataireId: userId, statut: "en_attente" },
    data: { statut: "acceptee", respondedAt: new Date() },
  });
  return count > 0 ? { ok: true } : { ok: false, raison: "introuvable" };
}

export async function refuserDemande(id: string, userId: string): Promise<RepondreResultat> {
  const { count } = await prisma.amitie.updateMany({
    where: { id, destinataireId: userId, statut: "en_attente" },
    data: { statut: "refusee", respondedAt: new Date() },
  });
  return count > 0 ? { ok: true } : { ok: false, raison: "introuvable" };
}

export type AmiResume = { id: string; prenom: string; ville: string; photoUrl: string | null };

export async function findAmis(userId: string): Promise<AmiResume[]> {
  const amities = await prisma.amitie.findMany({
    where: {
      statut: "acceptee",
      OR: [{ demandeurId: userId }, { destinataireId: userId }],
    },
    include: {
      demandeur: { select: { id: true, profile: { select: { prenom: true, ville: true, photoUrl: true } } } },
      destinataire: { select: { id: true, profile: { select: { prenom: true, ville: true, photoUrl: true } } } },
    },
  });

  return amities.map((a) => {
    const autre = a.demandeurId === userId ? a.destinataire : a.demandeur;
    return {
      id: autre.id,
      prenom: autre.profile?.prenom ?? "Joueur",
      ville: autre.profile?.ville ?? "",
      photoUrl: autre.profile?.photoUrl ?? null,
    };
  });
}

export type DemandeRecue = { id: string; demandeurId: string; prenom: string };

export async function findDemandesRecues(userId: string): Promise<DemandeRecue[]> {
  const demandes = await prisma.amitie.findMany({
    where: { destinataireId: userId, statut: "en_attente" },
    include: { demandeur: { select: { profile: { select: { prenom: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return demandes.map((d) => ({
    id: d.id,
    demandeurId: d.demandeurId,
    prenom: d.demandeur.profile?.prenom ?? "Joueur",
  }));
}

export async function sontAmis(userIdA: string, userIdB: string): Promise<boolean> {
  return (await statutRelation(userIdA, userIdB)) === "amis";
}
