"use client";

import { useEffect, useRef, useState } from "react";
import { useEnergyQuery } from "@/lib/client/useEnergyQuery";
import { postEnergy, EnergyClientError } from "@/lib/client/energyClient";
import type { EnergyResult, Explanation } from "@/lib/energy/types";
import { MonthComparisonCards } from "./MonthComparisonCards";
import { EndUseChangeChart } from "./EndUseChangeChart";
import { WeatherContext } from "./WeatherContext";
import { NoComparisonState } from "./NoComparisonState";
import { ExplainButton } from "./ExplainButton";
import { ExplanationPanel } from "./ExplanationPanel";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";

type InvestigateResult = Extract<EnergyResult, { operation: "investigate_usage" }>;
type ExplainResult = Extract<EnergyResult, { operation: "explain_usage" }>;

export function InvestigationPanel({ accountId, month }: { accountId: string; month: string }) {
  const { data, error, isLoading, refetch } = useEnergyQuery<InvestigateResult>({
    operation: "investigate_usage",
    account_id: accountId,
    month,
  });

  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explainSnapshot, setExplainSnapshot] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<EnergyClientError | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  // The parent remounts this component (via a `key` on account+month) on
  // every selection change, which resets all of this local state for free
  // and is why there is no reset effect here. Only abort any in-flight
  // request on unmount.
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const handleExplain = () => {
    if (explainLoading) return; // guard against duplicate submits
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setExplainLoading(true);
    setExplainError(null);

    postEnergy<ExplainResult>(
      { operation: "explain_usage", account_id: accountId, month },
      controller.signal
    )
      .then((result) => {
        setExplanation(result.data.explanation);
        setExplainSnapshot(result.metadata.created_at_utc);
        setExplainLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setExplainError(
          err instanceof EnergyClientError
            ? err
            : new EnergyClientError("UPSTREAM_INVALID_RESPONSE", "Something went wrong.")
        );
        setExplainLoading(false);
      });
  };

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (isLoading && !data) {
    return <LoadingState label="Loading investigation…" />;
  }

  if (!data) {
    return null;
  }

  const { comparison_available, comparison, explanation_scope } = data.data;

  if (!comparison_available) {
    return <NoComparisonState />;
  }

  // If the explanation call landed on a different snapshot than the
  // evidence currently on screen, never present them as one consistent
  // picture — surface it and let the user pull the matching evidence.
  const snapshotMismatch = explainSnapshot !== null && explainSnapshot !== data.metadata.created_at_utc;

  return (
    <div className="space-y-4">
      <MonthComparisonCards comparison={comparison} />
      <EndUseChangeChart comparison={comparison} />
      <WeatherContext comparison={comparison} degreeDayBaseF={data.metadata.degree_day_base_f} />
      <p className="text-xs text-slate-500">{explanation_scope}</p>
      <div>
        <ExplainButton onClick={handleExplain} disabled={false} isLoading={explainLoading} />
      </div>
      {snapshotMismatch ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          This explanation was generated from a newer data snapshot than the evidence shown above.{" "}
          <button type="button" onClick={refetch} className="font-medium underline underline-offset-2">
            Refresh to reconcile
          </button>
          .
        </div>
      ) : null}
      <ExplanationPanel
        isLoading={explainLoading}
        error={explainError}
        explanation={explanation}
        onRetry={handleExplain}
      />
    </div>
  );
}
