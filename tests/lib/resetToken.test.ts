import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  createPasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/resetToken";

async function createTestUser(email: string) {
  return prisma.user.create({
    data: { email, passwordHash: await hashPassword("motdepasse123") },
  });
}

describe("password reset tokens", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a token that can be consumed once", async () => {
    const user = await createTestUser("reset@example.com");
    const token = await createPasswordResetToken(user.id);

    const result = await consumePasswordResetToken(token);
    expect(result).toEqual({ valid: true, userId: user.id });

    const secondAttempt = await consumePasswordResetToken(token);
    expect(secondAttempt).toEqual({ valid: false, reason: "used" });
  });

  it("rejects an unknown token", async () => {
    const result = await consumePasswordResetToken("unknown-token");
    expect(result).toEqual({ valid: false, reason: "not_found" });
  });

  it("rejects an expired token", async () => {
    const user = await createTestUser("expired@example.com");
    const token = "expired-token-123";
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await consumePasswordResetToken(token);
    expect(result).toEqual({ valid: false, reason: "expired" });
  });
});
