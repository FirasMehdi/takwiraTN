import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sontAmis } from "@/lib/amis/queries";
import { creerNotification } from "@/lib/notifications/queries";

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
 * Retrouve la conversation 1:1 entre deux utilisateurs, ou la crée. Course
 * connue et acceptée : deux premiers messages envoyés au même instant entre
 * deux utilisateurs qui ne se sont encore jamais écrit peuvent, en théorie,
 * créer deux conversations distinctes au lieu d'une — cas rare (il faut que
 * ce soit littéralement leur tout premier échange) et sans conséquence pire
 * qu'un historique swindé en deux fils ; pas de verrou supplémentaire pour
 * ça ici.
 */
async function trouverOuCreerConversation1a1(
  tx: Prisma.TransactionClient,
  userIdA: string,
  userIdB: string
): Promise<string> {
  if (userIdA === userIdB) {
    throw new Error("trouverOuCreerConversation1a1: userIdA et userIdB sont identiques");
  }

  const existante = await tx.conversation.findFirst({
    where: {
      estGroupe: false,
      AND: [
        { participants: { some: { userId: userIdA } } },
        { participants: { some: { userId: userIdB } } },
      ],
    },
    select: { id: true },
  });
  if (existante) return existante.id;

  const creee = await tx.conversation.create({
    data: {
      estGroupe: false,
      participants: { create: [{ userId: userIdA }, { userId: userIdB }] },
    },
  });
  return creee.id;
}

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

  const message = await prisma.$transaction(async (tx) => {
    const conversationId = await trouverOuCreerConversation1a1(tx, expediteurId, destinataireId);
    return tx.message.create({ data: { conversationId, expediteurId, contenu } });
  });

  try {
    await creerNotification({
      userId: destinataireId,
      type: "message",
      contenu: "Vous avez reçu un nouveau message.",
      lien: `/amis/${expediteurId}`,
    });
  } catch (err) {
    console.error(
      `[messages] échec de la création de la notification pour le message ${message.id} : ${
        err instanceof Error ? err.message : "erreur inconnue"
      }`
    );
  }

  return { ok: true, id: message.id };
}

export async function findConversation(
  userIdA: string,
  userIdB: string
): Promise<MessageResume[]> {
  if (userIdA === userIdB) return [];

  const conversation = await prisma.conversation.findFirst({
    where: {
      estGroupe: false,
      AND: [
        { participants: { some: { userId: userIdA } } },
        { participants: { some: { userId: userIdB } } },
      ],
    },
    select: { id: true },
  });
  if (!conversation) return [];

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
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
 * Une conversation 1:1 par interlocuteur distinct. S'appuie sur le modèle
 * Conversation (voir trouverOuCreerConversation1a1) plutôt que de réduire
 * les messages en mémoire comme avant — le modèle porte maintenant aussi
 * les conversations de groupe (hors périmètre ici, estGroupe: true).
 */
export async function findConversations(userId: string): Promise<ConversationResume[]> {
  const conversations = await prisma.conversation.findMany({
    where: { estGroupe: false, participants: { some: { userId } } },
    include: {
      participants: {
        include: { user: { select: { profile: { select: { prenom: true } } } } },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const resumes: ConversationResume[] = [];
  for (const conv of conversations) {
    const dernier = conv.messages[0];
    if (!dernier) continue; // pas encore de message échangé dans cette conversation
    const autre = conv.participants.find((p) => p.userId !== userId);
    if (!autre) continue;
    resumes.push({
      autreUserId: autre.userId,
      autrePrenom: autre.user.profile?.prenom ?? "Joueur",
      dernierMessage: dernier.contenu,
      dernierMessageAt: dernier.createdAt,
    });
  }

  resumes.sort((a, b) => b.dernierMessageAt.getTime() - a.dernierMessageAt.getTime());
  return resumes;
}
