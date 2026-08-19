import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeconnexionButton } from "@/components/auth/DeconnexionButton";

const signOutMock = vi.fn();
vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

describe("DeconnexionButton", () => {
  beforeEach(() => {
    signOutMock.mockReset();
  });

  it("calls signOut with a redirect to the homepage", () => {
    render(<DeconnexionButton />);
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});
