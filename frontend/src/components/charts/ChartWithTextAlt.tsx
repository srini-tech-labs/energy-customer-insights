import type { ReactNode } from "react";

// Every chart in this app must ship a textual alternative (handoff section
// 9). This wraps a chart with a collapsible data table carrying the same
// values, so screen-reader/keyboard users and anyone who wants the raw
// numbers aren't limited to the visual encoding.
export function ChartWithTextAlt({
  title,
  chart,
  table,
}: {
  title: string;
  chart: ReactNode;
  table: ReactNode;
}) {
  return (
    <div>
      {title ? <h3 className="text-sm font-medium text-slate-700">{title}</h3> : null}
      <div className="mt-2">{chart}</div>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          View as table
        </summary>
        <div className="mt-2 overflow-x-auto">{table}</div>
      </details>
    </div>
  );
}
