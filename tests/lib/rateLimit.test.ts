import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit, resetRateLimits, extractIp } from "@/lib/rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to `max` requests in a window", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("k", { max: 3, windowMs: 1000 })).toEqual({ allowed: true });
    }
  });

  it("rejects the (max + 1)th request with a positive retryAfterMs", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("k", { max: 3, windowMs: 1000 });
    }
    const result = checkRateLimit("k", { max: 3, windowMs: 1000 });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("tracks a different key independently", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("a", { max: 3, windowMs: 1000 });
    }
    expect(checkRateLimit("a", { max: 3, windowMs: 1000 })).toEqual({ allowed: false, retryAfterMs: expect.any(Number) });
    expect(checkRateLimit("b", { max: 3, windowMs: 1000 })).toEqual({ allowed: true });
  });

  it("resets the count once the window has elapsed", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("k", { max: 3, windowMs: 1000 });
    }
    expect(checkRateLimit("k", { max: 3, windowMs: 1000 }).allowed).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(checkRateLimit("k", { max: 3, windowMs: 1000 })).toEqual({ allowed: true });
  });
});

describe("extractIp", () => {
  it("returns 'unknown' when headers are missing", () => {
    expect(extractIp(null)).toBe("unknown");
    expect(extractIp(undefined)).toBe("unknown");
  });

  it("reads x-forwarded-for from a Headers instance", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(extractIp(headers)).toBe("1.2.3.4");
  });

  it("reads x-forwarded-for from a plain header record", () => {
    expect(extractIp({ "x-forwarded-for": "9.8.7.6" })).toBe("9.8.7.6");
  });

  it("reads x-forwarded-for from an array header value", () => {
    expect(extractIp({ "x-forwarded-for": ["1.1.1.1", "2.2.2.2"] })).toBe("1.1.1.1");
  });

  it("returns 'unknown' when x-forwarded-for is absent", () => {
    expect(extractIp({})).toBe("unknown");
  });
});
