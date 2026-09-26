export function ExplainButton({
  onClick,
  disabled,
  isLoading,
}: {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      {isLoading ? "Explaining…" : "Explain this change"}
    </button>
  );
}
