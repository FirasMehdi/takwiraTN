import { describe, it, expect } from "vitest";
import { reservationSchema } from "@/lib/validation/reservation";

describe("reservationSchema", () => {
  it("accepts a valid payload", () => {
    const result = reservationSchema.safeParse({ date: "2026-09-07", heureDebut: "18:00" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid date", () => {
    const result = reservationSchema.safeParse({ date: "2026-13-01", heureDebut: "18:00" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid heure", () => {
    const result = reservationSchema.safeParse({ date: "2026-09-07", heureDebut: "25:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing date", () => {
    const result = reservationSchema.safeParse({ heureDebut: "18:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing heureDebut", () => {
    const result = reservationSchema.safeParse({ date: "2026-09-07" });
    expect(result.success).toBe(false);
  });
});
