import { describe, it, expect } from "vitest";
import { envoyerDemandeSchema, envoyerMessageSchema } from "@/lib/validation/amis";

describe("envoyerDemandeSchema", () => {
  it("accepts a valid payload", () => {
    expect(envoyerDemandeSchema.safeParse({ destinataireId: "u1" }).success).toBe(true);
  });

  it("rejects a missing destinataireId", () => {
    expect(envoyerDemandeSchema.safeParse({}).success).toBe(false);
  });
});

describe("envoyerMessageSchema", () => {
  it("accepts a valid message", () => {
    expect(envoyerMessageSchema.safeParse({ contenu: "Salut !" }).success).toBe(true);
  });

  it("rejects an empty message", () => {
    expect(envoyerMessageSchema.safeParse({ contenu: "   " }).success).toBe(false);
  });

  it("rejects a message longer than 2000 characters", () => {
    expect(envoyerMessageSchema.safeParse({ contenu: "a".repeat(2001) }).success).toBe(false);
  });
});
