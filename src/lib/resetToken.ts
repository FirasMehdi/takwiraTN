import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await prisma.passwordResetToken.create({
    data: { userId, token, expiresAt },
  });
  return token;
}

export async function consumePasswordResetToken(token: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record) return { valid: false as const, reason: "not_found" as const };
  if (record.usedAt) return { valid: false as const, reason: "used" as const };
  if (record.expiresAt < new Date())
    return { valid: false as const, reason: "expired" as const };

  await prisma.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });
  return { valid: true as const, userId: record.userId };
}
