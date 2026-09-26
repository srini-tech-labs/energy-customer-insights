import { EnergyClientError } from "@/lib/client/energyClient";

// Renders any proxy/network failure with a manual Retry action. We never
// auto-retry — especially not on UPSTREAM_TIMEOUT, since the original
// upstream call might still complete (see handoff section 4).
export function ErrorState({
  error,
  onRetry,
}: {
  error: EnergyClientError;
  onRetry: () => void;
}) {
  const retryAfterNote =
    error.code === "UPSTREAM_RATE_LIMITED" ? " Please wait a moment before retrying." : "";

  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="font-medium text-red-800">Something went wrong</p>
      <p className="mt-1 text-sm text-red-700">
        {error.message}
        {retryAfterNote}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        Retry
      </button>
    </div>
  );
}
