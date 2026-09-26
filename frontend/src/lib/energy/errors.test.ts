import { describe, expect, it } from "vitest";
import { AppError, mapToHttp } from "./errors";

describe("mapToHttp", () => {
  it("maps UPSTREAM_ACCESS_ERROR to a sanitized 502", () => {
    const { status, body } = mapToHttp(new AppError("UPSTREAM_ACCESS_ERROR", "raw upstream detail"));
    expect(status).toBe(502);
    expect(body).toEqual({
      ok: false,
      error: { code: "UPSTREAM_ACCESS_ERROR", message: "Energy service access is unavailable" },
    });
  });

  it("maps UPSTREAM_RATE_LIMITED to 429 and preserves Retry-After", () => {
    const { status, headers } = mapToHttp(new AppError("UPSTREAM_RATE_LIMITED", "rate limited", "30"));
    expect(status).toBe(429);
    expect(headers).toEqual({ "Retry-After": "30" });
  });

  it("maps UPSTREAM_TIMEOUT to 504", () => {
    const { status } = mapToHttp(new AppError("UPSTREAM_TIMEOUT", "timed out"));
    expect(status).toBe(504);
  });

  it("maps UPSTREAM_INVALID_RESPONSE to a generic 502", () => {
    const { status, body } = mapToHttp(new AppError("UPSTREAM_INVALID_RESPONSE", "malformed"));
    expect(status).toBe(502);
    if (!body.ok) {
      expect(body.error.message).toBe("The energy service returned an unexpected response.");
    }
  });

  it("maps validation errors to 400", () => {
    expect(mapToHttp(new AppError("UNSUPPORTED_OPERATION", "bad op")).status).toBe(400);
    expect(mapToHttp(new AppError("MISSING_FIELD", "missing")).status).toBe(400);
    expect(mapToHttp(new AppError("INVALID_MONTH_FORMAT", "bad month")).status).toBe(400);
    expect(mapToHttp(new AppError("MALFORMED_REQUEST", "bad json")).status).toBe(400);
  });
});
