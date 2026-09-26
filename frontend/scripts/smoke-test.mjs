#!/usr/bin/env node
// Live-endpoint checks against the running local proxy (npm run dev/start
// must already be up on the target). Exercises the documented worked
// example with float tolerance, per Claude_Energy_Frontend_Handoff.md
// section 11.

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const FLOAT_TOLERANCE = 0.001;

let failures = 0;

function log(pass, label, detail) {
  if (pass) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function close(actual, expected, tolerance = FLOAT_TOLERANCE) {
  return typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
}

async function post(body) {
  const res = await fetch(`${BASE_URL}/api/energy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  console.log(`Smoke-testing ${BASE_URL} ...\n`);

  console.log("list_accounts");
  {
    const { status, json } = await post({ operation: "list_accounts" });
    log(status === 200, "returns HTTP 200");
    log(Boolean(json?.ok), "returns ok:true");
    const accounts = json?.result?.data?.accounts ?? [];
    const ids = accounts.map((a) => a.account_id).sort();
    // Account count is intentionally not pinned to an exact number — new
    // buildings are onboarded dynamically (see docs/validation-results.md),
    // so this list is expected to grow over time without any code change.
    log(
      accounts.length >= 4,
      "returns at least the 4 validated demo accounts",
      `got ${accounts.length}: ${JSON.stringify(ids)}`
    );
    log(
      ids.includes("DEMO-102517"),
      "includes the DEMO-102517 worked-example account used below",
      JSON.stringify(ids)
    );
  }

  console.log("\naccount_details (DEMO-102517)");
  {
    const { status, json } = await post({ operation: "account_details", account_id: "DEMO-102517" });
    log(status === 200, "returns HTTP 200");
    const daily = json?.result?.data?.daily_usage ?? [];
    const monthly = json?.result?.data?.monthly_usage ?? [];
    log(daily.length === 365, "returns 365 daily records", `got ${daily.length}`);
    log(monthly.length === 12, "returns 12 monthly records", `got ${monthly.length}`);
  }

  console.log("\ninvestigate_usage (DEMO-102517 / 2018-05 — verified worked example)");
  {
    const { status, json } = await post({
      operation: "investigate_usage",
      account_id: "DEMO-102517",
      month: "2018-05",
    });
    log(status === 200, "returns HTTP 200");
    const c = json?.result?.data?.comparison;
    log(Boolean(c), "returns a comparison object");
    if (c) {
      log(close(c.electricity_kwh, 584.687), "electricity_kwh matches", c.electricity_kwh);
      log(close(c.previous_electricity_kwh, 258.51), "previous_electricity_kwh matches", c.previous_electricity_kwh);
      log(close(c.electricity_change_kwh, 326.177), "electricity_change_kwh matches", c.electricity_change_kwh);
      log(
        close(c.daily_usage_change_pct, 118.8797837733, 0.01),
        "daily_usage_change_pct matches",
        c.daily_usage_change_pct
      );
      log(close(c.cooling_change_kwh, 322.692), "cooling_change_kwh matches", c.cooling_change_kwh);
      log(
        close(c.cooling_share_of_net_change_pct, 98.9315616981, 0.01),
        "cooling_share_of_net_change_pct matches",
        c.cooling_share_of_net_change_pct
      );
    }
  }

  console.log("\nexplain_usage (DEMO-102517 / 2018-05)");
  {
    const { status, json } = await post({
      operation: "explain_usage",
      account_id: "DEMO-102517",
      month: "2018-05",
    });
    log(status === 200, "returns HTTP 200 (allow up to 90s for a cold start)");
    const explanation = json?.result?.data?.explanation;
    log(explanation?.source === "ai", "explanation.source is 'ai'", explanation?.source);
    log(typeof explanation?.text === "string" && explanation.text.length > 0, "explanation.text is non-empty");
  }

  console.log("\ninvestigate_usage (January — no predecessor)");
  {
    const { status, json } = await post({
      operation: "investigate_usage",
      account_id: "DEMO-102517",
      month: "2018-01",
    });
    log(status === 200, "returns HTTP 200, not an error");
    log(json?.result?.data?.comparison_available === false, "comparison_available is false");
    log(json?.result?.data?.comparison?.previous_electricity_kwh === null, "previous_electricity_kwh is null");
  }

  console.log("\nerror handling");
  {
    const unsupported = await post({ operation: "bogus_op" });
    log(unsupported.status === 400, "unsupported operation -> 400", unsupported.status);

    const badMonth = await post({ operation: "investigate_usage", account_id: "DEMO-102517", month: "18-5" });
    log(badMonth.status === 400, "malformed month -> 400", badMonth.status);

    const missingField = await post({ operation: "account_details" });
    log(missingField.status === 400, "missing account_id -> 400", missingField.status);

    const unknownAccount = await post({ operation: "account_details", account_id: "NOT-A-REAL-ACCOUNT" });
    log(unknownAccount.status === 400, "unknown account -> 400 (decoded ok:false)", unknownAccount.status);
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
