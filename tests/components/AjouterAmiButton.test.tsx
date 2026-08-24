import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AjouterAmiButton } from "@/components/amis/AjouterAmiButton";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("AjouterAmiButton", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("shows an 'Ajouter en ami' button when there is no relation", () => {
    render(<AjouterAmiButton destinataireId="u1" statutInitial="aucune" />);
    expect(screen.getByRole("button", { name: "Ajouter en ami" })).toBeInTheDocument();
  });

  it("sends a friend request and shows the pending state", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);
    render(<AjouterAmiButton destinataireId="u1" statutInitial="aucune" />);

    fireEvent.click(screen.getByRole("button", { name: "Ajouter en ami" }));

    await waitFor(() => expect(screen.getByText("Demande envoyée")).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/amis",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ destinataireId: "u1" }),
      })
    );
  });

  it("shows a pending state when a request was already sent", () => {
    render(<AjouterAmiButton destinataireId="u1" statutInitial="demande_envoyee" />);
    expect(screen.getByText("Demande envoyée")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("links to /amis to respond when a request was received", () => {
    render(<AjouterAmiButton destinataireId="u1" statutInitial="demande_recue" />);
    expect(screen.getByRole("link", { name: "Répondre à sa demande" })).toHaveAttribute(
      "href",
      "/amis"
    );
  });

  it("links to the conversation when already friends", () => {
    render(<AjouterAmiButton destinataireId="u1" statutInitial="amis" />);
    expect(screen.getByRole("link", { name: "Discuter" })).toHaveAttribute("href", "/amis/u1");
  });
});
