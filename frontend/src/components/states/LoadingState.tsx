export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-6 text-slate-600">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
      />
      <span>{label}</span>
    </div>
  );
}
