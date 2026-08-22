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
});
