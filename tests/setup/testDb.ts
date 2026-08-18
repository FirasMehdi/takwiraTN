import { prisma } from "@/lib/prisma";

export async function resetDb() {
  await prisma.passwordResetToken.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.user.deleteMany();
}
