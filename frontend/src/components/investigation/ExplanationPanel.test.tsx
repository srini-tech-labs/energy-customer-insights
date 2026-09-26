import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExplanationPanel } from "./ExplanationPanel";
import { explainAiFixture } from "@/fixtures/explain-ai.fixture";
import { explainFallbackFixture } from "@/fixtures/explain-fallback.fixture";
import { errorFixtures } from "@/fixtures/errors.fixture";

describe("ExplanationPanel", () => {
  it("labels an AI explanation and shows the model", () => {
    render(
      <ExplanationPanel
        isLoading={false}
        error={null}
        explanation={explainAiFixture.data.explanation}
        onRetry={() => {}}
      />
    );
    expect(screen.getByText("AI-generated explanation")).toBeInTheDocument();
    expect(screen.getByText(/system\.ai\.meta-llama-3-3-70b-instruct/)).toBeInTheDocument();
  });

  it("labels a fallback explanation distinctly from an AI success", () => {
    render(
      <ExplanationPanel
        isLoading={false}
        error={null}
        explanation={explainFallbackFixture.data.explanation}
        onRetry={() => {}}
      />
    );
    expect(screen.getByText("Calculated summary — AI explanation unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/Model:/)).not.toBeInTheDocument();
  });

  it("does not render as an AI explanation when source is no_comparison", () => {
    const explanation = {
      text: "No prior month available.",
      source: "no_comparison" as const,
      model: null,
    };
    render(<ExplanationPanel isLoading={false} error={null} explanation={explanation} onRetry={() => {}} />);
    expect(screen.getByText("No comparison available")).toBeInTheDocument();
  });

  it("shows a manual retry action on error, not an auto-retry", () => {
    const onRetry = vi.fn();
    render(
      <ExplanationPanel isLoading={false} error={errorFixtures.timeout} explanation={null} onRetry={onRetry} />
    );
    const button = screen.getByRole("button", { name: "Retry" });
    button.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
