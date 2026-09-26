"use client";

import { useCallback, useMemo, useState } from "react";
import { AccountSelector } from "@/components/shell/AccountSelector";
import { SnapshotLabel } from "@/components/shell/SnapshotLabel";
import { RefreshButton } from "@/components/shell/RefreshButton";
import { OverviewPanel } from "@/components/overview/OverviewPanel";
import { MonthSelector } from "@/components/investigation/MonthSelector";
import { InvestigationPanel } from "@/components/investigation/InvestigationPanel";
import { useEnergyQuery, refetchEnergyQuery } from "@/lib/client/useEnergyQuery";
import { monthKey } from "@/lib/energy/dates";
import type { EnergyResult } from "@/lib/energy/types";

type AccountDetailsResult = Extract<EnergyResult, { operation: "account_details" }>;

const PREFERRED_ACCOUNT = "DEMO-102517";
const PREFERRED_MONTH = "2018-05";

export default function HomePage() {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [monthDefaultFor, setMonthDefaultFor] = useState<string | null>(null);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<string | null>(null);

  // Shares the same cache entry as OverviewPanel's own account_details
  // fetch (keyed identically) — used here only to derive the month list
  // and default-month selection, not to duplicate the network request.
  const { data, refetch: refetchAccountDetails, isLoading: isAccountLoading } = useEnergyQuery<AccountDetailsResult>(
    accountId ? { operation: "account_details", account_id: accountId } : null
  );

  const months = useMemo(() => {
    if (!data) return [];
    const keys = new Set(data.data.monthly_usage.map((m) => monthKey(m.usage_month)));
    return [...keys].sort();
  }, [data]);

  // Apply the documented default month (2018-05 for DEMO-102517 when
  // available, else the first available month with a predecessor) as soon
  // as the newly-selected account's months become known. Adjusted during
  // render rather than via an effect, per React's guidance for state that
  // depends on another value changing.
  if (accountId && accountId !== monthDefaultFor && months.length > 0) {
    const defaultMonth =
      accountId === PREFERRED_ACCOUNT && months.includes(PREFERRED_MONTH)
        ? PREFERRED_MONTH
        : months.length > 1
          ? months[1]
          : months[0];
    setMonth(defaultMonth);
    setMonthDefaultFor(accountId);
  }

  const handleSelectAccount = useCallback((id: string) => {
    setAccountId(id);
    setMonth(null);
    setMonthDefaultFor(null);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchAccountDetails();
    if (accountId && month) {
      refetchEnergyQuery({ operation: "investigate_usage", account_id: accountId, month });
    }
  }, [refetchAccountDetails, accountId, month]);

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Energy Customer Insights</h1>
        <p className="mt-1 text-sm text-slate-600">
          Modeled building energy profiles for a small set of demo accounts — not live utility
          meter data, billing, or a production customer portal.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <SnapshotLabel snapshotTimestamp={snapshotTimestamp} />
          {accountId ? <RefreshButton onRefresh={handleRefresh} isLoading={isAccountLoading} /> : null}
        </div>
      </header>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <AccountSelector selectedAccountId={accountId} onSelect={handleSelectAccount} />
      </section>

      {accountId ? (
        <>
          <section aria-labelledby="overview-heading" className="mb-10">
            <h2 id="overview-heading" className="mb-4 text-lg font-semibold text-slate-900">
              Account overview
            </h2>
            <OverviewPanel accountId={accountId} onSnapshotTimestamp={setSnapshotTimestamp} />
          </section>

          {months.length > 0 && month ? (
            <section aria-labelledby="investigation-heading">
              <h2 id="investigation-heading" className="mb-4 text-lg font-semibold text-slate-900">
                Monthly investigation
              </h2>
              <div className="mb-4">
                <MonthSelector months={months} selectedMonth={month} onSelect={setMonth} />
              </div>
              {/* Remounting on account/month change resets all local
                  investigation/explanation state for free — no effect needed. */}
              <InvestigationPanel key={`${accountId}:${month}`} accountId={accountId} month={month} />
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
