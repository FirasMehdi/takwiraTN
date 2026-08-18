import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomNav } from "@/components/nav/BottomNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "unauthenticated" }),
}));

describe("BottomNav", () => {
  it("links Profil to /connexion when logged out", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "Profil" })).toHaveAttribute("href", "/connexion");
  });

  it("renders all primary nav items", () => {
    render(<BottomNav />);
    ["Accueil", "Terrains", "Matchs", "Joueurs"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
  });
});
