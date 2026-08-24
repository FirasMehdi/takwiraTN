import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JoueurFiltres } from "@/components/joueurs/JoueurFiltres";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("JoueurFiltres", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("pre-fills the fields from the current values", () => {
    render(<JoueurFiltres valeurs={{ ville: "Sfax", poste: "gardien" }} />);
    expect(screen.getByLabelText("Ville")).toHaveValue("Sfax");
    expect(screen.getByLabelText("Poste")).toHaveValue("gardien");
  });

  it("navigates with the chosen filters on submit", () => {
    render(<JoueurFiltres valeurs={{}} />);
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Tunis" } });
    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
    expect(pushMock).toHaveBeenCalledWith("/joueurs?ville=Tunis");
  });

  it("omits empty filters from the query string", () => {
    render(<JoueurFiltres valeurs={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
    expect(pushMock).toHaveBeenCalledWith("/joueurs");
  });
});
