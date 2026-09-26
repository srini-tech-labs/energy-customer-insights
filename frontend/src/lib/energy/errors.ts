import type { EnergyResponse } from "./types";

// Proxy-specific error codes. These are emitted by this app's /api/energy
// route, not by the Databricks model — do not confuse with upstream
// `error.code` values like "INVALID_REQUEST".
export type AppErrorCode =
  | "MALFORMED_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_OPERATION"
  | "MISSING_FIELD"
  | "INVALID_MONTH_FORMAT"
  | "UPSTREAM_ACCESS_ERROR"
  | "UPSTREAM_RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_INVALID_RESPONSE";

export class AppError extends Error {
  code: AppErrorCode;
  retryAfter?: string | null;

  constructor(code: AppErrorCode, message: string, retryAfter?: string | null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.retryAfter = retryAfter ?? null;
  }
}

export interface HttpErrorMapping {
  status: number;
  body: EnergyResponse;
  headers?: Record<string, string>;
}

// Single source of truth for the error-mapping table in the handoff
// (section 4, "Error mapping for the new proxy"). Kept independent of
// network calls so it can be exercised directly by fixtures/tests.
export function mapToHttp(err: AppError): HttpErrorMapping {
  switch (err.code) {
    case "MALFORMED_REQUEST":
      return badRequest(err.code, err.message);
    case "PAYLOAD_TOO_LARGE":
      return { status: 413, body: errorBody(err.code, err.message) };
    case "UNSUPPORTED_OPERATION":
      return badRequest(err.code, err.message);
    case "MISSING_FIELD":
      return badRequest(err.code, err.message);
    case "INVALID_MONTH_FORMAT":
      return badRequest(err.code, err.message);
    case "UPSTREAM_ACCESS_ERROR":
      return {
        status: 502,
        body: errorBody(err.code, "Energy service access is unavailable"),
      };
    case "UPSTREAM_RATE_LIMITED":
      return {
        status: 429,
        body: errorBody(err.code, "Energy service is rate-limited. Please retry shortly."),
        headers: err.retryAfter ? { "Retry-After": err.retryAfter } : undefined,
      };
    case "UPSTREAM_TIMEOUT":
      return {
        status: 504,
        body: errorBody(err.code, "The energy service is taking longer than expected. Please retry."),
      };
    case "UPSTREAM_INVALID_RESPONSE":
      return {
        status: 502,
        body: errorBody(err.code, "The energy service returned an unexpected response."),
      };
    default: {
      const exhaustiveCheck: never = err.code;
      throw new Error(`Unhandled AppErrorCode: ${exhaustiveCheck}`);
    }
  }
}

function badRequest(code: AppErrorCode, message: string): HttpErrorMapping {
  return { status: 400, body: errorBody(code, message) };
}

function errorBody(code: string, message: string): EnergyResponse {
  return { ok: false, error: { code, message } };
}
