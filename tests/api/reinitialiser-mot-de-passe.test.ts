import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { resetRateLimits } from "@/lib/rateLimit";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createPasswordResetToken, consumePasswordResetToken } from "@/lib/resetToken";
import { POST } from "@/app/api/reinitialiser-mot-de-passe/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/reinitialiser-mot-de-passe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reinitialiser-mot-de-passe", () => {
  beforeEach(async () => {
    await resetDb();
    resetRateLimits();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates the password for a valid token", async () => {
    const user = await prisma.user.create({
      data: { email: "reset@example.com", passwordHash: await hashPassword("ancienmdp1") },
    });
    const token = await createPasswordResetToken(user.id);

    const response = await POST(makeRequest({ token, password: "nouveaumdp1" }));
    expect(response.status).toBe(200);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword("nouveaumdp1", updated.passwordHash)).toBe(true);
  });

  it("rejects an unknown token", async () => {
    const response = await POST(makeRequest({ token: "inconnu", password: "nouveaumdp1" }));
    expect(response.status).toBe(400);
  });

  it("rejects a token that was already used", async () => {
    const user = await prisma.user.create({
      data: { email: "reuse@example.com", passwordHash: await hashPassword("ancienmdp1") },
    });
    const token = await createPasswordResetToken(user.id);
    await POST(makeRequest({ token, password: "nouveaumdp1" }));

    const response = await POST(makeRequest({ token, password: "autremdp2" }));
    expect(response.status).toBe(400);
  });

  it("rejects an invalid payload", async () => {
    const response = await POST(makeRequest({ token: "", password: "123" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 instead of throwing on malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/reinitialiser-mot-de-passe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ not valid json",
      })
    );
    expect(response.status).toBe(400);
  });

  it("invalidates the user's other outstanding reset tokens after a successful reset", async () => {
    const user = await prisma.user.create({
      data: { email: "multi@example.com", passwordHash: await hashPassword("ancienmdp1") },
    });
    const tokenA = await createPasswordResetToken(user.id);
    const tokenB = await createPasswordResetToken(user.id);

    const response = await POST(makeRequest({ token: tokenA, password: "nouveaumdp1" }));
    expect(response.status).toBe(200);

    const resultB = await consumePasswordResetToken(tokenB);
    expect(resultB.valid).toBe(false);
  });

  it("rate limits repeated attempts from the same IP with 429 and a Retry-After header", async () => {
    const request = () =>
      new Request("http://localhost/api/reinitialiser-mot-de-passe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.2" },
        body: JSON.stringify({ token: "inconnu", password: "nouveaumdp1" }),
      });

    for (let i = 0; i < 10; i++) {
      const response = await POST(request());
      expect(response.status).not.toBe(429);
    }

    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });
});
