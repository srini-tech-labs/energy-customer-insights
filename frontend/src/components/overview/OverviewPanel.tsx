"use client";

import { useEffect } from "react";
import { useEnergyQuery } from "@/lib/client/useEnergyQuery";
import type { EnergyResult } from "@/lib/energy/types";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { SummaryCards } from "./SummaryCards";
import { BuildingInfoPanel } from "./BuildingInfoPanel";
import { MonthlyElectricityChart } from "./MonthlyElectricityChart";
import { DailyElectricityChart } from "./DailyElectricityChart";
import { EndUseCompositionChart } from "./EndUseCompositionChart";

type AccountDetailsResult = Extract<EnergyResult, { operation: "account_details" }>;

export function OverviewPanel({
  accountId,
  onSnapshotTimestamp,
}: {
  accountId: string;
  onSnapshotTimestamp: (timestamp: string | null) => void;
}) {
  const { data, error, isLoading, snapshotTimestamp, refetch } = useEnergyQuery<AccountDetailsResult>({
    operation: "account_details",
    account_id: accountId,
  });

  useEffect(() => {
    onSnapshotTimestamp(snapshotTimestamp);
  }, [snapshotTimestamp, onSnapshotTimestamp]);

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (isLoading && !data) {
    return <LoadingState label="Loading account overview…" />;
  }

  if (!data) {
    return null;
  }

  const { account, daily_usage, monthly_usage } = data.data;

  return (
    <div className="space-y-6">
      <SummaryCards account={account} />
      <BuildingInfoPanel account={account} />
      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyElectricityChart monthlyUsage={monthly_usage} />
        <DailyElectricityChart dailyUsage={daily_usage} />
      </div>
      <EndUseCompositionChart monthlyUsage={monthly_usage} />
    </div>
  );
}
