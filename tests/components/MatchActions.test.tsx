import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MatchActions } from "@/components/matchs/MatchActions";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

let sessionStatus = "authenticated";
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: sessionStatus }),
}));

describe("MatchActions", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    sessionStatus = "authenticated";
    global.fetch = vi.fn();
  });

  it("shows a join button when not registered and the match is open", () => {
    render(<MatchActions matchId="m1" statut="ouvert" estOrganisateur={false} estInscrit={false} />);
    expect(screen.getByRole("button", { name: "Rejoindre le match" })).toBeEnabled();
  });

  it("disables joining when the match is full", () => {
    render(<MatchActions matchId="m1" statut="complet" estOrganisateur={false} estInscrit={false} />);
    expect(screen.getByRole("button", { name: "Match complet" })).toBeDisabled();
  });

  it("shows a leave button when already registered", () => {
    render(<MatchActions matchId="m1" statut="ouvert" estOrganisateur={false} estInscrit={true} />);
    expect(screen.getByRole("button", { name: "Quitter le match" })).toBeInTheDocument();
  });

  it("shows a cancel button for the organizer", () => {
    render(<MatchActions matchId="m1" statut="ouvert" estOrganisateur={true} estInscrit={true} />);
    expect(screen.getByRole("button", { name: "Annuler le match" })).toBeInTheDocument();
  });

  it("shows a cancelled message when statut is annule", () => {
    render(<MatchActions matchId="m1" statut="annule" estOrganisateur={false} estInscrit={false} />);
    expect(screen.getByText("Ce match a été annulé.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("redirects to /connexion instead of calling the API when logged out", () => {
    sessionStatus = "unauthenticated";
    render(<MatchActions matchId="m1" statut="ouvert" estOrganisateur={false} estInscrit={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Rejoindre le match" }));
    expect(pushMock).toHaveBeenCalledWith("/connexion?callbackUrl=%2Fmatchs%2Fm1");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("joins the match and refreshes on success", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);
    render(<MatchActions matchId="m1" statut="ouvert" estOrganisateur={false} estInscrit={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Rejoindre le match" }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith("/api/matchs/m1/rejoindre", { method: "POST" });
  });

  it("shows the server error message on failure", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Ce match est complet" }),
    } as Response);
    render(<MatchActions matchId="m1" statut="ouvert" estOrganisateur={false} estInscrit={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Rejoindre le match" }));
    await waitFor(() => expect(screen.getByText("Ce match est complet")).toBeInTheDocument());
  });
});
