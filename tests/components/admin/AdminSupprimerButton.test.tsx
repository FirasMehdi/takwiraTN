import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminSupprimerButton } from "@/components/admin/AdminSupprimerButton";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

describe("AdminSupprimerButton", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    global.fetch = vi.fn();
    window.confirm = vi.fn();
  });

  it("does nothing when the confirmation is declined", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(
      <AdminSupprimerButton url="/api/admin/joueurs/j1" confirmation="Sûr ?" redirectApres="/admin/joueurs" />
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("deletes and redirects when confirmed", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);

    render(
      <AdminSupprimerButton url="/api/admin/joueurs/j1" confirmation="Sûr ?" redirectApres="/admin/joueurs" />
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/admin/joueurs"));
    expect(global.fetch).toHaveBeenCalledWith("/api/admin/joueurs/j1", { method: "DELETE" });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows the server error message on failure", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Joueur introuvable" }),
    } as Response);

    render(
      <AdminSupprimerButton url="/api/admin/joueurs/j1" confirmation="Sûr ?" redirectApres="/admin/joueurs" />
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(await screen.findByText("Joueur introuvable")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("renders a custom libelle", () => {
    render(
      <AdminSupprimerButton
        url="/api/admin/terrains/t1"
        confirmation="Sûr ?"
        redirectApres="/admin/terrains"
        libelle="Supprimer le terrain"
      />
    );
    expect(screen.getByRole("button", { name: "Supprimer le terrain" })).toBeInTheDocument();
  });
});
