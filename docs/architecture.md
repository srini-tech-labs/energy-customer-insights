# Architecture

## Pipeline flow

```
AWS source simulator
  → S3 incoming
  → Lambda scheduled transfer
  → S3 landing / archive / audit
  → Databricks Auto Loader
  → Bronze (raw ingestion + audit)
  → Silver (15-minute consumption)
      → automatic building-metadata onboarding
      → hourly aggregation
      → weather enrichment
  → Gold (daily / monthly / usage investigation)
      → dynamic account summary
  → published serving snapshot (Unity Catalog Volume)
  → Databricks Model Serving
      → deterministic evidence (handle_energy_request)
      → AI-generated usage explanation (explain_energy_evidence)
  → React / TypeScript frontend
```

See `databricks/README.md` for exactly which notebook implements each stage.

## Why the serving model doesn't need redeploying for a new building

The MLflow model (`EnergyInsightsModelV3` in
`databricks/serving/energy_insights_model_api.py`) does not bundle a
snapshot artifact. Its `predict()` method loads the *current* published
snapshot from a Unity Catalog Volume on every request:

```python
def _load_snapshot(self):
    files_token = os.getenv("ENERGY_FILES_TOKEN")
    ...
    response = files_client.files.download(self.snapshot_path)
    return json.loads(response.contents.read().decode("utf-8"))
```

This is the architectural reason routine data refreshes are decoupled from
model deployment: adding a new supported building means running the
pipeline (Bronze → Silver → Gold → publish) so the snapshot picks it up on
its next read — it does not require registering a new model version or
redeploying the serving endpoint. The publish job assigns each building's
public-facing ID dynamically:

```python
F.concat(F.lit("DEMO-"), F.col("building_id").cast("string"))
```

so a new building appears as `DEMO-<building_id>` automatically, and the
frontend discovers it the same way it discovers any other account — by
calling `list_accounts`, not from any hardcoded list.

## How the AI explanation actually works

The analytics themselves — monthly comparisons, end-use changes, cooling
degree days, etc. — are computed entirely by the data pipeline (Gold tables)
and served as-is by `handle_energy_request()`. The LLM never calculates
these numbers. `explain_energy_evidence()` sends that already-computed
evidence to a hosted Llama model with instructions to describe it in plain
English using only the supplied numbers, with explicit guardrails against
inventing causes (weather is described as "consistent with," never as a
proven cause; no invented customer behavior, equipment faults, bills, or
rates). If the LLM call fails, a deterministic fallback explanation
(built from the same evidence, no LLM involved) is returned instead, and the
frontend labels it distinctly ("Calculated summary — AI explanation
unavailable") rather than presenting it as an AI response.

## Data quality gates

Each pipeline stage validates before writing:
- Bronze: reconciliation audit (row count, distinct timestamps, rescued-row
  count per building per ingest date).
- Silver: rejects rescued or duplicate source rows before merging; requires
  exactly four 15-minute intervals per hourly bucket; requires every hourly
  consumption row to find a matching weather record (fails loudly on a
  mismatch rather than silently dropping rows).
- Building onboarding: fails safely (raises, does not partially onboard) if
  a new building's ResStock metadata or weather-county mapping is missing.
- Publish: validates the January no-predecessor contract
  (`previous_month is None`) and expected row counts before considering the
  snapshot published.
- End-to-end validation: recomputes expected counts dynamically from however
  many buildings are actually present, then checks Bronze, Silver, Gold, the
  published snapshot, and the live serving endpoint against those counts in
  one pass.
