import type { EnergyRequest, EnergyResponse, EnergyResult } from "@/lib/energy/types";

// Mirrors the shape of a decoded upstream error so ErrorState can render
// off one type regardless of whether the failure was network-level or an
// {ok:false} API response.
export class EnergyClientError extends Error {
  code: string;
  httpStatus?: number;

  constructor(code: string, message: string, httpStatus?: number) {
    super(message);
    this.name = "EnergyClientError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export async function postEnergy<T extends EnergyResult>(
  request: EnergyRequest,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch("/api/energy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  let decoded: EnergyResponse;
  try {
    decoded = await response.json();
  } catch {
    throw new EnergyClientError(
      "UPSTREAM_INVALID_RESPONSE",
      "The energy service returned an unexpected response.",
      response.status
    );
  }

  if (decoded.ok === false) {
    throw new EnergyClientError(decoded.error.code, decoded.error.message, response.status);
  }

  return decoded.result as T;
}
