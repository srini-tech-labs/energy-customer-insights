import { AppError } from "./errors";
import type { DatabricksEnvelope, EnergyRequest, EnergyResponse } from "./types";

const UPSTREAM_TIMEOUT_MS = 90_000;

// Calls the Databricks serving endpoint for a single operation request and
// returns the decoded inner {ok, result|error} object. The upstream host,
// endpoint name, and token are always read from server-only env vars here —
// this function never accepts a caller-supplied URL.
export async function callEnergyEndpoint(request: EnergyRequest): Promise<EnergyResponse> {
  const host = process.env.DATABRICKS_HOST;
  const endpoint = process.env.ENERGY_SERVING_ENDPOINT;
  const token = process.env.DATABRICKS_TOKEN;

  if (!host || !endpoint || !token) {
    // A configuration problem, not a caller problem — logged with detail
    // server-side, surfaced to the browser as a generic access error.
    console.error(
      "energy proxy misconfigured: missing DATABRICKS_HOST, ENERGY_SERVING_ENDPOINT, or DATABRICKS_TOKEN"
    );
    throw new AppError("UPSTREAM_ACCESS_ERROR", "Energy service access is unavailable");
  }

  const url = `${host.replace(/\/$/, "")}/serving-endpoints/${endpoint}/invocations`;
  const upstreamBody = {
    dataframe_records: [{ request_json: JSON.stringify(request) }],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(upstreamBody),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AppError("UPSTREAM_TIMEOUT", "The energy service is taking longer than expected. Please retry.");
    }
    console.error("energy proxy network error calling Databricks:", err);
    throw new AppError("UPSTREAM_INVALID_RESPONSE", "The energy service returned an unexpected response.");
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 || response.status === 403) {
    console.error(`energy proxy received ${response.status} from Databricks`);
    throw new AppError("UPSTREAM_ACCESS_ERROR", "Energy service access is unavailable");
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    throw new AppError(
      "UPSTREAM_RATE_LIMITED",
      "Energy service is rate-limited. Please retry shortly.",
      retryAfter
    );
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "<unreadable body>");
    console.error(`energy proxy received upstream status ${response.status}:`, bodyText);
    throw new AppError("UPSTREAM_INVALID_RESPONSE", "The energy service returned an unexpected response.");
  }

  let envelope: DatabricksEnvelope;
  try {
    envelope = await response.json();
  } catch (err) {
    console.error("energy proxy failed to parse Databricks envelope as JSON:", err);
    throw new AppError("UPSTREAM_INVALID_RESPONSE", "The energy service returned an unexpected response.");
  }

  const responseJson = envelope?.predictions?.[0]?.response_json;
  if (typeof responseJson !== "string") {
    console.error("energy proxy received malformed Databricks envelope:", envelope);
    throw new AppError("UPSTREAM_INVALID_RESPONSE", "The energy service returned an unexpected response.");
  }

  let decoded: EnergyResponse;
  try {
    decoded = JSON.parse(responseJson);
  } catch (err) {
    console.error("energy proxy failed to parse response_json:", err);
    throw new AppError("UPSTREAM_INVALID_RESPONSE", "The energy service returned an unexpected response.");
  }

  if (typeof decoded !== "object" || decoded === null || !("ok" in decoded)) {
    console.error("energy proxy received unexpected decoded shape:", decoded);
    throw new AppError("UPSTREAM_INVALID_RESPONSE", "The energy service returned an unexpected response.");
  }

  return decoded;
}
