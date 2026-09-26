export function RefreshButton({ onRefresh, isLoading }: { onRefresh: () => void; isLoading: boolean }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isLoading}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      {isLoading ? "Refreshing…" : "Refresh data"}
    </button>
  );
}
