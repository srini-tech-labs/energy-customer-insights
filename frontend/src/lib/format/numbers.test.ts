import { describe, expect, it } from "vitest";
import { formatNumberOrNA, formatPercentOrNA, formatSignedOrNA, normalizeNegativeZero } from "./numbers";

describe("null-vs-zero handling", () => {
  it("renders null as Not available, never zero", () => {
    expect(formatNumberOrNA(null)).toBe("Not available");
    expect(formatPercentOrNA(null)).toBe("Not available");
    expect(formatSignedOrNA(null)).toBe("Not available");
  });

  it("renders a real zero as zero", () => {
    expect(formatNumberOrNA(0)).toBe("0.00");
    expect(formatSignedOrNA(0)).toBe("0.00");
  });

  it("normalizes negative zero for display", () => {
    expect(normalizeNegativeZero(-0)).toBe(0);
    expect(Object.is(normalizeNegativeZero(-0), -0)).toBe(false);
    expect(formatSignedOrNA(-0)).toBe("0.00");
  });

  it("does not clamp values above 100% or below 0%", () => {
    expect(formatPercentOrNA(145)).toBe("+145.00%");
    expect(formatPercentOrNA(-20)).toBe("−20.00%");
  });

  it("renders NaN/Infinity as Not available", () => {
    expect(formatNumberOrNA(NaN)).toBe("Not available");
    expect(formatNumberOrNA(Infinity)).toBe("Not available");
  });
});
