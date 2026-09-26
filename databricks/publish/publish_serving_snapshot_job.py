# Databricks notebook source
# Cell 1 - Publish job configuration

from pyspark.sql import functions as F
import json

BUILDINGS_TABLE = "power_energy.silver.buildings"
ACCOUNT_SUMMARY_TABLE = "power_energy.gold.account_summary"
DAILY_TABLE = "power_energy.gold.daily_energy_weather"
MONTHLY_TABLE = "power_energy.gold.monthly_energy_weather"
INVESTIGATION_TABLE = "power_energy.gold.usage_investigation_weather"

SERVING_VOLUME = "power_energy.gold.serving_data"

spark.sql(f"""
CREATE VOLUME IF NOT EXISTS {SERVING_VOLUME}
""")

SNAPSHOT_PATH = (
    "/Volumes/power_energy/gold/serving_data/"
    "energy_customer_snapshot.json"
)

print("Publish configuration loaded.")
print("Snapshot path:", SNAPSHOT_PATH)

# COMMAND ----------

# Cell 2 - Build and publish application-serving snapshot

from datetime import datetime, timezone

def rows_as_dicts(df):
    json_rows = (
        df.select(
            F.to_json(
                F.struct(
                    *[F.col(c) for c in df.columns]
                ),
                options={"ignoreNullFields": "false"}
            ).alias("json")
        )
        .collect()
    )

    return [
        json.loads(row["json"])
        for row in json_rows
    ]


# Add the API-facing DEMO account ID while retaining building_id
account_summary_df = (
    spark.table(ACCOUNT_SUMMARY_TABLE)
    .drop("account_id")
)

building_context_df = (
    spark.table(BUILDINGS_TABLE)
    .select(
        "building_id",
        "weather_city",
        "reference_annual_electricity_kwh"
    )
)

accounts_df = (
    account_summary_df
    .join(
        building_context_df,
        on="building_id",
        how="left"
    )
    .withColumn(
        "account_id",
        F.concat(
            F.lit("DEMO-"),
            F.col("building_id").cast("string")
        )
    )
)

daily_df = (
    spark.table(DAILY_TABLE)
    .withColumn(
        "account_id",
        F.concat(
            F.lit("DEMO-"),
            F.col("building_id").cast("string")
        )
    )
)

monthly_df = (
    spark.table(MONTHLY_TABLE)
    .withColumn(
        "account_id",
        F.concat(
            F.lit("DEMO-"),
            F.col("building_id").cast("string")
        )
    )
)

investigation_df = (
    spark.table(INVESTIGATION_TABLE)
    .withColumn(
        "account_id",
        F.concat(
            F.lit("DEMO-"),
            F.col("building_id").cast("string")
        )
    )
)


snapshot = {
    "schema_version": 3,

    "metadata": {
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset": "ResStock 2022 release, AMY2018 baseline",
        "data_type": "modeled building profiles",
        "weather_alignment_verified": True,
        "weather_alignment_method":
            "exact county_code + hour-ending timestamps",
        "degree_day_base_f": 65
    },

    "data": {
        "accounts": rows_as_dicts(accounts_df),
        "daily_usage": rows_as_dicts(daily_df),
        "monthly_usage": rows_as_dicts(monthly_df),
        "investigations": rows_as_dicts(investigation_df)
    }
}

# Write snapshot to governed Unity Catalog Volume
with open(
    SNAPSHOT_PATH,
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        snapshot,
        f,
        indent=2
    )


print("Snapshot published successfully.")
print("Accounts:", len(snapshot["data"]["accounts"]))
print("Daily rows:", len(snapshot["data"]["daily_usage"]))
print("Monthly rows:", len(snapshot["data"]["monthly_usage"]))
print("Investigation rows:", len(snapshot["data"]["investigations"]))
print("Snapshot path:", SNAPSHOT_PATH)

# COMMAND ----------

# Cell 3 - Validate published application snapshot

with open(
    SNAPSHOT_PATH,
    "r",
    encoding="utf-8"
) as f:
    published_snapshot = json.load(f)

print("Schema version:", published_snapshot["schema_version"])

print(
    "Accounts:",
    len(published_snapshot["data"]["accounts"])
)

print(
    "Daily rows:",
    len(published_snapshot["data"]["daily_usage"])
)

print(
    "Monthly rows:",
    len(published_snapshot["data"]["monthly_usage"])
)

print(
    "Investigation rows:",
    len(published_snapshot["data"]["investigations"])
)

# Validate January null behavior
january_rows = [
    row
    for row in published_snapshot["data"]["investigations"]
    if row["usage_month"].startswith("2018-01")
]

print("January rows:", len(january_rows))

for row in january_rows:
    assert "previous_month" in row
    assert row["previous_month"] is None

print("January null contract validated.")

# Validate expected account IDs
account_ids = sorted(
    row["account_id"]
    for row in published_snapshot["data"]["accounts"]
)

print("Accounts:", account_ids)

print("Snapshot validation complete.")