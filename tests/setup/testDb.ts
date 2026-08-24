import { prisma } from "@/lib/prisma";

export async function resetDb() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetDb() can only run with NODE_ENV=test");
  }

  await prisma.message.deleteMany();
  await prisma.amitie.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.terrainHoraire.deleteMany();
  await prisma.terrain.deleteMany();
  await prisma.user.deleteMany();
}
