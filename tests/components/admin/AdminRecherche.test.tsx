import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminRecherche } from "@/components/admin/AdminRecherche";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("AdminRecherche", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("pre-fills the input from valeur", () => {
    render(<AdminRecherche basePath="/admin/joueurs" valeur="amine" placeholder="Rechercher" />);
    expect(screen.getByLabelText("Recherche")).toHaveValue("amine");
  });

  it("navigates with the query on submit", () => {
    render(<AdminRecherche basePath="/admin/joueurs" valeur="" placeholder="Rechercher" />);
    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: "sami" } });
    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
    expect(pushMock).toHaveBeenCalledWith("/admin/joueurs?q=sami");
  });

  it("navigates to the bare basePath when the query is empty", () => {
    render(<AdminRecherche basePath="/admin/proprietaires" valeur="" placeholder="Rechercher" />);
    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
    expect(pushMock).toHaveBeenCalledWith("/admin/proprietaires");
  });
});
