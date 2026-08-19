import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfilForm } from "@/components/forms/ProfilForm";

const baseProfile = {
  prenom: "Amine",
  ville: "Sousse",
  poste: null,
  niveau: null,
  piedPrefere: null,
  telephone: null,
  bio: null,
};

describe("ProfilForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("pre-fills the form with the current profile", () => {
    render(<ProfilForm profile={baseProfile} />);
    expect(screen.getByLabelText("Prénom")).toHaveValue("Amine");
    expect(screen.getByLabelText("Ville")).toHaveValue("Sousse");
  });

  it("submits the updated profile and shows a success message", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ...baseProfile, ville: "Sfax" }),
    } as Response);

    render(<ProfilForm profile={baseProfile} />);
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Sfax" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(screen.getByText("Profil mis à jour.")).toBeInTheDocument());
  });

  it("sends null (not undefined) for cleared optional fields", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => baseProfile,
    } as Response);

    render(<ProfilForm profile={{ ...baseProfile, poste: "milieu" }} />);
    fireEvent.change(screen.getByLabelText("Poste"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, requestInit] = vi.mocked(global.fetch).mock.calls[0];
    const sentBody = JSON.parse((requestInit as RequestInit).body as string);
    expect(sentBody.poste).toBeNull();
  });

  it("renders field errors returned by the API on a 400 response", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { prenom: ["Le prénom est requis"] } }),
    } as Response);

    render(<ProfilForm profile={baseProfile} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Le prénom est requis")).toBeInTheDocument();
  });

  it("shows an error and re-enables the button when the network call rejects", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("network down"));

    render(<ProfilForm profile={baseProfile} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      await screen.findByText("Une erreur est survenue. Veuillez réessayer.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer" })).not.toBeDisabled();
  });
});
