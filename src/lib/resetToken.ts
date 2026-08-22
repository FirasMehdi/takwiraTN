import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash a reset token for storage and lookup.
 *
 * SHA-256 rather than bcrypt on purpose: the token is 256 bits of randomness,
 * so it cannot be brute-forced or guessed the way a human-chosen password can,
 * and lookups must stay a single indexed query rather than a scan.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(
  userId: string,
  client: PrismaClientOrTx = prisma
) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await client.passwordResetToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  // Only the caller ever sees the raw token; the database holds just its hash.
  return token;
}

export async function consumePasswordResetToken(
  token: string,
  client: PrismaClientOrTx = prisma
) {
  const now = new Date();
  const tokenHash = hashToken(token);

  // Atomic consume: only flips usedAt when the token is still valid, which
  // also eliminates the find-then-update race between two concurrent requests.
  const { count } = await client.passwordResetToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });

  if (count > 0) {
    const record = await client.passwordResetToken.findUniqueOrThrow({ where: { tokenHash } });
    return { valid: true as const, userId: record.userId };
  }

  // The update matched nothing: read the row to tell "used" from "expired"
  // (and "not found" if it never existed at all).
  const record = await client.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) return { valid: false as const, reason: "not_found" as const };
  if (record.usedAt) return { valid: false as const, reason: "used" as const };
  return { valid: false as const, reason: "expired" as const };
}
