import { prisma } from "@/lib/prisma";

export async function resetDb() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetDb() can only run with NODE_ENV=test");
  }

  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.amitie.deleteMany();
  await prisma.matchParticipant.deleteMany();
  // Annulation référence à la fois Match et Reservation : elle doit partir
  // avant les deux, sinon la suppression des cibles bute sur la clé étrangère.
  await prisma.annulation.deleteMany();
  await prisma.match.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.terrainFormatOffre.deleteMany();
  await prisma.terrainHoraire.deleteMany();
  await prisma.terrain.deleteMany();
  await prisma.user.deleteMany();
}
