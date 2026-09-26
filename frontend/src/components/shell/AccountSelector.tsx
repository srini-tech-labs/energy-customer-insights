"use client";

import { useEnergyQuery } from "@/lib/client/useEnergyQuery";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import type { EnergyResult } from "@/lib/energy/types";

type ListAccountsResult = Extract<EnergyResult, { operation: "list_accounts" }>;

export function AccountSelector({
  selectedAccountId,
  onSelect,
}: {
  selectedAccountId: string | null;
  onSelect: (accountId: string) => void;
}) {
  const { data, error, isLoading, refetch } = useEnergyQuery<ListAccountsResult>({
    operation: "list_accounts",
  });

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (isLoading && !data) {
    return <LoadingState label="Loading accounts…" />;
  }

  const accounts = data?.data.accounts ?? [];

  return (
    <div>
      <label htmlFor="account-select" className="block text-sm font-medium text-slate-700">
        Account
      </label>
      <select
        id="account-select"
        className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        value={selectedAccountId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="" disabled>
          Select an account…
        </option>
        {accounts.map((account) => (
          <option key={account.account_id} value={account.account_id}>
            {account.account_id} — {account.building_type ?? "Unknown building type"}
          </option>
        ))}
      </select>
    </div>
  );
}
