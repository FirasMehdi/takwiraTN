import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InscriptionForm } from "@/components/forms/InscriptionForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("InscriptionForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    global.fetch = vi.fn();
  });

  it("submits the form and redirects on success", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "1", email: "sami@example.com" }),
    } as Response);

    render(<InscriptionForm />);
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Sami" } });
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Tunis" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/connexion?inscription=reussie")
    );
  });

  it("shows a field error returned by the server", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { email: ["Cet e-mail est déjà utilisé"] } }),
    } as Response);

    render(<InscriptionForm />);
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Sami" } });
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Tunis" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "dup@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByText("Cet e-mail est déjà utilisé")).toBeInTheDocument();
  });
});
