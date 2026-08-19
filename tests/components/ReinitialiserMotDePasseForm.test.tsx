import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReinitialiserMotDePasseForm } from "@/components/forms/ReinitialiserMotDePasseForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("ReinitialiserMotDePasseForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    global.fetch = vi.fn();
  });

  it("submits the token and new password, then redirects", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Mot de passe mis à jour." }),
    } as Response);

    render(<ReinitialiserMotDePasseForm token="abc123" />);
    fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "nouveaumdp1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/connexion?reinitialisation=reussie")
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/reinitialiser-mot-de-passe",
      expect.objectContaining({
        body: JSON.stringify({ token: "abc123", password: "nouveaumdp1" }),
      })
    );
  });

  it("shows the server error when the token is invalid", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { token: ["Ce lien n'est plus valide, veuillez en redemander un."] } }),
    } as Response);

    render(<ReinitialiserMotDePasseForm token="abc123" />);
    fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "nouveaumdp1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(
      await screen.findByText("Ce lien n'est plus valide, veuillez en redemander un.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Redemander un lien de réinitialisation" })
    ).toHaveAttribute("href", "/mot-de-passe-oublie");
  });

  it("shows an error and re-enables the button when the network call rejects", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("network down"));

    render(<ReinitialiserMotDePasseForm token="abc123" />);
    fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "nouveaumdp1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(
      await screen.findByText("Une erreur est survenue. Veuillez réessayer.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réinitialiser" })).not.toBeDisabled();
  });
});
