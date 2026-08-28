import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminTerrainStatutForm } from "@/components/admin/AdminTerrainStatutForm";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("AdminTerrainStatutForm", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("pre-selects the current statut", () => {
    render(<AdminTerrainStatutForm terrainId="t1" statutActuel="actif" />);
    expect(screen.getByLabelText("Statut du terrain")).toHaveValue("actif");
  });

  it("submits the new statut and refreshes on success", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);

    render(<AdminTerrainStatutForm terrainId="t1" statutActuel="actif" />);
    fireEvent.change(screen.getByLabelText("Statut du terrain"), { target: { value: "suspendu" } });

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/terrains/t1",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("reverts to the previous statut and shows an error on failure", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Terrain introuvable" }),
    } as Response);

    render(<AdminTerrainStatutForm terrainId="t1" statutActuel="actif" />);
    fireEvent.change(screen.getByLabelText("Statut du terrain"), { target: { value: "suspendu" } });

    await waitFor(() => expect(screen.getByText("Terrain introuvable")).toBeInTheDocument());
    expect(screen.getByLabelText("Statut du terrain")).toHaveValue("actif");
  });
});
