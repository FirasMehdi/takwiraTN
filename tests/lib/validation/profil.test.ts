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
});
