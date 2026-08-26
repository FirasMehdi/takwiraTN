import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreerMatchForm } from "@/components/matchs/CreerMatchForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

const terrains = [
  {
    id: "t1",
    nom: "Complexe El Menzah",
    ville: "Tunis",
    formats: [
      { format: "cinq" as const, capacite: 10 },
      { format: "sept" as const, capacite: 14 },
    ],
  },
  {
    id: "t2",
    nom: "Stade Sousse",
    ville: "Sousse",
    formats: [{ format: "onze" as const, capacite: 22 }],
  },
];

describe("CreerMatchForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    global.fetch = vi.fn();
  });

  it("only offers the formats the selected terrain actually has", () => {
    render(<CreerMatchForm terrains={terrains} />);
    const select = screen.getByLabelText("Format") as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(["cinq", "sept"]);
    expect(screen.getByRole("option", { name: "5 contre 5" })).toBeInTheDocument();
  });

  it("switches the available formats when the terrain changes", () => {
    render(<CreerMatchForm terrains={terrains} />);
    fireEvent.change(screen.getByLabelText("Terrain"), { target: { value: "t2" } });
    const select = screen.getByLabelText("Format") as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(["onze"]);
    expect(select.value).toBe("onze");
    expect((screen.getByLabelText("Joueurs recherchés") as HTMLInputElement).value).toBe("22");
  });

  it("prefills the squad size from the chosen format's capacity", () => {
    render(<CreerMatchForm terrains={terrains} />);
    expect((screen.getByLabelText("Joueurs recherchés") as HTMLInputElement).value).toBe("10");
    fireEvent.change(screen.getByLabelText("Format"), { target: { value: "sept" } });
    expect((screen.getByLabelText("Joueurs recherchés") as HTMLInputElement).value).toBe("14");
  });

  it("counts the organizer as one of the players found when they play", () => {
    render(<CreerMatchForm terrains={terrains} />);
    expect(screen.getByText("Il vous reste 9 joueurs à trouver.")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("J'organise seulement"));
    expect(screen.getByText("Il vous reste 10 joueurs à trouver.")).toBeInTheDocument();
  });

  it("posts the format and the organizer's role", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "m1" }),
    } as Response);

    render(<CreerMatchForm terrains={terrains} />);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-09-07" } });
    fireEvent.change(screen.getByLabelText("Heure de début"), { target: { value: "18:00" } });
    fireEvent.change(screen.getByLabelText("Heure de fin"), { target: { value: "19:30" } });
    fireEvent.click(screen.getByLabelText("J'organise seulement"));
    fireEvent.click(screen.getByRole("button", { name: "Créer le match" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/matchs/m1"));
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      terrainId: "t1",
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      format: "cinq",
      joueursMax: 10,
      organisateurParticipe: false,
    });
  });

  it("shows the field errors returned by the API", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { format: ["Ce terrain ne propose pas ce format"] } }),
    } as Response);

    render(<CreerMatchForm terrains={terrains} />);
    fireEvent.click(screen.getByRole("button", { name: "Créer le match" }));
    await waitFor(() =>
      expect(screen.getByText("Ce terrain ne propose pas ce format")).toBeInTheDocument()
    );
  });
});
