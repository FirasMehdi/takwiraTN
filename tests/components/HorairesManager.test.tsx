import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HorairesManager } from "@/components/proprietaire/HorairesManager";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const horaires = [{ jourSemaine: 1, ouvre: "08:00", ferme: "22:00" }];

describe("HorairesManager", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("pre-fills rows from props", () => {
    render(<HorairesManager terrainId="t1" horaires={horaires} />);
    expect(screen.getByLabelText("Ouverture")).toHaveValue("08:00");
  });

  it("adds and removes rows", () => {
    render(<HorairesManager terrainId="t1" horaires={horaires} />);
    fireEvent.click(screen.getByText("+ Ajouter un horaire"));
    expect(screen.getAllByLabelText("Ouverture")).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Retirer" })[0]);
    expect(screen.getAllByLabelText("Ouverture")).toHaveLength(1);
  });

  it("saves via PUT and shows a success message", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    } as Response);

    render(<HorairesManager terrainId="t1" horaires={horaires} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les horaires" }));

    await waitFor(() => expect(screen.getByText("Horaires enregistrés.")).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/proprietaire/terrains/t1/horaires",
      expect.objectContaining({ method: "PUT" })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows a server error message", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Terrain introuvable" }),
    } as Response);

    render(<HorairesManager terrainId="t1" horaires={horaires} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les horaires" }));

    expect(await screen.findByText("Terrain introuvable")).toBeInTheDocument();
  });

  it("falls back to one empty row when there are no existing horaires", () => {
    render(<HorairesManager terrainId="t1" horaires={[]} />);
    expect(screen.getAllByLabelText("Ouverture")).toHaveLength(1);
  });
});
