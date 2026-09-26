# AWS ingestion

`lambda/energy-consumption-file-transfer/lambda_function.py` is the actual
Lambda source, exported read-only from the private project (byte-identical
copy — nothing rewritten). It runs on a schedule and performs a single
logical operation per invocation: move at most one consumption file from the
source-simulator's incoming location into the pipeline, safely.

## What it does, per run

1. **Lists the incoming location** (`source-simulator/consumption/2018/incoming/`)
   and picks up **exactly one file** — the first one found, sorted by key.
   Anything else waiting in incoming is left untouched for a later run.
2. **No data is a normal outcome, not an error.** If incoming is empty, the
   function writes a `NO_DATA` audit record and returns `200` — it does not
   raise or alert.
3. **Copies the file to the landing location**
   (`landing/consumption/2018/ingest_date=<run_date>/<filename>`) — the same
   S3 prefix the Databricks Bronze Auto Loader job watches.
4. **Verifies the landing copy** by comparing source and target byte size
   (`head_object` on both, via `verify_copy`) before proceeding.
5. **Copies the file to the archive location**
   (`source-simulator/consumption/2018/archive/processed_date=<run_date>/<filename>`).
6. **Verifies the archive copy** the same way.
7. **Only then deletes the file from incoming** — the delete is the very
   last step, and only happens after both copies are independently
   confirmed. If anything above raises, the function stops before deleting,
   so the source file is never lost: it simply remains in incoming for the
   next scheduled run to pick up.
8. **Writes one audit JSON record per run** to
   `transfer-audit/consumption/<year>/<month>/<day>/<time>-<request-id>.json`,
   with a `status` of `SUCCESS`, `NO_DATA`, or `FAILED`, plus file sizes,
   ETags, and the exact keys involved for a successful run.

## Safety against partial/duplicate transfers

Before copying to landing or archive, the function checks whether a file
with the same name already exists at that destination
(`find_existing_file`). If a previous run copied the file but failed before
deleting it from incoming (e.g. a mid-run crash), the retry reuses the
already-copied landing/archive object instead of copying again — the audit
record marks this via `landing_reused` / `archive_reused` — and still
verifies it before deleting the (now-duplicate) incoming file. This is what
makes the delete-from-incoming step safe to retry: at-least-once invocation
semantics can never result in the source being deleted without confirmed,
verified copies existing in both landing and archive.

Any exception during the run is caught, written to a `FAILED` audit record
(with the exception type and message, not a full stack trace), and then
re-raised — so the invocation is correctly reported as failed while still
leaving a diagnostic trail.

## Configuration

The bucket name and the four S3 prefixes (incoming, landing, archive, audit)
are module-level constants in `lambda_function.py`. No credentials of any
kind appear in the source — S3 access uses the Lambda execution role via the
default `boto3.client("s3")` credential chain.
