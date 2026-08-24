import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JoueurCard } from "@/components/joueurs/JoueurCard";

const joueur = {
  id: "u1",
  prenom: "Amine",
  ville: "Tunis",
  poste: "milieu",
  niveau: "intermediaire",
  photoUrl: null,
};

describe("JoueurCard", () => {
  it("shows the player's name, ville, poste and niveau", () => {
    render(<JoueurCard joueur={joueur} />);
    expect(screen.getByText("Amine")).toBeInTheDocument();
    expect(screen.getByText(/Tunis/)).toBeInTheDocument();
    expect(screen.getByText(/Milieu/)).toBeInTheDocument();
    expect(screen.getByText(/Intermédiaire/)).toBeInTheDocument();
  });

  it("links to the player's detail page", () => {
    render(<JoueurCard joueur={joueur} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/joueurs/u1");
  });

  it("renders a neutral placeholder (not announced as an image) when there is no photo", () => {
    render(<JoueurCard joueur={joueur} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the photo with a meaningful alt when one is set", () => {
    render(<JoueurCard joueur={{ ...joueur, photoUrl: "https://example.com/p.jpg" }} />);
    expect(screen.getByRole("img", { name: "Amine" })).toHaveAttribute(
      "src",
      "https://example.com/p.jpg"
    );
  });
});
