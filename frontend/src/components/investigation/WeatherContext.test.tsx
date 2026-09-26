import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeatherContext } from "./WeatherContext";
import { explainAiFixture } from "@/fixtures/explain-ai.fixture";

describe("WeatherContext", () => {
  it("renders the definition-of-done numbers for DEMO-102517 / 2018-05", () => {
    render(
      <WeatherContext
        comparison={explainAiFixture.data.comparison}
        degreeDayBaseF={explainAiFixture.metadata.degree_day_base_f}
      />
    );
    expect(screen.getByText("74.1 °F")).toBeInTheDocument();
    expect(screen.getByText(/Change: \+12\.2 °F/)).toBeInTheDocument();
    expect(screen.getByText("282.7")).toBeInTheDocument();
    expect(screen.getByText(/Change: \+251\.4/)).toBeInTheDocument();
    expect(screen.getByText("0.0")).toBeInTheDocument();
    expect(screen.getByText(/Change: −122\.6/)).toBeInTheDocument();
    expect(screen.getByText(/Weather station: Fort Benning, AL/)).toBeInTheDocument();
  });

  it("renders Not available for missing previous/change fields without throwing", () => {
    const comparison = {
      ...explainAiFixture.data.comparison,
      previous_average_temperature_f: null,
      average_temperature_change_f: null,
      previous_cooling_degree_days_65: null,
      cooling_degree_days_change_65: null,
      previous_heating_degree_days_65: null,
      heating_degree_days_change_65: null,
    };
    render(<WeatherContext comparison={comparison} degreeDayBaseF={65} />);
    expect(screen.getAllByText(/Not available/).length).toBeGreaterThanOrEqual(6);
  });

  it("omits the weather location line when city and state are both null", () => {
    const comparison = {
      ...explainAiFixture.data.comparison,
      weather_city: null,
      state: null,
    };
    render(<WeatherContext comparison={comparison} degreeDayBaseF={65} />);
    expect(screen.queryByText(/Weather station/)).not.toBeInTheDocument();
  });
});
