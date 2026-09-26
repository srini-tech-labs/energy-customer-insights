import { formatMonthLabel } from "@/lib/energy/dates";

export function MonthSelector({
  months,
  selectedMonth,
  onSelect,
}: {
  months: string[];
  selectedMonth: string | null;
  onSelect: (month: string) => void;
}) {
  return (
    <div>
      <label htmlFor="month-select" className="block text-sm font-medium text-slate-700">
        Month
      </label>
      <select
        id="month-select"
        className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        value={selectedMonth ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        {months.map((month) => (
          <option key={month} value={month}>
            {formatMonthLabel(month)}
          </option>
        ))}
      </select>
    </div>
  );
}
