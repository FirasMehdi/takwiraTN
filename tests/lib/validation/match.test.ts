import { describe, it, expect } from "vitest";
import { matchListQuerySchema, creerMatchSchema } from "@/lib/validation/match";

describe("matchListQuerySchema", () => {
  it("accepts an empty query", () => {
    expect(matchListQuerySchema.safeParse({}).success).toBe(true);
  });

  it("rejects an invalid date", () => {
    expect(matchListQuerySchema.safeParse({ date: "not-a-date" }).success).toBe(false);
  });
});

describe("creerMatchSchema", () => {
  const valide = {
    terrainId: "t1",
    date: "2026-09-07",
    heureDebut: "18:00",
    heureFin: "19:30",
    joueursMax: 10,
  };

  it("accepts a valid payload", () => {
    expect(creerMatchSchema.safeParse(valide).success).toBe(true);
  });

  it("rejects joueursMax below 2", () => {
    expect(creerMatchSchema.safeParse({ ...valide, joueursMax: 1 }).success).toBe(false);
  });

  it("rejects joueursMax above 30", () => {
    expect(creerMatchSchema.safeParse({ ...valide, joueursMax: 31 }).success).toBe(false);
  });

  it("rejects a missing terrainId", () => {
    const { terrainId, ...sansTerrainId } = valide;
    void terrainId;
    expect(creerMatchSchema.safeParse(sansTerrainId).success).toBe(false);
  });

  it("rejects a description longer than 500 characters", () => {
    expect(
      creerMatchSchema.safeParse({ ...valide, description: "a".repeat(501) }).success
    ).toBe(false);
  });
});
