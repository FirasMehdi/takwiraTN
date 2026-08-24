import { prisma } from "@/lib/prisma";
import { sontAmis } from "@/lib/amis/queries";

export type MessageResume = {
  id: string;
  expediteurId: string;
  contenu: string;
  createdAt: Date;
};

export type ConversationResume = {
  autreUserId: string;
  autrePrenom: string;
  dernierMessage: string;
  dernierMessageAt: Date;
};

export type EnvoyerMessageResultat =
  | { ok: true; id: string }
  | { ok: false; raison: "pas_amis" };

/**
 * L'amitié est vérifiée à l'écriture, pas seulement à l'affichage du bouton
 * côté client — un utilisateur ne peut pas contourner l'exigence en
 * appelant directement l'API.
 */
export async function envoyerMessage(
  expediteurId: string,
  destinataireId: string,
  contenu: string
): Promise<EnvoyerMessageResultat> {
  if (!(await sontAmis(expediteurId, destinataireId))) {
    return { ok: false, raison: "pas_amis" };
  }
  const message = await prisma.message.create({
    data: { expediteurId, destinataireId, contenu },
  });
  return { ok: true, id: message.id };
}

export async function findConversation(
  userIdA: string,
  userIdB: string
): Promise<MessageResume[]> {
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { expediteurId: userIdA, destinataireId: userIdB },
        { expediteurId: userIdB, destinataireId: userIdA },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return messages.map((m) => ({
    id: m.id,
    expediteurId: m.expediteurId,
    contenu: m.contenu,
    createdAt: m.createdAt,
  }));
}

/**
 * Une conversation par interlocuteur distinct, réduite en mémoire à partir
 * des messages — pas de modèle Conversation séparé, ça suffit à cette
 * échelle (voir le plan). Les messages sont déjà triés du plus récent au
 * plus ancien, donc la première occurrence de chaque interlocuteur est
 * son dernier message.
 */
export async function findConversations(userId: string): Promise<ConversationResume[]> {
  const messages = await prisma.message.findMany({
    where: { OR: [{ expediteurId: userId }, { destinataireId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      expediteur: { select: { profile: { select: { prenom: true } } } },
      destinataire: { select: { profile: { select: { prenom: true } } } },
    },
  });

  const parAutreUtilisateur = new Map<string, ConversationResume>();
  for (const m of messages) {
    const autreEstExpediteur = m.expediteurId !== userId;
    const autreUserId = autreEstExpediteur ? m.expediteurId : m.destinataireId;
    if (parAutreUtilisateur.has(autreUserId)) continue;
    const autrePrenom =
      (autreEstExpediteur ? m.expediteur.profile?.prenom : m.destinataire.profile?.prenom) ??
      "Joueur";
    parAutreUtilisateur.set(autreUserId, {
      autreUserId,
      autrePrenom,
      dernierMessage: m.contenu,
      dernierMessageAt: m.createdAt,
    });
  }
  return Array.from(parAutreUtilisateur.values());
}
