import { describe, it, expect, beforeEach, afterAll, afterEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { resetRateLimits } from "@/lib/rateLimit";
import { hashPassword } from "@/lib/password";
import { authorizeCredentials, authOptions } from "@/lib/auth";

describe("authorizeCredentials", () => {
  beforeEach(async () => {
    await resetDb();
    resetRateLimits();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns the user for valid credentials", async () => {
    await prisma.user.create({
      data: {
        email: "joueur@example.com",
        passwordHash: await hashPassword("motdepasse123"),
      },
    });

    const result = await authorizeCredentials({
      email: "joueur@example.com",
      password: "motdepasse123",
    });
    expect(result).toMatchObject({ email: "joueur@example.com", role: "joueur" });
  });

  it("returns null for a wrong password", async () => {
    await prisma.user.create({
      data: {
        email: "joueur@example.com",
        passwordHash: await hashPassword("motdepasse123"),
      },
    });

    const result = await authorizeCredentials({
      email: "joueur@example.com",
      password: "faux",
    });
    expect(result).toBeNull();
  });

  it("logs in with a different case/whitespace than the e-mail was stored with", async () => {
    await prisma.user.create({
      data: {
        email: "joueur@example.com",
        passwordHash: await hashPassword("motdepasse123"),
      },
    });

    const result = await authorizeCredentials({
      email: "  Joueur@Example.com  ",
      password: "motdepasse123",
    });
    expect(result).toMatchObject({ email: "joueur@example.com" });
  });

  it("returns null for an unknown e-mail", async () => {
    const result = await authorizeCredentials({
      email: "inconnu@example.com",
      password: "motdepasse123",
    });
    expect(result).toBeNull();
  });

  it("still runs a bcrypt compare for an unknown e-mail (timing guard)", async () => {
    const compareSpy = vi.spyOn(bcrypt, "compare");

    await authorizeCredentials({
      email: "personne@example.com",
      password: "motdepasse123",
    });

    expect(compareSpy).toHaveBeenCalledOnce();
  });

  it("rate limits repeated attempts with the same email+ip, even with a valid password", async () => {
    await prisma.user.create({
      data: {
        email: "joueur@example.com",
        passwordHash: await hashPassword("motdepasse123"),
      },
    });

    for (let i = 0; i < 5; i++) {
      const result = await authorizeCredentials(
        { email: "joueur@example.com", password: "motdepasse123" },
        "1.2.3.4"
      );
      expect(result).not.toBeNull();
    }

    const sixth = await authorizeCredentials(
      { email: "joueur@example.com", password: "motdepasse123" },
      "1.2.3.4"
    );
    expect(sixth).toBeNull();
  });
});

describe("authOptions.callbacks.jwt", () => {
  const callJwt = (args: Record<string, unknown>) =>
    (authOptions.callbacks!.jwt as (args: unknown) => Promise<unknown>)(args);

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("carries id, role, and sessionVersion into the token on sign-in", async () => {
    const token = await callJwt({
      token: {},
      user: { id: "u1", email: "a@example.com", role: "joueur", sessionVersion: 0 },
    });
    expect(token).toMatchObject({ id: "u1", role: "joueur", sessionVersion: 0 });
  });

  it("resolves normally when the DB sessionVersion still matches the token", async () => {
    const user = await prisma.user.create({
      data: { email: "stable@example.com", passwordHash: "x" },
    });

    const token = { id: user.id, role: "joueur", sessionVersion: 0 };
    const result = await callJwt({ token });
    expect(result).toEqual(token);
  });

  it("throws when the DB sessionVersion has been bumped since the token was issued", async () => {
    const user = await prisma.user.create({
      data: { email: "bumped@example.com", passwordHash: "x" },
    });
    await prisma.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });

    const token = { id: user.id, role: "joueur", sessionVersion: 0 };
    await expect(callJwt({ token })).rejects.toThrow();
  });

  it("throws when the token's user no longer exists", async () => {
    const token = { id: "does-not-exist", role: "joueur", sessionVersion: 0 };
    await expect(callJwt({ token })).rejects.toThrow();
  });
});
