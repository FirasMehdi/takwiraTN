import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { resetRateLimits } from "@/lib/rateLimit";
import { hashPassword } from "@/lib/password";
import { POST } from "@/app/api/mot-de-passe-oublie/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/mot-de-passe-oublie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/mot-de-passe-oublie", () => {
  beforeEach(async () => {
    await resetDb();
    resetRateLimits();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a reset token for a known e-mail", async () => {
    const user = await prisma.user.create({
      data: { email: "connu@example.com", passwordHash: await hashPassword("motdepasse123") },
    });

    const response = await POST(makeRequest({ email: "connu@example.com" }));
    expect(response.status).toBe(200);

    const tokens = await prisma.passwordResetToken.findMany({ where: { userId: user.id } });
    expect(tokens).toHaveLength(1);
  });

  it("returns the same generic response for an unknown e-mail", async () => {
    const response = await POST(makeRequest({ email: "inconnu@example.com" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Si ce compte existe, un e-mail a été envoyé.");
  });

  it("rejects an invalid payload", async () => {
    const response = await POST(makeRequest({ email: "pas-un-email" }));
    expect(response.status).toBe(400);
  });

  it("returns the same generic 200 and creates no new token once the per-email limit is exceeded", async () => {
    const user = await prisma.user.create({
      data: { email: "flood@example.com", passwordHash: await hashPassword("motdepasse123") },
    });

    // First 3 requests are allowed and each supersedes the previous token
    // (see the one-outstanding-token-per-user cap), so exactly 1 row exists
    // after they've all run.
    for (let i = 0; i < 3; i++) {
      const response = await POST(makeRequest({ email: "flood@example.com" }));
      expect(response.status).toBe(200);
    }

    const countBeforeExtra = await prisma.passwordResetToken.count({ where: { userId: user.id } });
    expect(countBeforeExtra).toBe(1);

    // The 4th request in the window is silently rate limited: still 200,
    // still the same generic message, no new token row.
    const response = await POST(makeRequest({ email: "flood@example.com" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Si ce compte existe, un e-mail a été envoyé.");

    const countAfterExtra = await prisma.passwordResetToken.count({ where: { userId: user.id } });
    expect(countAfterExtra).toBe(countBeforeExtra);
  });
});
