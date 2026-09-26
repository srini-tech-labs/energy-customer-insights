# Validated automation: adding a fourth building

The system was tested by adding a fourth building's source file and letting
it flow through the pipeline with no manual intervention and no frontend
code changes:

```
new building file
  → scheduled AWS transfer
  → Bronze ingestion
  → automatic Silver metadata onboarding
  → Silver processing (hourly aggregation + weather enrichment)
  → Gold processing
  → dynamic account creation
  → snapshot refresh
  → live serving endpoint
  → frontend account discovery
```

The frontend picked up the new account — **`DEMO-11662`** — automatically,
without any frontend code changes — it calls `list_accounts` and renders
whatever comes back. See the dynamic account dropdown screenshot in the root
README for the frontend side of this.

The AWS transfer step for this file was also checked manually against S3:

| Location | Result |
|---|---|
| Landing file | EXISTS |
| Archive file | EXISTS |
| Incoming file | GONE |

matching the Lambda's contract (see `aws/README.md`): a file is only removed
from incoming after both the landing and archive copies are confirmed.

## Validated counts (four buildings)

`e2e_pipeline_validation.py` reported `Buildings detected in Bronze: 4`, then
computed and checked every expected count below dynamically from that number
(not hardcoded):

| Layer | Count |
|---|---:|
| Bronze | 140,160 |
| Silver 15-minute | 140,160 |
| Silver hourly | 35,040 |
| Silver buildings | 4 |
| Gold daily | 1,460 |
| Gold monthly | 48 |
| Gold investigation | 48 |
| Gold accounts | 4 |
| Snapshot accounts | 4 |
| Live endpoint accounts | 4 |

These numbers were checked programmatically against dynamically-computed
expectations (`4 buildings × 35,040 fifteen-minute intervals`, `4 × 8,760`
hourly rows, `4 × 365` daily rows, `4 × 12` monthly/investigation rows) —
see `databricks/validation/e2e_pipeline_validation.py`, which computes
these expectations from the actual building count present in Bronze rather
than hardcoding them, so the same check works regardless of how many
buildings are onboarded.

The end-to-end validation completed successfully: Bronze, Silver, Gold, the
published snapshot, and the live serving endpoint all agreed on the same
account count and the same snapshot timestamp, ending with:

```
================================
E2E PASS - 4 BUILDINGS FULL PIPELINE OK
================================
```

No additional building-count results beyond this four-building validation
are claimed here.
