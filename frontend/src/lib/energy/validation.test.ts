import { describe, expect, it } from "vitest";
import { validateEnergyRequest } from "./validation";
import { AppError } from "./errors";

describe("validateEnergyRequest", () => {
  it("accepts list_accounts with no extra fields", () => {
    expect(validateEnergyRequest({ operation: "list_accounts" })).toEqual({ operation: "list_accounts" });
  });

  it("accepts account_details with an account_id", () => {
    expect(validateEnergyRequest({ operation: "account_details", account_id: "DEMO-102517" })).toEqual({
      operation: "account_details",
      account_id: "DEMO-102517",
    });
  });

  it("accepts investigate_usage with a valid YYYY-MM month", () => {
    expect(
      validateEnergyRequest({ operation: "investigate_usage", account_id: "DEMO-102517", month: "2018-05" })
    ).toEqual({ operation: "investigate_usage", account_id: "DEMO-102517", month: "2018-05" });
  });

  it("rejects an unknown operation", () => {
    expect(() => validateEnergyRequest({ operation: "bogus_op" })).toThrowError(AppError);
    try {
      validateEnergyRequest({ operation: "bogus_op" });
    } catch (err) {
      expect((err as AppError).code).toBe("UNSUPPORTED_OPERATION");
    }
  });

  it("rejects a missing account_id", () => {
    try {
      validateEnergyRequest({ operation: "account_details" });
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe("MISSING_FIELD");
    }
  });

  it("rejects a malformed month", () => {
    try {
      validateEnergyRequest({ operation: "investigate_usage", account_id: "DEMO-102517", month: "18-5" });
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe("INVALID_MONTH_FORMAT");
    }
  });

  it("rejects a non-object body", () => {
    try {
      validateEnergyRequest("not-an-object");
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe("MALFORMED_REQUEST");
    }
  });
});
