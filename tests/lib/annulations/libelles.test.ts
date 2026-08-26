import { describe, it, expect } from "vitest";
import {
  libelleRaisonAnnulation,
  RAISONS_ANNULATION,
} from "@/lib/annulations/libelles";

describe("libelleRaisonAnnulation", () => {
  it("translates each enum value to French", () => {
    expect(libelleRaisonAnnulation("personnel")).toBe("Empêchement personnel");
    expect(libelleRaisonAnnulation("pas_assez_joueurs")).toBe("Pas assez de joueurs");
    expect(libelleRaisonAnnulation("conflit_horaire")).toBe("Conflit d'horaire");
    expect(libelleRaisonAnnulation("terrain_indisponible")).toBe("Terrain indisponible");
  });

  it("uses the free-text precision when the reason is autre", () => {
    expect(libelleRaisonAnnulation("autre", "Pluie battante")).toBe("Pluie battante");
  });

  it("falls back to a generic label when autre carries no precision", () => {
    expect(libelleRaisonAnnulation("autre")).toBe("Autre motif");
    expect(libelleRaisonAnnulation("autre", "   ")).toBe("Autre motif");
    expect(libelleRaisonAnnulation("autre", null)).toBe("Autre motif");
  });

  it("exposes every reason as a selectable option", () => {
    expect(RAISONS_ANNULATION.map((r) => r.valeur)).toEqual([
      "personnel",
      "pas_assez_joueurs",
      "conflit_horaire",
      "terrain_indisponible",
      "autre",
    ]);
    expect(RAISONS_ANNULATION[0].libelle).toBe("Empêchement personnel");
  });
});
