# Databricks pipeline notebooks

Exported directly from the Databricks workspace as source files (read-only
export; nothing in the live workspace was modified). Content is preserved
as-written — these are the actual notebooks that ran the validated pipeline,
not rewrites.

## Production job notebooks

These run on a schedule and form the live pipeline.

| File | Original notebook | What it does |
|---|---|---|
| `bronze/bronze_ingestion_job.py` | `Energy Consumption Bronze Job – 01` | Auto Loader ingestion from S3 landing into the Bronze table, plus a reconciliation audit (row/timestamp counts per building per ingest date). |
| `silver/silver_transformation_job.py` | `Energy Consumption Silver Job – 01` | Automatic building-metadata onboarding (joins new Bronze buildings against ResStock metadata + supported weather locations, fails safely if unmapped), Bronze→Silver consumption, 15-minute→hourly aggregation, and weather enrichment — all quality-gated (rejects rescued/duplicate/incomplete data before merging). |
| `gold/gold_analytics_job.py` | `Energy Consumption Gold Job – 01` | Gold daily, monthly, and usage-investigation tables, plus the dynamic account-summary view. |
| `publish/publish_serving_snapshot_job.py` | `Energy Customer Insights Publish Job – 01` | Builds the JSON snapshot from Gold tables (including the dynamic `DEMO-<building_id>` account IDs) and publishes it to a Unity Catalog Volume; validates the published file (including the January null-comparison contract) before finishing. |
| `serving/energy_insights_model_api.py` | `Energy Customer Insights API – 01` | The actual API logic: `handle_energy_request()` (deterministic request handling — list_accounts/account_details/investigate_usage), `explain_energy_evidence()` (the LLM call, with a deterministic fallback), the `EnergyInsightsModelV3` MLflow PythonModel that loads the *current* published snapshot at request time, plus the model packaging/registration and live-endpoint validation steps. |
| `serving/admin_credential_setup.py` | `Energy Customer Insights Admin – 01` | Stores the Files API credential the serving model uses to read the snapshot Volume, via Databricks Secrets (`dbutils.secrets`) — the token is entered interactively (`getpass`) and never written to notebook source or output. |
| `validation/e2e_pipeline_validation.py` | `Energy Customer Insights – E2E Validation` | End-to-end validation that dynamically computes expected row counts from however many buildings are actually present in Bronze (not hardcoded), then checks every layer (Bronze → Silver → Gold → published snapshot → live serving endpoint) against those counts. **Trimmed for this public repo:** the original notebook has a second section after this validation (`Find 6 new candidate buildings...` / `Add six new buildings to silver.buildings`) — a separate, later scaling experiment, not part of the validated pipeline test. That section has been removed from this staged copy only; the live/private Databricks notebook is unchanged. |

## Excluded from this public repo

Two notebooks were reviewed and deliberately left out of this staging
directory, to keep the repo centered on the production-oriented pipeline
rather than development history. Neither was deleted anywhere — both remain
in the Databricks workspace, untouched.

- **`Energy Consumption Silver ETL – 01`** (1,514 lines) — the original
  interactive build/validation notebook covering Silver hourly →
  weather-enriched Silver → Gold daily/monthly/investigation, cell by cell.
  Functionally redundant with the clean production
  `silver/silver_transformation_job.py` and `gold/gold_analytics_job.py`
  notebooks above; at that length it would overshadow the production
  pipeline code rather than support it.
- **`Energy Customer Insights - Phase 2`** (275 lines) — the original
  S3→Bronze development notebook (interactive file-listing exploration,
  Auto Loader setup, a one-time lineage-column schema migration, and a
  one-time historical backfill). Its core ingestion/audit logic duplicates
  `bronze/bronze_ingestion_job.py` (122 lines) without adding anything a
  reader can't already see there; the rest is one-off migration work, not
  representative of the pipeline's ongoing behavior.

## Configuration and sanitization

- **S3 bucket:** the real bucket name has been replaced with an
  `ENERGY_S3_BUCKET` environment variable (default placeholder
  `your-energy-data-bucket`) in `bronze/bronze_ingestion_job.py` and in the
  Lambda function. See `config/README.md`.
- **Databricks workspace host:** no notebook hardcodes a literal host —
  authentication uses the ambient `WorkspaceClient()` credential chain, and
  the one runtime fallback (`serving/energy_insights_model_api.py`) reads it
  from `os.getenv("DATABRICKS_HOST")`. Only documentation ever showed the
  literal value; it's now written as `<your-workspace>.cloud.databricks.com`
  everywhere it appears.
- **Unity Catalog namespace** (`power_energy.{bronze,silver,gold}.*`) is
  intentionally left as-is — it's the project's logical schema naming, not
  an environment secret.
- **Secret scope/key** (`energy-api` / `files-token`, in
  `serving/admin_credential_setup.py`) are identifiers only — no secret
  value is present anywhere in these files.
