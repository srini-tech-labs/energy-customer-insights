import { formatUtcTimestamp } from "@/lib/energy/dates";

export function SnapshotLabel({ snapshotTimestamp }: { snapshotTimestamp: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
      <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-700">
        Modeled ResStock data · 2018
      </span>
      {snapshotTimestamp ? <span>Snapshot created {formatUtcTimestamp(snapshotTimestamp)}</span> : null}
    </div>
  );
}
