import { describe, expect, it } from "vitest";
import { formatFahrenheit, formatSignedFahrenheit, formatDegreeDays, formatSignedDegreeDays } from "./weather";

// Numbers taken from the real live v3 capture for DEMO-102517 / 2018-05
// (see src/fixtures/explain-ai.fixture.ts), asserted at the 1-decimal
// display precision specified by the v3 handoff's definition of done.
describe("weather formatters", () => {
  it("formats temperature at 1 decimal with a degree suffix", () => {
    expect(formatFahrenheit(74.12014516129032)).toBe("74.1 °F");
    expect(formatSignedFahrenheit(12.162995161290333)).toBe("+12.2 °F");
  });

  it("formats degree days at 1 decimal with no unit suffix", () => {
    expect(formatDegreeDays(282.7245)).toBe("282.7");
    expect(formatSignedDegreeDays(251.36924999999997)).toBe("+251.4");
    expect(formatDegreeDays(0.0)).toBe("0.0");
    expect(formatSignedDegreeDays(-122.64075)).toBe("−122.6");
  });

  it("renders null as Not available, never zero", () => {
    expect(formatFahrenheit(null)).toBe("Not available");
    expect(formatSignedFahrenheit(null)).toBe("Not available");
    expect(formatDegreeDays(null)).toBe("Not available");
    expect(formatSignedDegreeDays(null)).toBe("Not available");
  });
});
