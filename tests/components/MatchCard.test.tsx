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
  format: "cinq" as const,
  joueursMax: 10,
  joueursInscrits: 6,
  joueursManquants: 4,
  organisateurParticipe: true,
  statut: "ouvert" as const,
};

describe("MatchCard", () => {
  it("shows the terrain, ville, date and player count", () => {
    render(<MatchCard match={match} />);
    expect(screen.getByText("Complexe El Menzah")).toBeInTheDocument();
    expect(screen.getByText(/Tunis/)).toBeInTheDocument();
    expect(screen.getByText(/6 \/ 10 joueurs/)).toBeInTheDocument();
  });

  it("shows the format when the match has one", () => {
    render(<MatchCard match={match} />);
    expect(screen.getByText(/5 contre 5/)).toBeInTheDocument();
  });

  it("omits the format for a legacy match without one", () => {
    render(<MatchCard match={{ ...match, format: null }} />);
    expect(screen.queryByText(/contre/)).not.toBeInTheDocument();
  });

  it("says how many additional players are required", () => {
    render(<MatchCard match={match} />);
    expect(screen.getByText("Il manque 4 joueurs")).toBeInTheDocument();
  });

  it("uses the singular for a single missing player", () => {
    render(<MatchCard match={{ ...match, joueursInscrits: 9, joueursManquants: 1 }} />);
    expect(screen.getByText("Il manque 1 joueur")).toBeInTheDocument();
  });

  it("shows remaining spots when open", () => {
    render(<MatchCard match={match} />);
    expect(screen.getByText("4 places")).toBeInTheDocument();
  });

  it("shows Complet when the match is full", () => {
    render(
      <MatchCard
        match={{ ...match, statut: "complet", joueursInscrits: 10, joueursManquants: 0 }}
      />
    );
    expect(screen.getByText("Complet")).toBeInTheDocument();
    expect(screen.queryByText(/Il manque/)).not.toBeInTheDocument();
  });

  it("links to the match detail page", () => {
    render(<MatchCard match={match} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/matchs/m1");
  });
});
