import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AmiCard } from "@/components/amis/AmiCard";

describe("AmiCard", () => {
  it("shows the friend's name and links to the conversation", () => {
    render(<AmiCard ami={{ id: "u1", prenom: "Amine", ville: "Tunis" }} />);
    expect(screen.getByText("Amine")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/amis/u1");
  });
});
