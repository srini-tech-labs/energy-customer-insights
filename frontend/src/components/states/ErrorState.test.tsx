import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorState } from "./ErrorState";
import { errorFixtures } from "@/fixtures/errors.fixture";

describe("ErrorState", () => {
  it.each(Object.entries(errorFixtures))("renders %s with a manual retry action", (_name, error) => {
    const onRetry = vi.fn();
    render(<ErrorState error={error} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(error.message);
    screen.getByRole("button", { name: "Retry" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("never renders raw upstream detail — only the sanitized message", () => {
    render(<ErrorState error={errorFixtures.accessError} onRetry={() => {}} />);
    expect(screen.getByText("Energy service access is unavailable")).toBeInTheDocument();
  });
});
