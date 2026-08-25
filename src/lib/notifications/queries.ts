import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "demande_ami"
  | "message"
  | "invitation_match"
  | "rappel_match";

export type NotificationResume = {
  id: string;
  type: string;
  contenu: string;
  lien: string | null;
  lu: boolean;
  createdAt: Date;
};

export async function creerNotification(input: {
  userId: string;
  type: NotificationType;
  contenu: string;
  lien?: string;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      contenu: input.contenu,
      lien: input.lien,
    },
  });
}

export async function findNotifications(userId: string): Promise<NotificationResume[]> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return notifications;
}

export async function countNotificationsNonLues(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, lu: false } });
}

export async function marquerCommeLue(
  notificationId: string,
  userId: string
): Promise<{ ok: boolean }> {
  // updateMany avec userId dans le where (pas juste l'id) : un utilisateur
  // ne peut marquer comme lue que SA PROPRE notification.
  const resultat = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { lu: true },
  });
  return { ok: resultat.count > 0 };
}

export async function marquerToutesCommeLues(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, lu: false },
    data: { lu: true },
  });
}
