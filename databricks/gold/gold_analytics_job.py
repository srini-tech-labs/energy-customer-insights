# Databricks notebook source
# Cell 1 - Gold ETL configuration

from pyspark.sql import functions as F
from pyspark.sql.window import Window

SILVER_ENERGY_WEATHER_TABLE = (
    "power_energy.silver.energy_weather_hourly"
)

DAILY_GOLD_TABLE = (
    "power_energy.gold.daily_energy_weather"
)

MONTHLY_GOLD_TABLE = (
    "power_energy.gold.monthly_energy_weather"
)

INVESTIGATION_GOLD_TABLE = (
    "power_energy.gold.usage_investigation_weather"
)

print("Gold ETL configuration loaded.")

# COMMAND ----------

# Cell 2 - Build and MERGE daily Gold

energy_weather = spark.table(
    SILVER_ENERGY_WEATHER_TABLE
)

daily_candidate = (
    energy_weather
    .groupBy(
        "building_id",
        "state",
        "county_code",
        "weather_city",
        "usage_date"
    )
    .agg(
        F.count("*").alias("hours_present"),

        F.sum("electricity_kwh").alias("electricity_kwh"),
        F.sum("net_electricity_kwh").alias("net_electricity_kwh"),
        F.sum("cooling_system_kwh").alias("cooling_system_kwh"),
        F.sum("heating_system_kwh").alias("heating_system_kwh"),
        F.sum("hot_water_kwh").alias("hot_water_kwh"),

        F.max("peak_15min_average_kw")
            .alias("peak_15min_average_kw"),

        F.avg("temperature_f")
            .alias("average_temperature_f"),

        F.min("temperature_f")
            .alias("minimum_temperature_f"),

        F.max("temperature_f")
            .alias("maximum_temperature_f"),

        F.avg("relative_humidity_pct")
            .alias("average_relative_humidity_pct"),

        F.avg("wind_speed_mps")
            .alias("average_wind_speed_mps")
    )
    .withColumn(
        "cooling_degree_days_65",
        F.greatest(
            F.col("average_temperature_f") - F.lit(65.0),
            F.lit(0.0)
        )
    )
    .withColumn(
        "heating_degree_days_65",
        F.greatest(
            F.lit(65.0) - F.col("average_temperature_f"),
            F.lit(0.0)
        )
    )
)

# Quality check: every day should contain 24 hourly records
bad_days = (
    daily_candidate
    .filter(F.col("hours_present") != 24)
    .limit(1)
    .count()
)

if bad_days > 0:
    raise Exception(
        "Gold ETL stopped: incomplete daily data detected."
    )

daily_candidate.createOrReplaceTempView(
    "gold_daily_energy_weather_updates"
)

spark.sql(f"""
MERGE INTO {DAILY_GOLD_TABLE} AS target
USING gold_daily_energy_weather_updates AS source

ON target.building_id = source.building_id
AND target.usage_date = source.usage_date

WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
""")

print("Gold daily_energy_weather MERGE complete.")
print("Daily candidate rows:", daily_candidate.count())
print(
    "Gold daily rows:",
    spark.table(DAILY_GOLD_TABLE).count()
)

# COMMAND ----------

# Cell 3 - Build and MERGE monthly Gold

monthly_candidate = (
    daily_candidate
    .withColumn(
        "usage_month",
        F.date_trunc(
            "month",
            F.col("usage_date").cast("timestamp")
        )
    )
    .groupBy(
        "building_id",
        "state",
        "county_code",
        "weather_city",
        "usage_month"
    )
    .agg(
        F.count("*").alias("days_present"),

        F.sum("electricity_kwh")
            .alias("electricity_kwh"),

        F.avg("electricity_kwh")
            .alias("average_daily_kwh"),

        F.sum("net_electricity_kwh")
            .alias("net_electricity_kwh"),

        F.sum("cooling_system_kwh")
            .alias("cooling_system_kwh"),

        F.sum("heating_system_kwh")
            .alias("heating_system_kwh"),

        F.sum("hot_water_kwh")
            .alias("hot_water_kwh"),

        F.max("peak_15min_average_kw")
            .alias("peak_15min_average_kw"),

        F.avg("average_temperature_f")
            .alias("average_temperature_f"),

        F.min("minimum_temperature_f")
            .alias("minimum_temperature_f"),

        F.max("maximum_temperature_f")
            .alias("maximum_temperature_f"),

        F.sum("cooling_degree_days_65")
            .alias("cooling_degree_days_65"),

        F.sum("heating_degree_days_65")
            .alias("heating_degree_days_65"),

        F.avg("average_relative_humidity_pct")
            .alias("average_relative_humidity_pct"),

        F.avg("average_wind_speed_mps")
            .alias("average_wind_speed_mps")
    )
)

monthly_candidate.createOrReplaceTempView(
    "gold_monthly_energy_weather_updates"
)

spark.sql(f"""
MERGE INTO {MONTHLY_GOLD_TABLE} AS target
USING gold_monthly_energy_weather_updates AS source

ON target.building_id = source.building_id
AND target.usage_month = source.usage_month

WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
""")

print("Gold monthly_energy_weather MERGE complete.")
print("Monthly candidate rows:", monthly_candidate.count())
print(
    "Gold monthly rows:",
    spark.table(MONTHLY_GOLD_TABLE).count()
)

# COMMAND ----------

# Cell 4 - Build and MERGE usage investigation Gold

month_window = (
    Window
    .partitionBy("building_id")
    .orderBy("usage_month")
)

investigation_candidate = (
    monthly_candidate

    .withColumn(
        "previous_month",
        F.lag("usage_month").over(month_window)
    )
    .withColumn(
        "previous_electricity_kwh",
        F.lag("electricity_kwh").over(month_window)
    )
    .withColumn(
        "previous_average_daily_kwh",
        F.lag("average_daily_kwh").over(month_window)
    )
    .withColumn(
        "previous_cooling_system_kwh",
        F.lag("cooling_system_kwh").over(month_window)
    )
    .withColumn(
        "previous_heating_system_kwh",
        F.lag("heating_system_kwh").over(month_window)
    )
    .withColumn(
        "previous_hot_water_kwh",
        F.lag("hot_water_kwh").over(month_window)
    )
    .withColumn(
        "previous_average_temperature_f",
        F.lag("average_temperature_f").over(month_window)
    )
    .withColumn(
        "previous_cooling_degree_days_65",
        F.lag("cooling_degree_days_65").over(month_window)
    )
    .withColumn(
        "previous_heating_degree_days_65",
        F.lag("heating_degree_days_65").over(month_window)
    )

    .withColumn(
        "electricity_change_kwh",
        F.col("electricity_kwh") -
        F.col("previous_electricity_kwh")
    )

    .withColumn(
        "daily_usage_change_pct",
        F.when(
            F.col("previous_average_daily_kwh").isNotNull() &
            (F.col("previous_average_daily_kwh") != 0),
            (
                (
                    F.col("average_daily_kwh") -
                    F.col("previous_average_daily_kwh")
                )
                / F.col("previous_average_daily_kwh")
            ) * 100.0
        )
    )

    .withColumn(
        "cooling_change_kwh",
        F.col("cooling_system_kwh") -
        F.col("previous_cooling_system_kwh")
    )
    .withColumn(
        "heating_change_kwh",
        F.col("heating_system_kwh") -
        F.col("previous_heating_system_kwh")
    )
    .withColumn(
        "hot_water_change_kwh",
        F.col("hot_water_kwh") -
        F.col("previous_hot_water_kwh")
    )

    .withColumn(
        "other_electricity_change_kwh",
        F.col("electricity_change_kwh")
        - F.col("cooling_change_kwh")
        - F.col("heating_change_kwh")
        - F.col("hot_water_change_kwh")
    )

    .withColumn(
        "cooling_share_of_net_change_pct",
        F.when(
            F.col("electricity_change_kwh").isNotNull() &
            (F.col("electricity_change_kwh") != 0),
            (
                F.col("cooling_change_kwh")
                / F.col("electricity_change_kwh")
            ) * 100.0
        )
    )

    .withColumn(
        "average_temperature_change_f",
        F.col("average_temperature_f") -
        F.col("previous_average_temperature_f")
    )
    .withColumn(
        "cooling_degree_days_change_65",
        F.col("cooling_degree_days_65") -
        F.col("previous_cooling_degree_days_65")
    )
    .withColumn(
        "heating_degree_days_change_65",
        F.col("heating_degree_days_65") -
        F.col("previous_heating_degree_days_65")
    )

    .select(
        "building_id",
        "state",
        "county_code",
        "weather_city",
        "usage_month",
        "electricity_kwh",
        "average_daily_kwh",
        "cooling_system_kwh",
        "heating_system_kwh",
        "hot_water_kwh",
        "average_temperature_f",
        "minimum_temperature_f",
        "maximum_temperature_f",
        "cooling_degree_days_65",
        "heating_degree_days_65",
        "previous_month",
        "previous_electricity_kwh",
        "previous_average_daily_kwh",
        "previous_cooling_system_kwh",
        "previous_heating_system_kwh",
        "previous_hot_water_kwh",
        "previous_average_temperature_f",
        "previous_cooling_degree_days_65",
        "previous_heating_degree_days_65",
        "electricity_change_kwh",
        "daily_usage_change_pct",
        "cooling_change_kwh",
        "heating_change_kwh",
        "hot_water_change_kwh",
        "other_electricity_change_kwh",
        "cooling_share_of_net_change_pct",
        "average_temperature_change_f",
        "cooling_degree_days_change_65",
        "heating_degree_days_change_65"
    )
)

investigation_candidate.createOrReplaceTempView(
    "gold_usage_investigation_weather_updates"
)

spark.sql(f"""
MERGE INTO {INVESTIGATION_GOLD_TABLE} AS target
USING gold_usage_investigation_weather_updates AS source

ON target.building_id = source.building_id
AND target.usage_month = source.usage_month

WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
""")

print("Gold usage_investigation_weather MERGE complete.")
print("Investigation candidate rows:", investigation_candidate.count())
print(
    "Gold investigation rows:",
    spark.table(INVESTIGATION_GOLD_TABLE).count()
)

# COMMAND ----------

# Cell 5 - Maintain dynamic Gold account summary view

spark.sql("""
CREATE OR REPLACE VIEW power_energy.gold.account_summary AS

WITH account_metrics AS (

    SELECT
        building_id,

        COUNT(DISTINCT usage_date) AS days_present,

        SUM(electricity_kwh) AS annual_electricity_kwh,

        AVG(electricity_kwh) AS average_daily_kwh,

        MAX(peak_15min_average_kw) AS peak_15min_average_kw

    FROM power_energy.gold.daily_energy_weather

    GROUP BY building_id
)

SELECT
    b.building_id,

    CONCAT(
        'DEMO-',
        CAST(b.building_id AS STRING)
    ) AS account_id,

    b.state,
    b.county_code,
    b.building_type,
    b.floor_area_sqft,
    b.construction_vintage,
    b.heating_fuel,
    b.heating_system,
    b.cooling_system,

    m.days_present,
    m.annual_electricity_kwh,
    m.average_daily_kwh,
    m.peak_15min_average_kw,

    'Modeled ResStock building; not a real customer account'
        AS data_description

FROM power_energy.silver.buildings b

INNER JOIN account_metrics m
    ON b.building_id = m.building_id
""")


# Validation
account_count = spark.table(
    "power_energy.gold.account_summary"
).count()

print("PASS: Gold account_summary view refreshed.")
print("Gold accounts:", account_count)

display(
    spark.table("power_energy.gold.account_summary")
    .orderBy("building_id")
)