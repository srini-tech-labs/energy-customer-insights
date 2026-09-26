import { describe, expect, it } from "vitest";
import { dateKey, monthKey, formatMonthLabel } from "./dates";

describe("date string-slicing helpers", () => {
  it("extracts a date key without timezone conversion", () => {
    expect(dateKey("2018-01-01T00:00:00.000")).toBe("2018-01-01");
  });

  it("extracts a month key without timezone conversion", () => {
    expect(monthKey("2018-05-01T00:00:00.000")).toBe("2018-05");
  });

  it("never shifts January 1 into the previous year", () => {
    expect(dateKey("2018-01-01T00:00:00.000")).toBe("2018-01-01");
    expect(monthKey("2018-01-01T00:00:00.000")).toBe("2018-01");
  });

  it("formats a month label from a YYYY-MM key", () => {
    expect(formatMonthLabel("2018-05")).toBe("May 2018");
    expect(formatMonthLabel("2018-01")).toBe("January 2018");
  });

  it("ignores the v3 trailing Z suffix — still string-slicing, not Date parsing", () => {
    expect(dateKey("2018-05-01T00:00:00.000Z")).toBe("2018-05-01");
    expect(monthKey("2018-05-01T00:00:00.000Z")).toBe("2018-05");
  });
});
