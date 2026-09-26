# Databricks notebook source
# Cell 1 - Dynamic End-to-End Integration Validation

import json
from databricks.sdk import WorkspaceClient
from pyspark.sql import functions as F


# ---------------------------------------------------------
# Determine how many buildings have actually arrived
# ---------------------------------------------------------

bronze = spark.table(
    "power_energy.bronze.consumption_ingest"
)

building_count = (
    bronze
    .select("bldg_id")
    .distinct()
    .count()
)

assert building_count > 0

print("Buildings detected in Bronze:", building_count)


# ---------------------------------------------------------
# Dynamic expected counts
#
# Each ResStock building:
# 35,040 15-minute rows
# 8,760 hourly rows
# 365 daily rows
# 12 monthly rows
# 12 investigation rows
# ---------------------------------------------------------

expected = {
    "bronze": building_count * 35040,
    "silver_15min": building_count * 35040,
    "silver_hourly": building_count * 8760,
    "silver_buildings": building_count,
    "gold_daily": building_count * 365,
    "gold_monthly": building_count * 12,
    "gold_investigation": building_count * 12,
    "gold_accounts": building_count
}


# ---------------------------------------------------------
# Actual counts
# ---------------------------------------------------------

actual = {
    "bronze": bronze.count(),

    "silver_15min": spark.table(
        "power_energy.silver.consumption"
    ).count(),

    "silver_hourly": spark.table(
        "power_energy.silver.consumption_hourly"
    ).count(),

    "silver_buildings": spark.table(
        "power_energy.silver.buildings"
    ).count(),

    "gold_daily": spark.table(
        "power_energy.gold.daily_energy_weather"
    ).count(),

    "gold_monthly": spark.table(
        "power_energy.gold.monthly_energy_weather"
    ).count(),

    "gold_investigation": spark.table(
        "power_energy.gold.usage_investigation_weather"
    ).count(),

    "gold_accounts": spark.table(
        "power_energy.gold.account_summary"
    ).count()
}


# ---------------------------------------------------------
# Validate every processing layer
# ---------------------------------------------------------

for layer, expected_count in expected.items():

    actual_count = actual[layer]

    status = (
        "PASS"
        if actual_count == expected_count
        else "FAIL"
    )

    print(
        f"{status:4}  "
        f"{layer:20} "
        f"{actual_count:,} / {expected_count:,}"
    )

    assert actual_count == expected_count


# ---------------------------------------------------------
# Validate published snapshot
# ---------------------------------------------------------

SNAPSHOT_PATH = (
    "/Volumes/power_energy/gold/serving_data/"
    "energy_customer_snapshot.json"
)

with open(SNAPSHOT_PATH, "r") as f:
    snapshot = json.load(f)

assert (
    len(snapshot["data"]["accounts"])
    == building_count
)

assert (
    len(snapshot["data"]["daily_usage"])
    == building_count * 365
)

assert (
    len(snapshot["data"]["monthly_usage"])
    == building_count * 12
)

assert (
    len(snapshot["data"]["investigations"])
    == building_count * 12
)

snapshot_time = (
    snapshot["metadata"]["created_at_utc"]
)

print("PASS  published snapshot")
print(
    "      accounts:",
    len(snapshot["data"]["accounts"])
)
print(
    "      created_at_utc:",
    snapshot_time
)


# ---------------------------------------------------------
# Validate live serving endpoint
# ---------------------------------------------------------

w = WorkspaceClient()

response = w.serving_endpoints.query(
    name="energy-customer-insights",
    dataframe_records=[
        {
            "request_json": json.dumps({
                "operation": "list_accounts"
            })
        }
    ]
)

live = json.loads(
    response.predictions[0]["response_json"]
)

assert live["ok"] is True

live_accounts = (
    live["result"]
    ["data"]
    ["accounts"]
)

assert len(live_accounts) == building_count

live_time = (
    live["result"]
    ["metadata"]
    ["created_at_utc"]
)

assert live_time == snapshot_time


print("PASS  live serving endpoint")
print(
    "      accounts:",
    len(live_accounts)
)
print(
    "      snapshot timestamp:",
    live_time
)


# ---------------------------------------------------------
# Final result
# ---------------------------------------------------------

print()
print("================================")
print(
    f"E2E PASS - {building_count} BUILDINGS "
    "FULL PIPELINE OK"
)
print("================================")
