import { describe, it, expect } from "vitest";
import { joueurListQuerySchema } from "@/lib/validation/joueur";

describe("joueurListQuerySchema", () => {
  it("accepts an empty query", () => {
    expect(joueurListQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts a valid ville and poste", () => {
    const result = joueurListQuerySchema.safeParse({ ville: "Tunis", poste: "gardien" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid poste", () => {
    const result = joueurListQuerySchema.safeParse({ poste: "capitaine" });
    expect(result.success).toBe(false);
  });

  it("rejects a ville longer than 80 characters", () => {
    const result = joueurListQuerySchema.safeParse({ ville: "a".repeat(81) });
    expect(result.success).toBe(false);
  });
});
