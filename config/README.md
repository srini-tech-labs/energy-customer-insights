# Configuration overview

Where configuration lives in this project, and which values a reader must
supply themselves. No real credentials or environment-specific values are
present anywhere in this repository — see `databricks/README.md` for exactly
what was changed and why.

## Frontend (`frontend/.env.example`)

```dotenv
DATABRICKS_HOST=
ENERGY_SERVING_ENDPOINT=energy-customer-insights
DATABRICKS_TOKEN=
```

- `DATABRICKS_HOST` — your Databricks workspace URL, e.g.
  `https://<your-workspace>.cloud.databricks.com`.
- `ENERGY_SERVING_ENDPOINT` — the name of your deployed serving endpoint.
- `DATABRICKS_TOKEN` — a token permitted to query that endpoint. Never
  committed; the real value lives only in `frontend/.env.local` in the
  private project, which is gitignored and was never copied here.

## AWS Lambda (`aws/lambda/energy-consumption-file-transfer/lambda_function.py`)

| Variable | Purpose | Where it's read |
|---|---|---|
| `ENERGY_S3_BUCKET` | The S3 bucket holding the source-simulator incoming/archive area and the Bronze landing area. | `os.environ.get("ENERGY_S3_BUCKET", "your-energy-data-bucket")` |

No AWS credentials appear anywhere — S3 access uses the Lambda execution
role via boto3's default credential chain.

## Databricks pipeline (`databricks/`)

| Variable / value | Purpose | Where it's used |
|---|---|---|
| `ENERGY_S3_BUCKET` | Same bucket as the Lambda; read by the Bronze job to build its source path. | `bronze/bronze_ingestion_job.py` (`os.getenv("ENERGY_S3_BUCKET", "your-energy-data-bucket")`) |
| `DATABRICKS_HOST` | Runtime fallback for the Files API client when a dedicated serving token is present. | `serving/energy_insights_model_api.py` (`os.getenv("DATABRICKS_HOST")`) — otherwise notebooks authenticate via the ambient `WorkspaceClient()` credential chain, no host needed. |
| `ENERGY_FILES_TOKEN` | Scoped Files API token the *deployed model* uses to read the published snapshot Volume at request time. | `serving/energy_insights_model_api.py` |
| Databricks secret `energy-api` / `files-token` | The same token, stored via Databricks Secrets rather than as a plain environment variable, for use in notebook development/administration. | `serving/admin_credential_setup.py` |
| `power_energy.{bronze,silver,gold}` | The Unity Catalog namespace this pipeline's tables and volumes live under. | throughout `databricks/` — left as-is; this is the project's logical schema naming, not a secret. |
| Serving endpoint name | The name under which the model is deployed (matches the frontend's `ENERGY_SERVING_ENDPOINT`). | referenced in `databricks/validation/e2e_pipeline_validation.py` and `databricks/serving/energy_insights_model_api.py`. |

## What was deliberately left unparameterized

The Unity Catalog namespace (`power_energy`) and Volume/table names under it
are not treated as sensitive — they're the project's own logical naming, and
turning every one of them into a configuration variable would obscure the
pipeline code without a real security benefit. Only values that identify
*this specific* cloud environment (the S3 bucket, the workspace host) were
parameterized or replaced with placeholders.
