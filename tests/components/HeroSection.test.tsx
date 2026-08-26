import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroSection } from "@/components/homepage/HeroSection";

describe("HeroSection", () => {
  it("shows the platform name and tagline", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Takwria TN" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/connecte les joueurs aux terrains/)
    ).toBeInTheDocument();
  });

  it("links the player CTA to inscription", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("link", { name: "Rejoindre en tant que joueur" })
    ).toHaveAttribute("href", "/inscription");
  });

  it("links the terrain owner CTA to inscription with the proprietaire query param", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("link", { name: "Inscrire mon terrain" })
    ).toHaveAttribute("href", "/inscription?type=proprietaire");
  });
});
