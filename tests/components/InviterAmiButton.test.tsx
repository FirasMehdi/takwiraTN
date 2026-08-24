import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InviterAmiButton } from "@/components/matchs/InviterAmiButton";

describe("InviterAmiButton", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("renders nothing when there is no available friend to invite", () => {
    const { container } = render(
      <InviterAmiButton matchUrl="https://example.com/matchs/m1" amisDisponibles={[]} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a toggle button first, then the friend list once opened", () => {
    render(
      <InviterAmiButton
        matchUrl="https://example.com/matchs/m1"
        amisDisponibles={[{ id: "u1", prenom: "Amine" }]}
      />
    );

    expect(screen.queryByText("Amine")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Inviter un ami" }));
    expect(screen.getByText("Amine")).toBeInTheDocument();
  });

  it("sends an invite message and marks the friend as invited", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);
    render(
      <InviterAmiButton
        matchUrl="https://example.com/matchs/m1"
        amisDisponibles={[{ id: "u1", prenom: "Amine" }]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Inviter un ami" }));
    fireEvent.click(screen.getByRole("button", { name: "Inviter" }));

    await waitFor(() => expect(screen.getByText("Invité")).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/messages/u1",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("https://example.com/matchs/m1"),
      })
    );
  });
});
