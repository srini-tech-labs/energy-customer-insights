# Databricks notebook source
# Cell 15 - Verify scoped Files API token can read the serving Volume

import json
from databricks.sdk import WorkspaceClient

SNAPSHOT_PATH = (
    "/Volumes/power_energy/gold/serving_data/"
    "energy_customer_snapshot.json"
)

default_client = WorkspaceClient()

files_token = dbutils.secrets.get(
    scope="energy-api",
    key="files-token"
)

files_client = WorkspaceClient(
    host=default_client.config.host,
    token=files_token,
    auth_type="pat"
)

response = files_client.files.download(
    SNAPSHOT_PATH
)

with response.contents as file:
    snapshot_test = json.loads(
        file.read().decode("utf-8")
    )

print("PASS: files-token can read the serving Volume.")
print(
    "Accounts:",
    len(snapshot_test["data"]["accounts"])
)
print(
    "Snapshot path:",
    SNAPSHOT_PATH
)

# COMMAND ----------

# Cell 14 - Store Files API credential securely

from getpass import getpass
from databricks.sdk import WorkspaceClient

secret_client = WorkspaceClient()

scope_name = "energy-api"
secret_key = "files-token"

existing_scopes = {
    scope.name
    for scope in secret_client.secrets.list_scopes()
}

if scope_name not in existing_scopes:
    secret_client.secrets.create_scope(
        scope=scope_name
    )

files_token = getpass(
    "Databricks Files API token (hidden): "
).strip()

try:
    if not files_token:
        raise ValueError("Token cannot be empty.")

    secret_client.secrets.put_secret(
        scope=scope_name,
        key=secret_key,
        string_value=files_token
    )

finally:
    del files_token

print(
    "PASS: Files API credential stored as "
    "energy-api/files-token."
)