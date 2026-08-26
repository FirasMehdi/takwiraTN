import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsSection } from "@/components/homepage/StatsSection";

const stats = { joueurs: 128, proprietaires: 14, terrains: 22, matchs: 340 };

describe("StatsSection", () => {
  it("shows each stat with its French label", () => {
    render(<StatsSection stats={stats} />);

    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("Joueurs inscrits")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("Propriétaires partenaires")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(screen.getByText("Terrains disponibles")).toBeInTheDocument();
    expect(screen.getByText("340")).toBeInTheDocument();
    expect(screen.getByText("Matchs organisés")).toBeInTheDocument();
  });

  it("formats large numbers using French thousands separators", () => {
    render(
      <StatsSection
        stats={{ joueurs: 12345, proprietaires: 0, terrains: 0, matchs: 0 }}
      />
    );

    // Computed via the same API the component uses, so the expectation
    // adapts to whatever separator character the runtime's ICU picks
    // (regular space vs. narrow no-break space) instead of hardcoding one.
    // Testing Library's getByText collapses the DOM text's whitespace
    // (which turns the narrow no-break space U+202F into a regular space)
    // but does NOT apply that same normalization to the string matcher, so
    // the raw toLocaleString() output must be pre-collapsed the same way
    // or the exact-match comparison fails on the differing space character.
    const attendu = (12345).toLocaleString("fr-FR").replace(/\s+/g, " ");
    expect(screen.getByText(attendu)).toBeInTheDocument();
  });

  it("shows zero rather than hiding a stat when a count is empty", () => {
    render(
      <StatsSection stats={{ joueurs: 0, proprietaires: 0, terrains: 0, matchs: 0 }} />
    );

    expect(screen.getAllByText("0")).toHaveLength(4);
  });
});
