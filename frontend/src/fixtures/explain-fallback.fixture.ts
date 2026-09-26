import type { EnergyResult } from "@/lib/energy/types";
import { explainAiFixture } from "./explain-ai.fixture";

// A successful data response where the LLM call/response failed and the
// backend fell back to a calculated summary — this is NOT a page failure,
// and must not be labeled as an AI explanation (handoff section 8).
export const explainFallbackFixture: Extract<EnergyResult, { operation: "explain_usage" }> = {
  ...explainAiFixture,
  data: {
    ...explainAiFixture.data,
    explanation: {
      text: "Electricity usage increased from 258.51 kWh to 584.69 kWh (+326.18 kWh) between April and May. Average daily usage rose from 8.62 kWh to 18.86 kWh, a change of +118.88%. Cooling accounted for 98.93% of the net change (+322.69 kWh).",
      source: "fallback",
      model: null,
    },
  },
};
