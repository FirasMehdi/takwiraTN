import { describe, it, expect } from "vitest";
import {
  adminListQuerySchema,
  adminTerrainStatutSchema,
  adminAnnulerMatchSchema,
} from "@/lib/validation/admin";

describe("adminListQuerySchema", () => {
  it("accepts an empty object", () => {
    expect(adminListQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts a query string", () => {
    const result = adminListQuerySchema.safeParse({ q: "amine" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty q", () => {
    expect(adminListQuerySchema.safeParse({ q: "" }).success).toBe(false);
  });

  it("rejects a q longer than 120 characters", () => {
    expect(adminListQuerySchema.safeParse({ q: "a".repeat(121) }).success).toBe(false);
  });
});

describe("adminTerrainStatutSchema", () => {
  it("accepts each valid statut", () => {
    for (const statut of ["actif", "en_attente", "suspendu"]) {
      expect(adminTerrainStatutSchema.safeParse({ statut }).success).toBe(true);
    }
  });

  it("rejects an unknown statut", () => {
    expect(adminTerrainStatutSchema.safeParse({ statut: "archive" }).success).toBe(false);
  });

  it("rejects a missing statut", () => {
    expect(adminTerrainStatutSchema.safeParse({}).success).toBe(false);
  });
});

describe("adminAnnulerMatchSchema", () => {
  it("accepts a non-autre reason without raisonAutre", () => {
    const result = adminAnnulerMatchSchema.safeParse({ raison: "pas_assez_joueurs" });
    expect(result.success).toBe(true);
  });

  it("accepts autre with a raisonAutre", () => {
    const result = adminAnnulerMatchSchema.safeParse({
      raison: "autre",
      raisonAutre: "Terrain inondé",
    });
    expect(result.success).toBe(true);
  });

  it("rejects autre without a raisonAutre", () => {
    const result = adminAnnulerMatchSchema.safeParse({ raison: "autre" });
    expect(result.success).toBe(false);
  });

  it("rejects autre with a blank raisonAutre", () => {
    const result = adminAnnulerMatchSchema.safeParse({ raison: "autre", raisonAutre: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown raison", () => {
    expect(adminAnnulerMatchSchema.safeParse({ raison: "caprice" }).success).toBe(false);
  });

  it("rejects a raisonAutre longer than 300 characters", () => {
    const result = adminAnnulerMatchSchema.safeParse({
      raison: "autre",
      raisonAutre: "a".repeat(301),
    });
    expect(result.success).toBe(false);
  });
});
