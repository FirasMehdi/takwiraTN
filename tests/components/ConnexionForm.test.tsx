import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConnexionForm } from "@/components/forms/ConnexionForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const signInMock = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

describe("ConnexionForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    signInMock.mockReset();
  });

  it("redirects to the dashboard on successful login", async () => {
    signInMock.mockResolvedValue({ error: null });

    render(<ConnexionForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/tableau-de-bord"));
  });

  it("shows a generic error on invalid credentials", async () => {
    signInMock.mockResolvedValue({ error: "CredentialsSignin" });

    render(<ConnexionForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "faux" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Identifiants invalides")).toBeInTheDocument();
  });
});
