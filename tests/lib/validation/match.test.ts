import { describe, it, expect } from "vitest";
import {
  matchListQuerySchema,
  creerMatchSchema,
  annulerMatchSchema,
  decisionReservationSchema,
} from "@/lib/validation/match";

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
    format: "cinq",
    joueursMax: 10,
    organisateurParticipe: true,
  };

  it("accepts a valid payload", () => {
    expect(creerMatchSchema.safeParse(valide).success).toBe(true);
  });

  it("keeps organisateurParticipe as a real boolean", () => {
    const parsed = creerMatchSchema.safeParse({ ...valide, organisateurParticipe: false });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.organisateurParticipe).toBe(false);
  });

  it("rejects a missing format", () => {
    const { format, ...sansFormat } = valide;
    void format;
    expect(creerMatchSchema.safeParse(sansFormat).success).toBe(false);
  });

  it("rejects an unknown format", () => {
    expect(creerMatchSchema.safeParse({ ...valide, format: "douze" }).success).toBe(false);
  });

  it("rejects a missing organisateurParticipe", () => {
    const { organisateurParticipe, ...sansRole } = valide;
    void organisateurParticipe;
    expect(creerMatchSchema.safeParse(sansRole).success).toBe(false);
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

  it("rejects an end time before the start time", () => {
    const resultat = creerMatchSchema.safeParse({
      ...valide,
      heureDebut: "20:00",
      heureFin: "08:00",
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.flatten().fieldErrors.heureFin).toEqual([
        "L'heure de fin doit être après l'heure de début",
      ]);
    }
  });

  it("rejects an end time equal to the start time", () => {
    expect(
      creerMatchSchema.safeParse({ ...valide, heureDebut: "18:00", heureFin: "18:00" }).success
    ).toBe(false);
  });

  it("accepts an end time strictly after the start time", () => {
    expect(
      creerMatchSchema.safeParse({ ...valide, heureDebut: "18:00", heureFin: "18:01" }).success
    ).toBe(true);
  });
});

describe("annulerMatchSchema", () => {
  it("accepts a standard reason without a precision", () => {
    expect(annulerMatchSchema.safeParse({ raison: "pas_assez_joueurs" }).success).toBe(true);
  });

  it("rejects a missing reason", () => {
    expect(annulerMatchSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an unknown reason", () => {
    expect(annulerMatchSchema.safeParse({ raison: "flemme" }).success).toBe(false);
  });

  it("requires a precision when the reason is autre", () => {
    expect(annulerMatchSchema.safeParse({ raison: "autre" }).success).toBe(false);
    expect(annulerMatchSchema.safeParse({ raison: "autre", raisonAutre: "   " }).success).toBe(false);
  });

  it("accepts autre with a precision", () => {
    const parsed = annulerMatchSchema.safeParse({ raison: "autre", raisonAutre: " Pluie " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.raisonAutre).toBe("Pluie");
  });

  it("rejects a precision longer than 200 characters", () => {
    expect(
      annulerMatchSchema.safeParse({ raison: "autre", raisonAutre: "a".repeat(201) }).success
    ).toBe(false);
  });
});

describe("decisionReservationSchema", () => {
  it("accepts an explicit boolean", () => {
    expect(decisionReservationSchema.safeParse({ reserver: true }).success).toBe(true);
    expect(decisionReservationSchema.safeParse({ reserver: false }).success).toBe(true);
  });

  it("rejects a missing or non-boolean decision", () => {
    expect(decisionReservationSchema.safeParse({}).success).toBe(false);
    expect(decisionReservationSchema.safeParse({ reserver: "oui" }).success).toBe(false);
  });
});
