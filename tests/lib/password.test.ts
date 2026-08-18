import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("motdepasse123");
    expect(hash).not.toBe("motdepasse123");
    expect(await verifyPassword("motdepasse123", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("motdepasse123");
    expect(await verifyPassword("mauvais-mdp", hash)).toBe(false);
  });
});
