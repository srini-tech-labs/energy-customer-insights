import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EndUseChangeChart } from "./EndUseChangeChart";
import {
  investigateShareOver100Fixture,
  investigateShareNegativeFixture,
} from "@/fixtures/investigate-share-over-100.fixture";
import { investigateNegativeOtherFixture } from "@/fixtures/investigate-negative-other.fixture";

describe("EndUseChangeChart", () => {
  it("renders a cooling share above 100% without clamping", () => {
    render(<EndUseChangeChart comparison={investigateShareOver100Fixture.data.comparison} />);
    expect(screen.getByText(/Cooling share of net usage change:/)).toBeInTheDocument();
    expect(screen.getByText("+145.00%")).toBeInTheDocument();
  });

  it("renders a negative cooling share without clamping to zero", () => {
    render(<EndUseChangeChart comparison={investigateShareNegativeFixture.data.comparison} />);
    expect(screen.getByText("−20.00%")).toBeInTheDocument();
  });

  it("shows a negative end-use change signed, not hidden", () => {
    render(<EndUseChangeChart comparison={investigateNegativeOtherFixture.data.comparison} />);
    const table = screen.getByText("Other (derived)").closest("table");
    expect(table).not.toBeNull();
    expect(table).toHaveTextContent("−9.00");
  });
});
