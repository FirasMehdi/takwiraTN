import { describe, it, expect } from "vitest";
import {
  terrainListQuerySchema,
  terrainDetailQuerySchema,
} from "@/lib/validation/terrain";

describe("terrainListQuerySchema", () => {
  it("accepts an empty query — all filters are optional", () => {
    const result = terrainListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a full query", () => {
    const result = terrainListQuerySchema.safeParse({
      ville: "Tunis",
      date: "2026-09-07",
      heure: "18:00",
      format: "cinq",
      prixMax: "80000",
    });
    expect(result.success).toBe(true);
  });

  it("coerces prixMax from string to number", () => {
    const result = terrainListQuerySchema.parse({ prixMax: "80000" });
    expect(result.prixMax).toBe(80000);
  });

  it("rejects an invalid format value", () => {
    const result = terrainListQuerySchema.safeParse({ format: "neuf" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = terrainListQuerySchema.safeParse({ date: "07/09/2026" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed heure", () => {
    const result = terrainListQuerySchema.safeParse({ heure: "18h" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative prixMax", () => {
    const result = terrainListQuerySchema.safeParse({ prixMax: "-1" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty ville with a French error message", () => {
    const result = terrainListQuerySchema.safeParse({ ville: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const villeError = result.error.issues.find((issue) => issue.path[0] === "ville");
      expect(villeError?.message).toBe("La ville ne peut pas être vide");
    }
  });

  it("rejects whitespace-only ville with a French error message", () => {
    const result = terrainListQuerySchema.safeParse({ ville: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      const villeError = result.error.issues.find((issue) => issue.path[0] === "ville");
      expect(villeError?.message).toBe("La ville ne peut pas être vide");
    }
  });

  it("rejects non-numeric prixMax with a French error message", () => {
    const result = terrainListQuerySchema.safeParse({ prixMax: "abc" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const prixMaxError = result.error.issues.find((issue) => issue.path[0] === "prixMax");
      expect(prixMaxError?.message).toBe("Le prix doit être un nombre valide");
    }
  });

  it("rejects prixMax exceeding int32 max (2147483648)", () => {
    const result = terrainListQuerySchema.safeParse({ prixMax: "2147483648" });
    expect(result.success).toBe(false);
  });

  it("accepts prixMax at int32 max boundary (2147483647)", () => {
    const result = terrainListQuerySchema.safeParse({ prixMax: "2147483647" });
    expect(result.success).toBe(true);
  });

  it("rejects ville exceeding 80 characters", () => {
    const longVille = "a".repeat(81);
    const result = terrainListQuerySchema.safeParse({ ville: longVille });
    expect(result.success).toBe(false);
  });

  it("accepts ville at 80 character boundary", () => {
    const maxVille = "a".repeat(80);
    const result = terrainListQuerySchema.safeParse({ ville: maxVille });
    expect(result.success).toBe(true);
  });
});

describe("terrainDetailQuerySchema", () => {
  it("accepts a valid date", () => {
    const result = terrainDetailQuerySchema.safeParse({ date: "2026-09-07" });
    expect(result.success).toBe(true);
  });

  it("accepts an absent date", () => {
    const result = terrainDetailQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects a malformed date", () => {
    const result = terrainDetailQuerySchema.safeParse({ date: "pas-une-date" });
    expect(result.success).toBe(false);
  });

  it("rejects calendar-invalid date: February 30th", () => {
    const result = terrainDetailQuerySchema.safeParse({ date: "2026-02-30" });
    expect(result.success).toBe(false);
  });

  it("rejects calendar-invalid date: April 31st", () => {
    const result = terrainDetailQuerySchema.safeParse({ date: "2026-04-31" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid leap day", () => {
    const result = terrainDetailQuerySchema.safeParse({ date: "2028-02-29" });
    expect(result.success).toBe(true);
  });
});
