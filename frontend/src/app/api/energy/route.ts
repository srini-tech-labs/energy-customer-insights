import { NextRequest, NextResponse } from "next/server";
import { AppError, mapToHttp } from "@/lib/energy/errors";
import { validateEnergyRequest } from "@/lib/energy/validation";
import { callEnergyEndpoint } from "@/lib/energy/callEnergyEndpoint";

const MAX_BODY_BYTES = 8 * 1024;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    const { status, body, headers } = mapToHttp(
      new AppError("PAYLOAD_TOO_LARGE", "Request body is too large.")
    );
    return NextResponse.json(body, { status, headers });
  }

  let parsedBody: unknown;
  try {
    parsedBody = rawBody.length > 0 ? JSON.parse(rawBody) : {};
  } catch {
    const { status, body, headers } = mapToHttp(
      new AppError("MALFORMED_REQUEST", "Request must be a JSON object.")
    );
    return NextResponse.json(body, { status, headers });
  }

  try {
    const energyRequest = validateEnergyRequest(parsedBody);
    const decoded = await callEnergyEndpoint(energyRequest);

    if (decoded.ok === false) {
      // Upstream handled-error response: pass the decoded error through
      // verbatim, per the handoff's error-mapping table.
      return NextResponse.json(decoded, { status: 400 });
    }

    return NextResponse.json(decoded, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      const { status, body, headers } = mapToHttp(err);
      return NextResponse.json(body, { status, headers });
    }

    console.error("energy proxy unexpected error:", err);
    const { status, body, headers } = mapToHttp(
      new AppError("UPSTREAM_INVALID_RESPONSE", "The energy service returned an unexpected response.")
    );
    return NextResponse.json(body, { status, headers });
  }
}
