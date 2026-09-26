import { EmptyState } from "@/components/states/EmptyState";

// January has no prior month in this dataset — this is a normal, expected
// state, not a service failure (handoff section 8/9).
export function NoComparisonState() {
  return (
    <EmptyState
      title="No prior month to compare"
      description="This is the first month of coverage, so month-over-month comparison and the AI explanation are not available."
    />
  );
}
