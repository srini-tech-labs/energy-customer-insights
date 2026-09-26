import type { Explanation } from "@/lib/energy/types";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EnergyClientError } from "@/lib/client/energyClient";

const SOURCE_LABEL: Record<Explanation["source"], string> = {
  ai: "AI-generated explanation",
  fallback: "Calculated summary — AI explanation unavailable",
  no_comparison: "No comparison available",
};

export function ExplanationPanel({
  isLoading,
  error,
  explanation,
  onRetry,
}: {
  isLoading: boolean;
  error: EnergyClientError | null;
  explanation: Explanation | null;
  onRetry: () => void;
}) {
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return <LoadingState label="Generating explanation… this can take up to a minute on a cold start." />;
  }

  if (!explanation) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {SOURCE_LABEL[explanation.source]}
      </p>
      {/* Model output is rendered as plain text only — never as HTML/markdown. */}
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{explanation.text}</p>
      {explanation.source === "ai" && explanation.model ? (
        <p className="mt-2 text-xs text-slate-400">Model: {explanation.model}</p>
      ) : null}
    </div>
  );
}
