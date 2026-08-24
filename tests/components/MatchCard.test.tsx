import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchCard } from "@/components/matchs/MatchCard";

const match = {
  id: "m1",
  terrainId: "t1",
  terrainNom: "Complexe El Menzah",
  terrainVille: "Tunis",
  date: "2026-09-07",
  heureDebut: "18:00",
  heureFin: "19:30",
  joueursMax: 10,
  joueursInscrits: 6,
  statut: "ouvert" as const,
};

describe("MatchCard", () => {
  it("shows the terrain, ville, date and player count", () => {
    render(<MatchCard match={match} />);
    expect(screen.getByText("Complexe El Menzah")).toBeInTheDocument();
    expect(screen.getByText(/Tunis/)).toBeInTheDocument();
    expect(screen.getByText("6 / 10 joueurs")).toBeInTheDocument();
  });

  it("shows remaining spots when open", () => {
    render(<MatchCard match={match} />);
    expect(screen.getByText("4 places")).toBeInTheDocument();
  });

  it("shows Complet when the match is full", () => {
    render(<MatchCard match={{ ...match, statut: "complet", joueursInscrits: 10 }} />);
    expect(screen.getByText("Complet")).toBeInTheDocument();
  });

  it("links to the match detail page", () => {
    render(<MatchCard match={match} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/matchs/m1");
  });
});
