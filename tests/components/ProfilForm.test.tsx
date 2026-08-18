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
});
