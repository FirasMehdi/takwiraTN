import { prisma } from "@/lib/prisma";

export async function resetDb() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetDb() can only run with NODE_ENV=test");
  }

  await prisma.passwordResetToken.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.user.deleteMany();
}
