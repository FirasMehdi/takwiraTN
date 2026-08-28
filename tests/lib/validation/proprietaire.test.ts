import { describe, it, expect } from "vitest";
import {
  terrainTypeSchema,
  formatOffreSchema,
  horaireSchema,
  terrainBaseSchema,
  creerTerrainSchema,
  modifierTerrainSchema,
  ajouterFormatSchema,
  modifierFormatSchema,
  modifierHorairesSchema,
} from "@/lib/validation/proprietaire";

const formatValide = { format: "cinq" as const, capacite: 10, prixParCreneau: 60000 };
const horaireValide = { jourSemaine: 1, ouvre: "08:00", ferme: "22:00" };
const baseValide = {
  nom: "Terrain Test",
  adresse: "Rue Test",
  ville: "Tunis",
  type: "gazon_synthetique" as const,
};

describe("terrainTypeSchema", () => {
  it("accepts the three known types", () => {
    expect(terrainTypeSchema.safeParse("gazon_synthetique").success).toBe(true);
    expect(terrainTypeSchema.safeParse("gazon_naturel").success).toBe(true);
    expect(terrainTypeSchema.safeParse("beton").success).toBe(true);
  });

  it("rejects an unknown type", () => {
    expect(terrainTypeSchema.safeParse("boue").success).toBe(false);
  });
});

describe("formatOffreSchema", () => {
  it("accepts a valid format offer", () => {
    expect(formatOffreSchema.safeParse(formatValide).success).toBe(true);
  });

  it("rejects a capacite below 2", () => {
    expect(formatOffreSchema.safeParse({ ...formatValide, capacite: 1 }).success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(formatOffreSchema.safeParse({ ...formatValide, prixParCreneau: -1 }).success).toBe(false);
  });

  it("rejects an unknown format enum value", () => {
    expect(formatOffreSchema.safeParse({ ...formatValide, format: "treize" }).success).toBe(false);
  });
});

describe("horaireSchema", () => {
  it("accepts a valid horaire", () => {
    expect(horaireSchema.safeParse(horaireValide).success).toBe(true);
  });

  it("rejects ferme before ouvre", () => {
    const result = horaireSchema.safeParse({ ...horaireValide, ouvre: "22:00", ferme: "08:00" });
    expect(result.success).toBe(false);
  });

  it("rejects ferme equal to ouvre", () => {
    const result = horaireSchema.safeParse({ ...horaireValide, ouvre: "10:00", ferme: "10:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a jourSemaine out of range", () => {
    expect(horaireSchema.safeParse({ ...horaireValide, jourSemaine: 7 }).success).toBe(false);
    expect(horaireSchema.safeParse({ ...horaireValide, jourSemaine: -1 }).success).toBe(false);
  });

  it("rejects a malformed heure", () => {
    expect(horaireSchema.safeParse({ ...horaireValide, ouvre: "8h00" }).success).toBe(false);
  });
});

describe("terrainBaseSchema", () => {
  it("accepts a minimal valid payload", () => {
    expect(terrainBaseSchema.safeParse(baseValide).success).toBe(true);
  });

  it("requires a non-empty nom", () => {
    expect(terrainBaseSchema.safeParse({ ...baseValide, nom: "" }).success).toBe(false);
  });

  it("rejects an out-of-range latitude", () => {
    expect(terrainBaseSchema.safeParse({ ...baseValide, latitude: 200 }).success).toBe(false);
  });

  it("accepts a valid latitude/longitude pair", () => {
    expect(
      terrainBaseSchema.safeParse({ ...baseValide, latitude: 36.8, longitude: 10.1 }).success
    ).toBe(true);
  });

  it("rejects a dureeCreneauMinutes below 15", () => {
    expect(terrainBaseSchema.safeParse({ ...baseValide, dureeCreneauMinutes: 10 }).success).toBe(false);
  });
});

describe("creerTerrainSchema", () => {
  it("accepts a full valid payload", () => {
    const result = creerTerrainSchema.safeParse({
      ...baseValide,
      formats: [formatValide],
      horaires: [horaireValide],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty formats array", () => {
    const result = creerTerrainSchema.safeParse({ ...baseValide, formats: [], horaires: [horaireValide] });
    expect(result.success).toBe(false);
  });

  it("rejects an empty horaires array", () => {
    const result = creerTerrainSchema.safeParse({ ...baseValide, formats: [formatValide], horaires: [] });
    expect(result.success).toBe(false);
  });
});

describe("modifierTerrainSchema", () => {
  it("accepts the same shape as terrainBaseSchema, without formats/horaires", () => {
    expect(modifierTerrainSchema.safeParse(baseValide).success).toBe(true);
  });
});

describe("ajouterFormatSchema", () => {
  it("accepts a valid single format", () => {
    expect(ajouterFormatSchema.safeParse(formatValide).success).toBe(true);
  });
});

describe("modifierFormatSchema", () => {
  it("accepts capacite and prixParCreneau without format", () => {
    expect(modifierFormatSchema.safeParse({ capacite: 12, prixParCreneau: 70000 }).success).toBe(true);
  });

  it("rejects a negative capacite", () => {
    expect(modifierFormatSchema.safeParse({ capacite: -1, prixParCreneau: 70000 }).success).toBe(false);
  });
});

describe("modifierHorairesSchema", () => {
  it("accepts a valid horaires array", () => {
    expect(modifierHorairesSchema.safeParse({ horaires: [horaireValide] }).success).toBe(true);
  });

  it("rejects an empty horaires array", () => {
    expect(modifierHorairesSchema.safeParse({ horaires: [] }).success).toBe(false);
  });
});
