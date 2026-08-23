import { describe, it, expect } from "vitest";
import { generateSlots, type Horaire } from "@/lib/terrains/slots";

// 2026-09-07 is a Monday (getDay() === 1).
const LUNDI = new Date(2026, 8, 7);
const MARDI = new Date(2026, 8, 8);

const horairesLundi: Horaire[] = [{ jourSemaine: 1, ouvre: "08:00", ferme: "11:00" }];

// Well before any slot, so "today" filtering never interferes unless intended.
const TOT_LE_MATIN = new Date(2026, 8, 7, 6, 0);

describe("generateSlots", () => {
  it("generates back-to-back slots across the opening window", () => {
    const slots = generateSlots({
      horaires: horairesLundi,
      date: LUNDI,
      dureeCreneauMinutes: 90,
      maintenant: TOT_LE_MATIN,
    });

    expect(slots).toEqual([
      { debut: "08:00", fin: "09:30", disponible: true },
      { debut: "09:30", fin: "11:00", disponible: true },
    ]);
  });

  it("returns no slots on a day the terrain is closed", () => {
    const slots = generateSlots({
      horaires: horairesLundi,
      date: MARDI,
      dureeCreneauMinutes: 90,
      maintenant: new Date(2026, 8, 8, 6, 0),
    });

    expect(slots).toEqual([]);
  });

  it("never produces a slot that runs past closing time", () => {
    // 08:00-11:00 with 120-minute slots fits one slot; the second would end at 12:00.
    const slots = generateSlots({
      horaires: horairesLundi,
      date: LUNDI,
      dureeCreneauMinutes: 120,
      maintenant: TOT_LE_MATIN,
    });

    expect(slots).toEqual([{ debut: "08:00", fin: "10:00", disponible: true }]);
  });

  it("excludes slots that have already started today", () => {
    const slots = generateSlots({
      horaires: horairesLundi,
      date: LUNDI,
      dureeCreneauMinutes: 90,
      maintenant: new Date(2026, 8, 7, 8, 30),
    });

    expect(slots).toEqual([{ debut: "09:30", fin: "11:00", disponible: true }]);
  });

  it("returns no slots for a day in the past", () => {
    const slots = generateSlots({
      horaires: horairesLundi,
      date: LUNDI,
      dureeCreneauMinutes: 90,
      maintenant: new Date(2026, 8, 9, 6, 0),
    });

    expect(slots).toEqual([]);
  });

  it("marks taken slots as unavailable but still lists them", () => {
    const slots = generateSlots({
      horaires: horairesLundi,
      date: LUNDI,
      dureeCreneauMinutes: 90,
      taken: ["08:00"],
      maintenant: TOT_LE_MATIN,
    });

    expect(slots).toEqual([
      { debut: "08:00", fin: "09:30", disponible: false },
      { debut: "09:30", fin: "11:00", disponible: true },
    ]);
  });

  it("supports split opening hours on the same day", () => {
    const slots = generateSlots({
      horaires: [
        { jourSemaine: 1, ouvre: "08:00", ferme: "09:30" },
        { jourSemaine: 1, ouvre: "18:00", ferme: "19:30" },
      ],
      date: LUNDI,
      dureeCreneauMinutes: 90,
      maintenant: TOT_LE_MATIN,
    });

    expect(slots).toEqual([
      { debut: "08:00", fin: "09:30", disponible: true },
      { debut: "18:00", fin: "19:30", disponible: true },
    ]);
  });

  it("orders slots chronologically even when opening hours are unordered", () => {
    const slots = generateSlots({
      horaires: [
        { jourSemaine: 1, ouvre: "18:00", ferme: "19:30" },
        { jourSemaine: 1, ouvre: "08:00", ferme: "09:30" },
      ],
      date: LUNDI,
      dureeCreneauMinutes: 90,
      maintenant: TOT_LE_MATIN,
    });

    expect(slots.map((s) => s.debut)).toEqual(["08:00", "18:00"]);
  });

  it("returns no slots when the window is shorter than one slot", () => {
    const slots = generateSlots({
      horaires: [{ jourSemaine: 1, ouvre: "08:00", ferme: "09:00" }],
      date: LUNDI,
      dureeCreneauMinutes: 90,
      maintenant: TOT_LE_MATIN,
    });

    expect(slots).toEqual([]);
  });

  it("returns no slots for a non-positive slot duration", () => {
    // Guards against an infinite loop on bad data.
    const slots = generateSlots({
      horaires: horairesLundi,
      date: LUNDI,
      dureeCreneauMinutes: 0,
      maintenant: TOT_LE_MATIN,
    });

    expect(slots).toEqual([]);
  });

  it("deduplicates slots when horaires overlap on the same day", () => {
    const slots = generateSlots({
      horaires: [
        { jourSemaine: 1, ouvre: "08:00", ferme: "12:00" },
        { jourSemaine: 1, ouvre: "10:00", ferme: "14:00" },
      ],
      date: LUNDI,
      dureeCreneauMinutes: 60,
      maintenant: TOT_LE_MATIN,
    });

    // Should have no duplicate debuts
    const debuts = slots.map((s) => s.debut);
    expect(new Set(debuts).size).toBe(debuts.length);
    // Should contain slots from both windows, deduped
    expect(debuts).toContain("08:00");
    expect(debuts).toContain("10:00");
    expect(debuts).toContain("11:00");
  });
});
