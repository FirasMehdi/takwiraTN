import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FormatsManager } from "@/components/proprietaire/FormatsManager";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const formats = [
  { id: "f1", format: "cinq" as const, capacite: 10, prixParCreneau: 60000 },
];

describe("FormatsManager", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
    window.confirm = vi.fn(() => true);
  });

  it("renders existing formats", () => {
    render(<FormatsManager terrainId="t1" formats={formats} />);
    expect(screen.getByText(/5 contre 5/)).toBeInTheDocument();
    expect(screen.getByText(/60,000 DT/)).toBeInTheDocument();
  });

  it("adds a new format via POST", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "f2" }),
    } as Response);

    render(<FormatsManager terrainId="t1" formats={formats} />);
    fireEvent.change(screen.getByLabelText("Capacité"), { target: { value: "14" } });
    fireEvent.change(screen.getByLabelText("Prix / créneau (DT)"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/proprietaire/terrains/t1/formats",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("deletes a format after confirmation", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    } as Response);

    render(<FormatsManager terrainId="t1" formats={formats} />);
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/proprietaire/terrains/t1/formats/f1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("switches a row into edit mode and saves via PATCH", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    } as Response);

    render(<FormatsManager terrainId="t1" formats={formats} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/proprietaire/terrains/t1/formats/f1",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("shows a server error message when deletion is refused", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Impossible de supprimer le dernier format d'un terrain" }),
    } as Response);

    render(<FormatsManager terrainId="t1" formats={formats} />);
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));

    expect(
      await screen.findByText("Impossible de supprimer le dernier format d'un terrain")
    ).toBeInTheDocument();
  });
});
