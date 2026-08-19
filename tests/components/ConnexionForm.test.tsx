import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConnexionForm } from "@/components/forms/ConnexionForm";

const pushMock = vi.fn();
const searchParamsMock = vi.fn(() => new URLSearchParams());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsMock(),
}));

const signInMock = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

describe("ConnexionForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    signInMock.mockReset();
    searchParamsMock.mockReset();
    searchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it("redirects to the dashboard on successful login", async () => {
    signInMock.mockResolvedValue({ error: null });

    render(<ConnexionForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/tableau-de-bord"));
  });

  it("redirects to the callbackUrl when present in the query string", async () => {
    signInMock.mockResolvedValue({ error: null });
    searchParamsMock.mockReturnValue(new URLSearchParams("callbackUrl=/profil"));

    render(<ConnexionForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/profil"));
  });

  it("shows a generic error on invalid credentials", async () => {
    signInMock.mockResolvedValue({ error: "CredentialsSignin" });

    render(<ConnexionForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "faux" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Identifiants invalides")).toBeInTheDocument();
  });

  it("shows an error and re-enables the button when the network call rejects", async () => {
    signInMock.mockRejectedValue(new Error("network down"));

    render(<ConnexionForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(
      await screen.findByText("Une erreur est survenue. Veuillez réessayer.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se connecter" })).not.toBeDisabled();
  });
});
