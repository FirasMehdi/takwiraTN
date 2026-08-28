import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminAnnulerMatchForm } from "@/components/admin/AdminAnnulerMatchForm";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("AdminAnnulerMatchForm", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("starts collapsed, showing only the trigger button", () => {
    render(<AdminAnnulerMatchForm matchId="m1" />);
    expect(screen.getByRole("button", { name: "Annuler le match" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Précisez")).not.toBeInTheDocument();
  });

  it("shows the raisonAutre field only when autre is selected", () => {
    render(<AdminAnnulerMatchForm matchId="m1" />);
    fireEvent.click(screen.getByRole("button", { name: "Annuler le match" }));
    expect(screen.queryByLabelText("Précisez")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Motif de l'annulation"), { target: { value: "autre" } });
    expect(screen.getByLabelText("Précisez")).toBeInTheDocument();
  });

  it("submits the chosen reason and refreshes on success", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);

    render(<AdminAnnulerMatchForm matchId="m1" />);
    fireEvent.click(screen.getByRole("button", { name: "Annuler le match" }));
    fireEvent.change(screen.getByLabelText("Motif de l'annulation"), {
      target: { value: "pas_assez_joueurs" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmer l'annulation" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    const [, requestInit] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((requestInit as RequestInit).body as string);
    expect(body.raison).toBe("pas_assez_joueurs");
  });

  it("shows the server error message on failure", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Ce match est déjà annulé" }),
    } as Response);

    render(<AdminAnnulerMatchForm matchId="m1" />);
    fireEvent.click(screen.getByRole("button", { name: "Annuler le match" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer l'annulation" }));

    expect(await screen.findByText("Ce match est déjà annulé")).toBeInTheDocument();
  });

  it("closes the form when Fermer is clicked", () => {
    render(<AdminAnnulerMatchForm matchId="m1" />);
    fireEvent.click(screen.getByRole("button", { name: "Annuler le match" }));
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.getByRole("button", { name: "Annuler le match" })).toBeInTheDocument();
  });
});
