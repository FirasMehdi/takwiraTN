import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminNav } from "@/components/admin/AdminNav";

let pathname = "/admin";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("AdminNav", () => {
  it("renders a link for every admin section", () => {
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Tableau de bord" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Joueurs" })).toHaveAttribute("href", "/admin/joueurs");
    expect(screen.getByRole("link", { name: "Propriétaires" })).toHaveAttribute(
      "href",
      "/admin/proprietaires"
    );
    expect(screen.getByRole("link", { name: "Terrains" })).toHaveAttribute("href", "/admin/terrains");
    expect(screen.getByRole("link", { name: "Matchs" })).toHaveAttribute("href", "/admin/matchs");
    expect(screen.getByRole("link", { name: "Annulations" })).toHaveAttribute(
      "href",
      "/admin/annulations"
    );
    expect(screen.getByRole("link", { name: "Mon profil" })).toHaveAttribute("href", "/admin/profil");
  });

  it("marks the dashboard link active only on the exact /admin path", () => {
    pathname = "/admin";
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Tableau de bord" }).className).toContain("text-primary");
  });

  it("marks a nested section active by prefix", () => {
    pathname = "/admin/joueurs/abc123";
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Joueurs" }).className).toContain("text-primary");
    expect(screen.getByRole("link", { name: "Tableau de bord" }).className).not.toContain(
      "font-semibold text-primary"
    );
  });
});
