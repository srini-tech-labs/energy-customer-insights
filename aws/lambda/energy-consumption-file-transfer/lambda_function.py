import boto3
import json
import os

from datetime import datetime, timezone


s3 = boto3.client("s3")

# Set via the Lambda function's environment variable configuration.
BUCKET = os.environ.get("ENERGY_S3_BUCKET", "your-energy-data-bucket")

INCOMING_PREFIX = "source-simulator/consumption/2018/incoming/"
ARCHIVE_PREFIX = "source-simulator/consumption/2018/archive/"
LANDING_PREFIX = "landing/consumption/2018/"
AUDIT_PREFIX = "transfer-audit/consumption/"


def list_files(prefix):
    """Return all real S3 objects under a prefix."""
    paginator = s3.get_paginator("list_objects_v2")
    keys = []

    for page in paginator.paginate(
        Bucket=BUCKET,
        Prefix=prefix
    ):
        for obj in page.get("Contents", []):
            key = obj["Key"]

            if not key.endswith("/"):
                keys.append(key)

    return keys


def find_existing_file(prefix, filename):
    """
    Find an existing object with the same filename anywhere
    underneath the supplied prefix.
    """
    for key in list_files(prefix):
        if os.path.basename(key) == filename:
            return key

    return None


def verify_copy(source_key, target_key):
    """
    Verify that source and target have the same byte size.
    """
    source = s3.head_object(
        Bucket=BUCKET,
        Key=source_key
    )

    target = s3.head_object(
        Bucket=BUCKET,
        Key=target_key
    )

    source_size = source["ContentLength"]
    target_size = target["ContentLength"]

    if source_size != target_size:
        raise ValueError(
            f"Copy verification failed. "
            f"Source size={source_size}, "
            f"target size={target_size}"
        )

    return {
        "source_size_bytes": source_size,
        "target_size_bytes": target_size,
        "source_etag": source["ETag"].strip('"'),
        "target_etag": target["ETag"].strip('"')
    }


def write_audit(record, context):
    """Write one audit JSON record for the run."""

    now = datetime.now(timezone.utc)

    audit_key = (
        f"{AUDIT_PREFIX}"
        f"{now:%Y/%m/%d}/"
        f"{now:%H%M%S}-{context.aws_request_id}.json"
    )

    s3.put_object(
        Bucket=BUCKET,
        Key=audit_key,
        Body=json.dumps(
            record,
            indent=2
        ).encode("utf-8"),
        ContentType="application/json"
    )

    return audit_key


def lambda_handler(event, context):

    now = datetime.now(timezone.utc)
    run_date = now.date().isoformat()

    try:

        # -------------------------------------------------
        # 1. Check incoming queue
        # -------------------------------------------------

        incoming_files = sorted(
            list_files(INCOMING_PREFIX)
        )

        if not incoming_files:

            audit = {
                "run_timestamp_utc": now.isoformat(),
                "run_date": run_date,
                "status": "NO_DATA",
                "files_found": 0,
                "files_transferred": 0,
                "message": "No files available in incoming."
            }

            audit_key = write_audit(
                audit,
                context
            )

            print(json.dumps(audit))

            return {
                "statusCode": 200,
                "status": "NO_DATA",
                "audit_key": audit_key
            }

        # -------------------------------------------------
        # 2. Process EXACTLY ONE incoming file
        # -------------------------------------------------

        source_key = incoming_files[0]

        filename = os.path.basename(
            source_key
        )

        # -------------------------------------------------
        # 3. LANDING
        #
        # First check whether this file was already copied
        # during an earlier partial run.
        # -------------------------------------------------

        existing_landing_key = find_existing_file(
            LANDING_PREFIX,
            filename
        )

        if existing_landing_key:

            landing_key = existing_landing_key
            landing_reused = True

        else:

            landing_key = (
                f"{LANDING_PREFIX}"
                f"ingest_date={run_date}/"
                f"{filename}"
            )

            s3.copy_object(
                Bucket=BUCKET,
                CopySource={
                    "Bucket": BUCKET,
                    "Key": source_key
                },
                Key=landing_key
            )

            landing_reused = False

        # -------------------------------------------------
        # 4. Verify landing copy
        # -------------------------------------------------

        landing_verification = verify_copy(
            source_key,
            landing_key
        )

        # -------------------------------------------------
        # 5. ARCHIVE
        #
        # Same retry protection here.
        # -------------------------------------------------

        existing_archive_key = find_existing_file(
            ARCHIVE_PREFIX,
            filename
        )

        if existing_archive_key:

            archive_key = existing_archive_key
            archive_reused = True

        else:

            archive_key = (
                f"{ARCHIVE_PREFIX}"
                f"processed_date={run_date}/"
                f"{filename}"
            )

            s3.copy_object(
                Bucket=BUCKET,
                CopySource={
                    "Bucket": BUCKET,
                    "Key": source_key
                },
                Key=archive_key
            )

            archive_reused = False

        # -------------------------------------------------
        # 6. Verify archive copy
        # -------------------------------------------------

        archive_verification = verify_copy(
            source_key,
            archive_key
        )

        # -------------------------------------------------
        # 7. Delete source ONLY AFTER both copies verify
        # -------------------------------------------------

        s3.delete_object(
            Bucket=BUCKET,
            Key=source_key
        )

        # -------------------------------------------------
        # 8. SUCCESS audit
        # -------------------------------------------------

        audit = {
            "run_timestamp_utc": now.isoformat(),
            "run_date": run_date,

            "status": "SUCCESS",

            "filename": filename,

            "source_key": source_key,
            "landing_key": landing_key,
            "archive_key": archive_key,

            "source_size_bytes":
                landing_verification["source_size_bytes"],

            "landing_size_bytes":
                landing_verification["target_size_bytes"],

            "archive_size_bytes":
                archive_verification["target_size_bytes"],

            "source_etag":
                landing_verification["source_etag"],

            "landing_etag":
                landing_verification["target_etag"],

            "archive_etag":
                archive_verification["target_etag"],

            "landing_reused":
                landing_reused,

            "archive_reused":
                archive_reused,

            "files_waiting_before_run":
                len(incoming_files),

            "files_transferred": 1,

            "source_removed_from_incoming": True,

            "message": (
                "File transferred, verified, "
                "archived, and removed from incoming."
            )
        }

        audit_key = write_audit(
            audit,
            context
        )

        print(json.dumps(audit))

        return {
            "statusCode": 200,
            "status": "SUCCESS",
            "source_key": source_key,
            "landing_key": landing_key,
            "archive_key": archive_key,
            "audit_key": audit_key
        }

    except Exception as error:

        # -------------------------------------------------
        # FAILED audit
        #
        # If failure happens before successful cleanup,
        # the incoming file remains available for retry.
        # -------------------------------------------------

        failure = {
            "run_timestamp_utc": now.isoformat(),
            "run_date": run_date,
            "status": "FAILED",
            "error_type": type(error).__name__,
            "message": str(error)
        }

        print(json.dumps(failure))

        try:
            write_audit(
                failure,
                context
            )

        except Exception as audit_error:
            print(
                "Unable to write failure audit:",
                type(audit_error).__name__,
                str(audit_error)
            )

        raise