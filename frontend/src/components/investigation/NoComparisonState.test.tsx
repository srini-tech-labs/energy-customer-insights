import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoComparisonState } from "./NoComparisonState";

describe("NoComparisonState", () => {
  it("presents January as a normal empty state, not an error", () => {
    render(<NoComparisonState />);
    expect(screen.getByText("No prior month to compare")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
