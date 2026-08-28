import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerrainGestionCard } from "@/components/proprietaire/TerrainGestionCard";

const terrainBase = {
  id: "t1",
  nom: "Complexe Test",
  ville: "Tunis",
  type: "gazon_synthetique" as const,
  statut: "actif" as const,
  nombreFormats: 2,
  nombreHoraires: 3,
};

describe("TerrainGestionCard", () => {
  it("renders the terrain name, city and statut label", () => {
    render(<TerrainGestionCard terrain={terrainBase} />);
    expect(screen.getByText("Complexe Test")).toBeInTheDocument();
    expect(screen.getByText(/Tunis/)).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });

  it("links to the terrain's edit page", () => {
    render(<TerrainGestionCard terrain={terrainBase} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/proprietaire/terrains/t1/modifier");
  });

  it("shows a pending label for en_attente terrains", () => {
    render(<TerrainGestionCard terrain={{ ...terrainBase, statut: "en_attente" }} />);
    expect(screen.getByText("En attente de validation")).toBeInTheDocument();
  });

  it("shows format and horaire counts", () => {
    render(<TerrainGestionCard terrain={terrainBase} />);
    expect(screen.getByText(/2 formats/)).toBeInTheDocument();
  });
});
