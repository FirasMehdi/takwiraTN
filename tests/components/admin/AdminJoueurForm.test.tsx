import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminJoueurForm } from "@/components/admin/AdminJoueurForm";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const baseProfile = {
  prenom: "Amine",
  ville: "Sousse",
  poste: null,
  niveau: null,
  piedPrefere: null,
  telephone: null,
  bio: null,
};

describe("AdminJoueurForm", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("pre-fills the form with the current profile", () => {
    render(<AdminJoueurForm joueurId="j1" profile={baseProfile} />);
    expect(screen.getByLabelText("Prénom")).toHaveValue("Amine");
    expect(screen.getByLabelText("Ville")).toHaveValue("Sousse");
  });

  it("submits to the admin joueur endpoint and shows success", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ...baseProfile, ville: "Sfax" }),
    } as Response);

    render(<AdminJoueurForm joueurId="j1" profile={baseProfile} />);
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Sfax" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(screen.getByText("Profil du joueur mis à jour.")).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/joueurs/j1",
      expect.objectContaining({ method: "PUT" })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("renders field errors returned by the API on a 400 response", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { prenom: ["Le prénom est requis"] } }),
    } as Response);

    render(<AdminJoueurForm joueurId="j1" profile={baseProfile} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Le prénom est requis")).toBeInTheDocument();
  });

  it("shows an error and re-enables the button when the network call rejects", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("network down"));

    render(<AdminJoueurForm joueurId="j1" profile={baseProfile} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      await screen.findByText("Une erreur est survenue. Veuillez réessayer.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer" })).not.toBeDisabled();
  });
});
