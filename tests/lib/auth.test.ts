import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { authorizeCredentials } from "@/lib/auth";

describe("authorizeCredentials", () => {
  beforeEach(async () => {
    await resetDb();
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
});
