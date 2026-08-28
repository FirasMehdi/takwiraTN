import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreerTerrainForm } from "@/components/proprietaire/CreerTerrainForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function remplirChampsObligatoires() {
  fireEvent.change(screen.getByLabelText("Nom du terrain"), { target: { value: "Mon terrain" } });
  fireEvent.change(screen.getByLabelText("Adresse"), { target: { value: "Rue Test" } });
  fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Tunis" } });
  fireEvent.change(screen.getByLabelText("Capacité"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Prix / créneau (DT)"), { target: { value: "60" } });
}

describe("CreerTerrainForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    global.fetch = vi.fn();
  });

  it("submits with one format and one horaire by default, converting price to millimes", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "t1" }),
    } as Response);

    render(<CreerTerrainForm />);
    remplirChampsObligatoires();
    fireEvent.click(screen.getByRole("button", { name: "Créer le terrain" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/proprietaire/terrains/t1/modifier"));

    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string);
    expect(body.formats).toHaveLength(1);
    expect(body.formats[0].prixParCreneau).toBe(60000);
    expect(body.horaires).toHaveLength(1);
  });

  it("adds and removes format rows", () => {
    render(<CreerTerrainForm />);
    expect(screen.getAllByLabelText("Capacité")).toHaveLength(1);

    fireEvent.click(screen.getByText("+ Ajouter un format"));
    expect(screen.getAllByLabelText("Capacité")).toHaveLength(2);

    fireEvent.click(screen.getAllByText("Retirer")[0]);
    expect(screen.getAllByLabelText("Capacité")).toHaveLength(1);
  });

  it("shows a field error returned by the server", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { nom: ["Le nom est requis"] } }),
    } as Response);

    render(<CreerTerrainForm />);
    remplirChampsObligatoires();
    fireEvent.click(screen.getByRole("button", { name: "Créer le terrain" }));

    expect(await screen.findByText("Le nom est requis")).toBeInTheDocument();
  });
});
