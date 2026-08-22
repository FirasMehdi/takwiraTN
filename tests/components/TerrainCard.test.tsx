import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerrainCard } from "@/components/terrains/TerrainCard";

const terrain = {
  id: "t1",
  nom: "Complexe El Menzah",
  ville: "Tunis",
  adresse: "Rue de Rome",
  type: "gazon_synthetique",
  format: "cinq",
  prixParCreneau: 60000,
  photo: null,
  creneauxLibres: 3,
};

describe("TerrainCard", () => {
  it("shows the terrain name, ville and formatted price", () => {
    render(<TerrainCard terrain={terrain} />);

    expect(screen.getByText("Complexe El Menzah")).toBeInTheDocument();
    expect(screen.getByText(/Tunis/)).toBeInTheDocument();
    expect(screen.getByText(/60,000 DT/)).toBeInTheDocument();
  });

  it("shows the French label for the format", () => {
    render(<TerrainCard terrain={terrain} />);
    expect(screen.getByText(/5 contre 5/)).toBeInTheDocument();
  });

  it("links to the terrain detail page", () => {
    render(<TerrainCard terrain={terrain} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/terrains/t1");
  });

  it("announces the number of free slots", () => {
    render(<TerrainCard terrain={terrain} />);
    expect(screen.getByText(/3 créneaux libres/)).toBeInTheDocument();
  });

  it("says so when no slot is free", () => {
    render(<TerrainCard terrain={{ ...terrain, creneauxLibres: 0 }} />);
    expect(screen.getByText(/Aucun créneau libre/)).toBeInTheDocument();
  });

  it("uses the singular for exactly one free slot", () => {
    render(<TerrainCard terrain={{ ...terrain, creneauxLibres: 1 }} />);
    expect(screen.getByText(/1 créneau libre/)).toBeInTheDocument();
  });
});
