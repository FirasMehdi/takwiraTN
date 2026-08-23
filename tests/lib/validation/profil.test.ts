import { describe, it, expect } from "vitest";
import { profilSchema } from "@/lib/validation/profil";

describe("profilSchema", () => {
  it("accepts a minimal valid profile", () => {
    const result = profilSchema.safeParse({ prenom: "Amine", ville: "Sousse" });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields with allowed enum values", () => {
    const result = profilSchema.safeParse({
      prenom: "Amine",
      ville: "Sousse",
      poste: "milieu",
      niveau: "avance",
      piedPrefere: "droit",
      telephone: "20123456",
      bio: "Joueur passionné",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid poste value", () => {
    const result = profilSchema.safeParse({ prenom: "Amine", ville: "Sousse", poste: "capitaine" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing prenom", () => {
    const result = profilSchema.safeParse({ ville: "Sousse" });
    expect(result.success).toBe(false);
  });

  it("accepts an explicit null to clear an optional field", () => {
    const result = profilSchema.safeParse({
      prenom: "Amine",
      ville: "Sousse",
      poste: null,
      niveau: null,
      piedPrefere: null,
      telephone: null,
      bio: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.poste).toBeNull();
    }
  });

  it("rejects a prenom longer than 80 characters", () => {
    const result = profilSchema.safeParse({ prenom: "a".repeat(81), ville: "Sousse" });
    expect(result.success).toBe(false);
  });

  it("accepts a prenom exactly 80 characters long", () => {
    const result = profilSchema.safeParse({ prenom: "a".repeat(80), ville: "Sousse" });
    expect(result.success).toBe(true);
  });

  it("rejects a ville longer than 80 characters", () => {
    const result = profilSchema.safeParse({ prenom: "Amine", ville: "a".repeat(81) });
    expect(result.success).toBe(false);
  });

  it("accepts a ville exactly 80 characters long", () => {
    const result = profilSchema.safeParse({ prenom: "Amine", ville: "a".repeat(80) });
    expect(result.success).toBe(true);
  });

  it("rejects a telephone longer than 20 characters", () => {
    const result = profilSchema.safeParse({
      prenom: "Amine",
      ville: "Sousse",
      telephone: "1".repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a telephone exactly 20 characters long", () => {
    const result = profilSchema.safeParse({
      prenom: "Amine",
      ville: "Sousse",
      telephone: "1".repeat(20),
    });
    expect(result.success).toBe(true);
  });
});
