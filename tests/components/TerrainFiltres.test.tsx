import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TerrainFiltres } from "@/components/terrains/TerrainFiltres";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("TerrainFiltres", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("pre-fills the fields from the current values", () => {
    render(<TerrainFiltres valeurs={{ ville: "Sfax", date: "2026-09-07" }} />);

    expect(screen.getByLabelText("Ville")).toHaveValue("Sfax");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-09-07");
  });

  it("navigates with the chosen filters on submit", () => {
    render(<TerrainFiltres valeurs={{}} />);

    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Tunis" } });
    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(pushMock).toHaveBeenCalledWith("/terrains?ville=Tunis");
  });

  it("omits empty filters from the query string", () => {
    render(<TerrainFiltres valeurs={{}} />);

    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(pushMock).toHaveBeenCalledWith("/terrains");
  });
});
