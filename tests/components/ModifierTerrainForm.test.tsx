import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ModifierTerrainForm } from "@/components/proprietaire/ModifierTerrainForm";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const props = {
  terrainId: "t1",
  nom: "Terrain Test",
  description: "Une description",
  adresse: "Rue Test",
  ville: "Tunis",
  latitude: null,
  longitude: null,
  type: "gazon_synthetique" as const,
  dureeCreneauMinutes: 90,
  equipements: ["vestiaires"],
};

describe("ModifierTerrainForm", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("pre-fills the fields from props", () => {
    render(<ModifierTerrainForm {...props} />);
    expect(screen.getByLabelText("Nom du terrain")).toHaveValue("Terrain Test");
    expect(screen.getByLabelText("Ville")).toHaveValue("Tunis");
  });

  it("submits a PATCH request and shows a success message", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Terrain mis à jour." }),
    } as Response);

    render(<ModifierTerrainForm {...props} />);
    fireEvent.change(screen.getByLabelText("Nom du terrain"), { target: { value: "Nouveau nom" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(screen.getByText("Terrain mis à jour.")).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/proprietaire/terrains/t1",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows a field error returned by the server", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { nom: ["Le nom est requis"] } }),
    } as Response);

    render(<ModifierTerrainForm {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Le nom est requis")).toBeInTheDocument();
  });
});
