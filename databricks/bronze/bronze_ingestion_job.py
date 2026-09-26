# Databricks notebook source
import os

from pyspark.sql import functions as F

# Set via job/task parameter or environment variable in your own workspace.
ENERGY_S3_BUCKET = os.getenv("ENERGY_S3_BUCKET", "your-energy-data-bucket")

SOURCE_PATH = (
    f"s3://{ENERGY_S3_BUCKET}/"
    "landing/consumption/2018/"
)

BRONZE_TABLE = (
    "power_energy.bronze.consumption_ingest"
)

AUDIT_TABLE = (
    "power_energy.bronze.consumption_ingest_audit"
)

CHECKPOINT_PATH = (
    "/Volumes/power_energy/bronze/ingestion_state/"
    "checkpoints/consumption_ingest"
)

SCHEMA_PATH = (
    "/Volumes/power_energy/bronze/ingestion_state/"
    "schemas/consumption_ingest"
)

print("Configuration loaded.")

# COMMAND ----------

source_stream = (
    spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "parquet")
    .option("cloudFiles.schemaLocation", SCHEMA_PATH)
    .load(SOURCE_PATH)
)

query = (
    source_stream
    .select(
        "*",
        F.col("_metadata.file_path").alias("source_file_path"),
        F.col("_metadata.file_name").alias("source_file_name"),
        F.col("_metadata.file_size").alias("source_file_size")
    )
    .writeStream
    .option("checkpointLocation", CHECKPOINT_PATH)
    .option("mergeSchema", "true")
    .trigger(availableNow=True)
    .toTable(BRONZE_TABLE)
)

query.awaitTermination()

print("Bronze ingestion complete.")

# COMMAND ----------

audit_df = (
    spark.table(BRONZE_TABLE)
    .groupBy(
        "bldg_id",
        "ingest_date",
        "source_file_name",
        "source_file_path",
        "source_file_size"
    )
    .agg(
        F.count("*").alias("row_count"),
        F.countDistinct("timestamp").alias("distinct_timestamps"),
        F.sum(
            F.when(
                F.col("_rescued_data").isNotNull(),
                1
            ).otherwise(0)
        ).alias("rescued_rows"),
        F.min("timestamp").alias("first_timestamp"),
        F.max("timestamp").alias("last_timestamp")
    )
    .withColumn(
        "status",
        F.when(
            (F.col("row_count") == 35040) &
            (F.col("distinct_timestamps") == 35040) &
            (F.col("rescued_rows") == 0),
            F.lit("SUCCESS")
        ).otherwise(
            F.lit("REVIEW")
        )
    )
    .withColumn(
        "audit_timestamp",
        F.current_timestamp()
    )
)

audit_df.createOrReplaceTempView(
    "current_consumption_audit"
)

spark.sql(f"""
MERGE INTO {AUDIT_TABLE} AS target
USING current_consumption_audit AS source

ON target.bldg_id = source.bldg_id
AND target.ingest_date = source.ingest_date

WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
""")

print("Bronze reconciliation audit complete.")

display(
    spark.table(AUDIT_TABLE)
    .orderBy("bldg_id")
)