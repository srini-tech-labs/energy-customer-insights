# Databricks notebook source
# Cell 1 - Silver ETL configuration

from pyspark.sql import functions as F

BRONZE_TABLE = "power_energy.bronze.consumption_ingest"

SILVER_CONSUMPTION_TABLE = "power_energy.silver.consumption"
SILVER_HOURLY_TABLE = "power_energy.silver.consumption_hourly"
SILVER_WEATHER_TABLE = "power_energy.silver.weather"
SILVER_BUILDINGS_TABLE = "power_energy.silver.buildings"
SILVER_ENERGY_WEATHER_TABLE = "power_energy.silver.energy_weather_hourly"

print("Silver ETL configuration loaded.")

# COMMAND ----------

# Cell 2 - Automatically onboard new buildings found in Bronze consumption

from pyspark.sql import functions as F


# ---------------------------------------------------------
# Supported weather locations
# ---------------------------------------------------------

weather_locations = spark.createDataFrame(
    [
        ("G0101270", "Birmingham Muni"),
        ("G0101130", "Fort Benning"),
        ("G0100530", "Middleton Fld"),
    ],
    ["county_code", "weather_city"]
)


# ---------------------------------------------------------
# Buildings actually present in consumption ingestion
# ---------------------------------------------------------

consumption_buildings = (
    spark.table(
        "power_energy.bronze.consumption_ingest"
    )
    .select(
        F.col("bldg_id").alias("building_id")
    )
    .distinct()
)


# ---------------------------------------------------------
# Pull building attributes automatically from ResStock metadata
# ---------------------------------------------------------

metadata_buildings = (
    spark.table(
        "power_energy.bronze.building_metadata"
    )
    .filter(F.col("upgrade") == 0)
    .select(
        F.col("bldg_id").alias("building_id"),

        F.col("`in.state`")
        .alias("state"),

        F.col("`in.county`")
        .alias("county_code"),

        F.col("`in.geometry_building_type_recs`")
        .alias("building_type"),

        F.col("`in.sqft`")
        .cast("double")
        .alias("floor_area_sqft"),

        F.col("`in.vintage`")
        .alias("construction_vintage"),

        F.col("`in.heating_fuel`")
        .alias("heating_fuel"),

        F.col("`in.hvac_heating_type`")
        .alias("heating_system"),

        F.col("`in.hvac_cooling_type`")
        .alias("cooling_system"),

        F.col(
            "`out.electricity.total.energy_consumption.kwh`"
        )
        .cast("double")
        .alias("reference_annual_electricity_kwh")
    )
    .dropDuplicates(["building_id"])
)


# ---------------------------------------------------------
# Only onboard buildings that actually arrived in Bronze
# ---------------------------------------------------------

building_candidates = (
    consumption_buildings
    .join(
        metadata_buildings,
        on="building_id",
        how="left"
    )
    .join(
        weather_locations,
        on="county_code",
        how="left"
    )
)


# ---------------------------------------------------------
# Fail safely if metadata/weather mapping is unavailable
# ---------------------------------------------------------

invalid_buildings = (
    building_candidates
    .filter(
        F.col("state").isNull()
        | F.col("county_code").isNull()
        | F.col("weather_city").isNull()
    )
)

if invalid_buildings.count() > 0:

    display(invalid_buildings)

    raise ValueError(
        "Building onboarding failed: "
        "missing ResStock metadata or supported weather mapping."
    )


# ---------------------------------------------------------
# Synchronize Silver building dimension
# ---------------------------------------------------------

building_candidates.createOrReplaceTempView(
    "building_onboarding_candidates"
)

spark.sql("""
MERGE INTO power_energy.silver.buildings AS target

USING building_onboarding_candidates AS source

ON target.building_id = source.building_id

WHEN MATCHED THEN UPDATE SET *

WHEN NOT MATCHED THEN INSERT *
""")


print(
    "PASS: Silver building metadata synchronized automatically."
)

print(
    "Buildings currently represented in Bronze:",
    consumption_buildings.count()
)

print(
    "Buildings available in Silver:",
    spark.table(
        "power_energy.silver.buildings"
    ).count()
)

# COMMAND ----------

# Cell 2 - Bronze -> Silver consumption

bronze = spark.table(BRONZE_TABLE)

# Basic data-quality protection
rescued_rows = (
    bronze
    .filter(F.col("_rescued_data").isNotNull())
    .limit(1)
    .count()
)

if rescued_rows > 0:
    raise Exception(
        "Silver ETL stopped: Bronze contains rescued data."
    )

duplicate_keys = (
    bronze
    .groupBy("bldg_id", "timestamp")
    .count()
    .filter(F.col("count") > 1)
    .limit(1)
    .count()
)

if duplicate_keys > 0:
    raise Exception(
        "Silver ETL stopped: duplicate building/timestamp records found."
    )

silver_candidate = (
    bronze.select(
        F.col("bldg_id").alias("building_id"),
        F.col("timestamp").alias("source_timestamp"),

        F.col("`out.electricity.total.energy_consumption`")
            .alias("electricity_kwh"),

        F.col("`out.electricity.net.energy_consumption`")
            .alias("net_electricity_kwh"),

        F.col("`out.electricity.cooling.energy_consumption`")
            .alias("cooling_kwh"),

        F.col("`out.electricity.cooling_fans_pumps.energy_consumption`")
            .alias("cooling_fans_pumps_kwh"),

        F.col("`out.electricity.heating.energy_consumption`")
            .alias("heating_kwh"),

        F.col("`out.electricity.heating_hp_bkup.energy_consumption`")
            .alias("heating_backup_kwh"),

        F.col("`out.electricity.heating_fans_pumps.energy_consumption`")
            .alias("heating_fans_pumps_kwh"),

        F.col("`out.electricity.hot_water.energy_consumption`")
            .alias("hot_water_kwh"),

        (
            F.col("`out.electricity.total.energy_consumption`") * 4
        ).alias("average_demand_kw")
    )
)

silver_candidate.createOrReplaceTempView(
    "silver_consumption_updates"
)

spark.sql(f"""
MERGE INTO {SILVER_CONSUMPTION_TABLE} AS target
USING silver_consumption_updates AS source

ON target.building_id = source.building_id
AND target.source_timestamp = source.source_timestamp

WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
""")

print("Silver consumption MERGE complete.")
print("Candidate rows:", silver_candidate.count())
print(
    "Silver rows:",
    spark.table(SILVER_CONSUMPTION_TABLE).count()
)

# COMMAND ----------

# Cell 3 - Silver consumption -> hourly consumption

hourly_candidate = (
    silver_candidate
    .withColumn(
        "source_hour_end",
        F.date_trunc(
            "hour",
            F.col("source_timestamp") - F.expr("INTERVAL 1 SECOND")
        ) + F.expr("INTERVAL 1 HOUR")
    )
    .groupBy(
        "building_id",
        "source_hour_end"
    )
    .agg(
        F.count("*").alias("interval_count"),
        F.sum("electricity_kwh").alias("electricity_kwh"),
        F.sum("net_electricity_kwh").alias("net_electricity_kwh"),
        F.sum("cooling_kwh").alias("cooling_kwh"),
        F.sum("cooling_fans_pumps_kwh").alias("cooling_fans_pumps_kwh"),
        F.sum("heating_kwh").alias("heating_kwh"),
        F.sum("heating_backup_kwh").alias("heating_backup_kwh"),
        F.sum("heating_fans_pumps_kwh").alias("heating_fans_pumps_kwh"),
        F.sum("hot_water_kwh").alias("hot_water_kwh"),
        F.max("average_demand_kw").alias("peak_15min_average_kw")
    )
)

# Quality check: each hourly record should contain four 15-minute intervals
bad_hours = (
    hourly_candidate
    .filter(F.col("interval_count") != 4)
    .limit(1)
    .count()
)

if bad_hours > 0:
    raise Exception(
        "Silver ETL stopped: incomplete hourly consumption detected."
    )

hourly_candidate.createOrReplaceTempView(
    "silver_consumption_hourly_updates"
)

spark.sql(f"""
MERGE INTO {SILVER_HOURLY_TABLE} AS target
USING silver_consumption_hourly_updates AS source

ON target.building_id = source.building_id
AND target.source_hour_end = source.source_hour_end

WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
""")

print("Silver consumption_hourly MERGE complete.")
print("Candidate hourly rows:", hourly_candidate.count())
print(
    "Silver hourly rows:",
    spark.table(SILVER_HOURLY_TABLE).count()
)

# COMMAND ----------

# Cell 4 - Enrich hourly consumption with building and weather data

buildings = spark.table(SILVER_BUILDINGS_TABLE)
weather = spark.table(SILVER_WEATHER_TABLE)

energy_weather_candidate = (
    hourly_candidate.alias("c")

    .join(
        buildings.alias("b"),
        F.col("c.building_id") == F.col("b.building_id"),
        "inner"
    )

    .join(
        weather.alias("w"),
        (
            F.col("b.county_code") == F.col("w.county_code")
        ) &
        (
            F.col("c.source_hour_end") ==
            F.col("w.weather_timestamp")
        ),
        "inner"
    )

    .select(
        F.col("c.building_id").alias("building_id"),
        F.col("b.state").alias("state"),
        F.col("b.county_code").alias("county_code"),
        F.col("b.weather_city").alias("weather_city"),
        F.col("c.source_hour_end").alias("hour_end"),

        F.expr(
            "CAST(c.source_hour_end - INTERVAL 1 SECOND AS DATE)"
        ).alias("usage_date"),

        F.col("c.interval_count"),
        F.col("c.electricity_kwh"),
        F.col("c.net_electricity_kwh"),
        F.col("c.cooling_kwh"),
        F.col("c.cooling_fans_pumps_kwh"),

        (
            F.col("c.cooling_kwh") +
            F.col("c.cooling_fans_pumps_kwh")
        ).alias("cooling_system_kwh"),

        F.col("c.heating_kwh"),
        F.col("c.heating_backup_kwh"),
        F.col("c.heating_fans_pumps_kwh"),

        (
            F.col("c.heating_kwh") +
            F.col("c.heating_backup_kwh") +
            F.col("c.heating_fans_pumps_kwh")
        ).alias("heating_system_kwh"),

        F.col("c.hot_water_kwh"),
        F.col("c.peak_15min_average_kw"),

        F.col("w.temperature_c"),

        (
            F.col("w.temperature_c") * 9.0 / 5.0 + 32.0
        ).alias("temperature_f"),

        F.col("w.relative_humidity_pct"),
        F.col("w.wind_speed_mps"),
        F.col("w.wind_direction_deg"),
        F.col("w.global_horizontal_radiation_wm2"),
        F.col("w.direct_normal_radiation_wm2"),
        F.col("w.diffuse_horizontal_radiation_wm2"),

        F.col("w.source_file")
            .alias("weather_source_file")
    )
)

# Quality check: every hourly consumption row must find matching weather
hourly_count = hourly_candidate.count()
weather_count = energy_weather_candidate.count()

if weather_count != hourly_count:
    raise Exception(
        f"Silver ETL stopped: weather join mismatch. "
        f"Hourly={hourly_count}, Weather-enriched={weather_count}"
    )

energy_weather_candidate.createOrReplaceTempView(
    "silver_energy_weather_hourly_updates"
)

spark.sql(f"""
MERGE INTO {SILVER_ENERGY_WEATHER_TABLE} AS target
USING silver_energy_weather_hourly_updates AS source

ON target.building_id = source.building_id
AND target.hour_end = source.hour_end

WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
""")

print("Silver energy_weather_hourly MERGE complete.")
print("Candidate weather rows:", weather_count)
print(
    "Silver weather-enriched rows:",
    spark.table(SILVER_ENERGY_WEATHER_TABLE).count()
)