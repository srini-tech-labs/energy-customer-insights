# Energy Customer Insights

A local Next.js app for exploring modeled ResStock energy usage for a small,
dynamically-discovered set of demo accounts, backed by a Databricks serving
endpoint (`energy-customer-insights`).
This is a portfolio demo, not a production customer portal — all data is
modeled building simulation output for calendar year 2018, not live utility
meter readings or billing data.

Runs entirely on your own machine via Node.js, bound to `localhost`. There is
no cloud hosting or Docker step.

## Setup

1. Install Node.js 18+ (LTS recommended).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` if you don't already have one, and fill
   in your Databricks token:
   ```dotenv
   DATABRICKS_HOST=https://<your-workspace>.cloud.databricks.com
   ENERGY_SERVING_ENDPOINT=energy-customer-insights
   DATABRICKS_TOKEN=<your token>
   ```
   `.env.local` is gitignored. Never commit a real token, and never put it in
   an environment variable prefixed `NEXT_PUBLIC_` — that would ship it to
   the browser.

## Run

```bash
npm run dev
```

Open the printed local URL (typically http://localhost:3000). Select an
account to load its overview, then use the monthly investigation panel and
"Explain this change" for the on-demand AI explanation.

For a production-style run:

```bash
npm run build
npm run start
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit/component tests (pure logic + fixture-driven UI states) |
| `npm run smoke` | Live checks against a running local proxy — see below |

## Verifying the live integration

With `npm run dev` (or `npm run build && npm run start`) running and a real
token in `.env.local`, run:

```bash
npm run smoke
```

This hits `http://localhost:3000/api/energy` (override with
`SMOKE_BASE_URL=http://localhost:3001 npm run smoke` if your dev server picked
a different port) and checks:

- `list_accounts` returns at least the 4 validated demo accounts (a
  dynamic, growing list — see `docs/validation-results.md`), always
  including DEMO-102517.
- `account_details` for DEMO-102517 returns 365 daily and 12 monthly records.
- `investigate_usage` for DEMO-102517 / 2018-05 matches the documented worked
  example within float tolerance (584.687 kWh current, 258.51 kWh previous,
  +326.177 kWh change, +118.88% daily-average change, +322.692 kWh cooling
  change, 98.93% cooling share of net change).
- `explain_usage` for the same account/month returns `source: "ai"`.
- January (2018-01) returns `comparison_available: false` with no error.
- Unsupported operation, malformed month, missing field, and unknown account
  all return HTTP 400 with a decoded error, not a crash.

The AI explanation call can take up to ~90 seconds on a cold start — this is
expected and the app shows a visible waiting state rather than failing early.

### Manual checks (curl)

```bash
curl -s -X POST http://localhost:3000/api/energy \
  -H 'Content-Type: application/json' \
  -d '{"operation":"list_accounts"}' | jq

curl -s -X POST http://localhost:3000/api/energy \
  -H 'Content-Type: application/json' \
  -d '{"operation":"account_details","account_id":"DEMO-102517"}' | jq

curl -s -X POST http://localhost:3000/api/energy \
  -H 'Content-Type: application/json' \
  -d '{"operation":"investigate_usage","account_id":"DEMO-102517","month":"2018-05"}' | jq

curl -s -X POST http://localhost:3000/api/energy \
  -H 'Content-Type: application/json' \
  -d '{"operation":"explain_usage","account_id":"DEMO-102517","month":"2018-05"}' | jq
```

### Manual / visual checks (not automatable)

- Rapidly switch accounts and months — confirm no stale response from a
  previous selection ever overwrites the current screen.
- Confirm error states (401/403/429/timeout/malformed response) render with a
  manual **Retry** button and no automatic retry loop. `src/fixtures/errors.fixture.ts`
  has canned errors for exercising `ErrorState` without breaking the real
  connection.
- Confirm chart "View as table" alternatives, keyboard-only navigation, and
  visible focus rings.
- Resize to a mobile width and confirm the layout remains usable.
- Change your system timezone and confirm January 1 stays January 1, and May
  stays May, in all date labels.
- Open browser dev tools → Network tab and confirm no request from the
  browser ever goes directly to a `databricks.com` host, and no response body
  contains the token. Also `grep` the `.next` build output for the token
  string as a final check that it was never inlined into a client bundle.

## Project structure

- `src/app/api/energy/route.ts` — the server-side proxy to Databricks.
- `src/lib/energy/` — the request/response contract, validation, error
  mapping, and the Databricks call itself.
- `src/lib/client/` — the browser-side fetch wrapper and caching hook.
- `src/lib/format/` — number/unit formatting shared across the UI.
- `src/components/` — screens and widgets (shell, overview, investigation,
  shared states, charts).
- `src/fixtures/` — dev/test-only fixture data for edge cases (January,
  AI fallback, negative end-use changes, cooling share over 100%, error
  states). Not part of the shipped UI navigation — used by `npm run test`.
