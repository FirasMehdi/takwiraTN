import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";

describe("prisma test database", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates and reads back a user against the test database", async () => {
    const user = await prisma.user.create({
      data: { email: "check@example.com", passwordHash: "x" },
    });

    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe("check@example.com");
  });

  it("resetDb clears users between tests", async () => {
    const count = await prisma.user.count();
    expect(count).toBe(0);
  });
});
