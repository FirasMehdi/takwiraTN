import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConnexionForm, safeCallbackUrl } from "@/components/forms/ConnexionForm";

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

describe("safeCallbackUrl", () => {
  it("accepts a same-origin relative path", () => {
    expect(safeCallbackUrl("/profil")).toBe("/profil");
  });

  it("falls back when there is no callbackUrl", () => {
    expect(safeCallbackUrl(null)).toBe("/tableau-de-bord");
  });

  it("rejects an absolute external URL", () => {
    expect(safeCallbackUrl("https://evil.com")).toBe("/tableau-de-bord");
    expect(safeCallbackUrl("http://evil.com")).toBe("/tableau-de-bord");
  });

  it("rejects a protocol-relative URL", () => {
    expect(safeCallbackUrl("//evil.com")).toBe("/tableau-de-bord");
  });

  it("rejects the backslash variant some browsers normalize to //", () => {
    expect(safeCallbackUrl("/\\evil.com")).toBe("/tableau-de-bord");
  });

  it("normalizes a value with no leading slash to a same-origin path", () => {
    // Not itself a redirect risk: with no scheme and no "//", this always
    // resolves onto our own origin - just not literally the raw string.
    expect(safeCallbackUrl("evil.com")).toBe("/evil.com");
  });

  it("rejects an embedded-tab control-character payload that normalizes to //evil.com", () => {
    expect(safeCallbackUrl("/\t/evil.com")).toBe("/tableau-de-bord");
  });

  it("rejects an embedded-newline control-character payload that normalizes to //evil.com", () => {
    expect(safeCallbackUrl("/\n/evil.com")).toBe("/tableau-de-bord");
  });
});

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

  it("falls back to the dashboard for an absolute external callbackUrl (open redirect)", async () => {
    signInMock.mockResolvedValue({ error: null });
    searchParamsMock.mockReturnValue(new URLSearchParams("callbackUrl=https://evil.com"));

    render(<ConnexionForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/tableau-de-bord"));
  });

  it("falls back to the dashboard for a protocol-relative callbackUrl (open redirect)", async () => {
    signInMock.mockResolvedValue({ error: null });
    const params = new URLSearchParams();
    params.set("callbackUrl", "//evil.com");
    searchParamsMock.mockReturnValue(params);

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
