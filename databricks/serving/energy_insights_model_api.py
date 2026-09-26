# Databricks notebook source
from datetime import date

def handle_energy_request(request, snapshot):
    if not isinstance(request, dict):
        raise ValueError("Request must be a JSON object.")

    operation = request.get("operation")
    data = snapshot["data"]

    if operation == "list_accounts":
        result = {"accounts": data["accounts"]}

    elif operation in {"account_details", "investigate_usage"}:
        account_id = request.get("account_id")

        account = next(
            (
                row for row in data["accounts"]
                if row["account_id"] == account_id
            ),
            None,
        )

        if account is None:
            raise ValueError(
                "Unknown account_id. Use list_accounts to see valid IDs."
            )

        building_id = account["building_id"]

        if operation == "account_details":
            result = {
                "account": account,
                "daily_usage": [
                    row for row in data["daily_usage"]
                    if row["building_id"] == building_id
                ],
                "monthly_usage": [
                    row for row in data["monthly_usage"]
                    if row["building_id"] == building_id
                ],
            }

        else:
            month = request.get("month")

            try:
                parsed_month = date.fromisoformat(f"{month}-01")
                if parsed_month.strftime("%Y-%m") != month:
                    raise ValueError()
            except (TypeError, ValueError):
                raise ValueError("month must use YYYY-MM format.")

            comparison = next(
                (
                    row for row in data["investigations"]
                    if row["building_id"] == building_id
                    and str(row["usage_month"])[:7] == month
                ),
                None,
            )

            if comparison is None:
                raise ValueError("No data available for the requested month.")

            result = {
                "account_id": account_id,
                "comparison_available":
                    comparison["previous_month"] is not None,
                "comparison": comparison,
                "explanation_scope": (
                    "Changes in modeled electricity end uses and aligned historical weather. "
                    "Weather provides contextual evidence and does not establish causation. "
                    "Bill calculations are not included."
                ),
            }

    else:
        raise ValueError(
            "Supported operations: list_accounts, "
            "account_details, investigate_usage."
        )

    return {
        "operation": operation,
        "metadata": snapshot["metadata"],
        "data": result,
    }

# COMMAND ----------

import json
import requests
from databricks.sdk import WorkspaceClient

system_prompt = """
You explain modeled electricity usage using only the supplied JSON evidence.
Write one short paragraph in plain English.

Rules:
- Clearly describe the data as modeled electricity usage.
- Compare the current and previous month using their names.
- Report total electricity usage and the kWh change.
- Report average daily usage and its percentage change separately.
- Describe the main end-use contribution, especially cooling or heating.
- Use the supplied weather evidence when relevant:
  average temperature, CDD65, and HDD65.
- You may say weather conditions are "consistent with" increased
  cooling or heating demand.
- Do not claim that weather definitively caused the usage change.
- Do not invent customer behavior, equipment faults, bills, rates,
  thermostat settings, or other causes.
- Round numbers to two decimal places.
"""

# COMMAND ----------

def explain_energy_evidence(evidence):
    import json
    import logging
    import requests
    from databricks.sdk import WorkspaceClient

    data = evidence["data"]
    comparison = data["comparison"]

    if not data["comparison_available"]:
        return {
            "text": (
                "Modeled electricity usage for this month was "
                f"{comparison['electricity_kwh']:.2f} kWh. "
                "Previous-month data is unavailable, so a monthly "
                "comparison cannot be provided."
            ),
            "source": "no_comparison",
            "model": None
        }

    # A deterministic summary remains available if the LLM call fails.
    change = comparison["electricity_change_kwh"]
    direction = "increased" if change >= 0 else "decreased"

    fallback = (
        f"Modeled electricity usage was "
        f"{comparison['electricity_kwh']:.2f} kWh, compared with "
        f"{comparison['previous_electricity_kwh']:.2f} kWh "
        f"in the previous month. Total usage {direction} by "
        f"{abs(change):.2f} kWh. Average daily usage was "
        f"{comparison['average_daily_kwh']:.2f} kWh, compared with "
        f"{comparison['previous_average_daily_kwh']:.2f} kWh previously. "
        "Weather attribution and bill calculations are not included."
    )

    model_name = "system.ai.meta-llama-3-3-70b-instruct"

    try:
        # Create credentials at runtime; do not package a notebook client.
        client = WorkspaceClient()

        response = requests.post(
            f"{client.config.host.rstrip('/')}"
            "/ai-gateway/mlflow/v1/chat/completions",
            headers={
                **client.config.authenticate(),
                "Content-Type": "application/json"
            },
            json={
                "model": model_name,
                "max_tokens": 400,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": json.dumps(evidence, allow_nan=False)
                    }
                ]
            },
            timeout=30
        )
        response.raise_for_status()

        choice = response.json()["choices"][0]
        explanation = choice["message"]["content"]

        if (
            not isinstance(explanation, str)
            or not explanation.strip()
            or choice.get("finish_reason") == "length"
        ):
            raise ValueError("Empty or incomplete AI explanation")

        return {
            "text": explanation.strip(),
            "source": "ai",
            "model": model_name
        }

    except Exception as error:
        # Log the error type without exposing credentials or response bodies.
        logging.getLogger("energy_api").warning(
            "AI explanation failed: %s", type(error).__name__
        )
        return {
            "text": fallback,
            "source": "fallback",
            "model": None
        }


# COMMAND ----------

# Cell 11 - Energy Insights model using live published snapshot

import os
import mlflow
import pandas as pd
import json

from databricks.sdk import WorkspaceClient


LIVE_SNAPSHOT_PATH = (
    "/Volumes/power_energy/gold/serving_data/"
    "energy_customer_snapshot.json"
)


class EnergyInsightsModelV3(mlflow.pyfunc.PythonModel):

    def load_context(self, context):
        self.snapshot_path = LIVE_SNAPSHOT_PATH

    def _load_snapshot(self):

        files_token = os.getenv("ENERGY_FILES_TOKEN")

        if files_token:
            # Model Serving:
            # use dedicated Files API credential
            files_client = WorkspaceClient(
                host=os.getenv("DATABRICKS_HOST"),
                token=files_token,
                auth_type="pat"
            )
        else:
            # Notebook development/testing:
            # use current notebook authentication
            files_client = WorkspaceClient()

        response = files_client.files.download(
            self.snapshot_path
        )

        with response.contents as file:
            return json.loads(
                file.read().decode("utf-8")
            )

    def predict(self, context, model_input, params=None):

        # Load the latest published snapshot
        snapshot = self._load_snapshot()

        outputs = []

        for raw_request in model_input["request_json"]:

            try:
                request = json.loads(raw_request)

                if not isinstance(request, dict):
                    raise ValueError(
                        "Request must be a JSON object."
                    )

                if request.get("operation") == "explain_usage":

                    investigation_request = {
                        **request,
                        "operation": "investigate_usage"
                    }

                    result = handle_energy_request(
                        investigation_request,
                        snapshot
                    )

                    result["operation"] = "explain_usage"

                    result["data"]["explanation"] = (
                        explain_energy_evidence(result)
                    )

                else:
                    result = handle_energy_request(
                        request,
                        snapshot
                    )

                response = {
                    "ok": True,
                    "result": result
                }

            except (ValueError, TypeError) as error:

                response = {
                    "ok": False,
                    "error": {
                        "code": "INVALID_REQUEST",
                        "message": str(error)
                    }
                }

            outputs.append(
                json.dumps(
                    response,
                    allow_nan=False
                )
            )

        return pd.DataFrame({
            "response_json": outputs
        })


# ---------------------------------------------------------
# Notebook validation
# ---------------------------------------------------------

model_v3 = EnergyInsightsModelV3()
model_v3.load_context(None)

live_snapshot = model_v3._load_snapshot()

january_row = next(
    row
    for row in live_snapshot["data"]["investigations"]
    if row["account_id"] == "DEMO-102517"
    and row["usage_month"].startswith("2018-01")
)

assert "previous_month" in january_row
assert january_row["previous_month"] is None

print("PASS: live Volume snapshot loaded.")
print("PASS: January previous_month is explicitly null.")


test_input = pd.DataFrame({
    "request_json": [
        json.dumps({
            "operation": "investigate_usage",
            "account_id": "DEMO-102517",
            "month": "2018-01"
        })
    ]
})

test_output = model_v3.predict(
    None,
    test_input
)

parsed = json.loads(
    test_output.iloc[0]["response_json"]
)

assert parsed["ok"] is True

print(
    "PASS: investigate_usage works with live snapshot."
)

# COMMAND ----------

# Cell 12 - Package and register model with dynamic Volume snapshot

import json
import tempfile
from pathlib import Path
from importlib.metadata import version

import mlflow
import pandas as pd
from mlflow.models import infer_signature


# ---------------------------------------------------------
# Create model package location
# ---------------------------------------------------------

model_live_path = str(
    Path(
        tempfile.mkdtemp(
            prefix="energy_model_live_"
        )
    ) / "model"
)


# ---------------------------------------------------------
# Regression test inputs
# ---------------------------------------------------------

test_input = pd.DataFrame({
    "request_json": [
        json.dumps({
            "operation": "list_accounts"
        }),
        json.dumps({
            "operation": "investigate_usage",
            "account_id": "DEMO-102517",
            "month": "2018-05"
        }),
        json.dumps({
            "operation": "account_details",
            "account_id": "DEMO-102517"
        })
    ]
})

january_input = pd.DataFrame({
    "request_json": [
        json.dumps({
            "operation": "investigate_usage",
            "account_id": "DEMO-102517",
            "month": "2018-01"
        })
    ]
})

explain_input = pd.DataFrame({
    "request_json": [
        json.dumps({
            "operation": "explain_usage",
            "account_id": "DEMO-102517",
            "month": "2018-05"
        })
    ]
})


# ---------------------------------------------------------
# Run the new model directly against LIVE Volume snapshot
# ---------------------------------------------------------

direct_live = EnergyInsightsModelV3()
direct_live.load_context(None)

expected_output = direct_live.predict(
    None,
    test_input
)

january_output = direct_live.predict(
    None,
    january_input
)

explain_output = direct_live.predict(
    None,
    explain_input
)


# ---------------------------------------------------------
# Validate January null behavior before packaging
# ---------------------------------------------------------

january_response = json.loads(
    january_output.iloc[0]["response_json"]
)

assert january_response["ok"] is True

assert (
    january_response["result"]
    ["data"]
    ["comparison"]
    ["previous_month"]
    is None
)

assert (
    january_response["result"]
    ["data"]
    ["comparison_available"]
    is False
)

print(
    "PASS: live model preserves January null contract."
)


# ---------------------------------------------------------
# Save MLflow package
#
# IMPORTANT:
# No energy_snapshot artifact is bundled.
# Snapshot is loaded dynamically from Unity Catalog Volume.
# ---------------------------------------------------------

mlflow.pyfunc.save_model(
    path=model_live_path,

    python_model=EnergyInsightsModelV3(),

    signature=infer_signature(
        explain_input,
        explain_output
    ),

    input_example=explain_input,

    pip_requirements=[
        f"mlflow=={mlflow.__version__}",
        f"pandas=={pd.__version__}",
        f"cloudpickle=={__import__('cloudpickle').__version__}",
        f"requests=={__import__('requests').__version__}",
        f"databricks-sdk=={version('databricks-sdk')}"
    ],
)


# ---------------------------------------------------------
# Reload packaged model
# ---------------------------------------------------------

reloaded_live = mlflow.pyfunc.load_model(
    model_live_path
)


# ---------------------------------------------------------
# Verify normal operations survive save/reload
# ---------------------------------------------------------

reloaded_results = reloaded_live.predict(
    test_input
)

assert (
    reloaded_results["response_json"].tolist()
    == expected_output["response_json"].tolist()
)

print(
    "PASS: normal operations preserved after save/reload."
)


# ---------------------------------------------------------
# Verify January behavior survives save/reload
# ---------------------------------------------------------

packaged_january = json.loads(
    reloaded_live.predict(
        january_input
    ).iloc[0]["response_json"]
)

assert packaged_january["ok"] is True

assert (
    packaged_january["result"]
    ["data"]
    ["comparison"]
    ["previous_month"]
    is None
)

assert (
    packaged_january["result"]
    ["data"]
    ["comparison_available"]
    is False
)

print(
    "PASS: packaged model preserves January null behavior."
)


# ---------------------------------------------------------
# Verify weather-aware AI explanation
# ---------------------------------------------------------

packaged_explanation = json.loads(
    reloaded_live.predict(
        explain_input
    ).iloc[0]["response_json"]
)

assert packaged_explanation["ok"] is True

assert (
    packaged_explanation["result"]
    ["metadata"]
    ["weather_alignment_verified"]
    is True
)

assert (
    packaged_explanation["result"]
    ["data"]
    ["explanation"]
    ["source"]
    == "ai"
)

print(
    "PASS: packaged model returned "
    "weather-aware AI explanation."
)


# ---------------------------------------------------------
# Register new model version
# ---------------------------------------------------------

mlflow.set_registry_uri(
    "databricks-uc"
)

with mlflow.start_run(
    run_name="energy_customer_insights_live_snapshot"
):

    mlflow.log_artifacts(
        model_live_path,
        artifact_path="model"
    )

    model_uri = (
        f"runs:/"
        f"{mlflow.active_run().info.run_id}/model"
    )

    registered_live = mlflow.register_model(
        model_uri=model_uri,
        name=(
            "power_energy.gold."
            "energy_customer_insights"
        )
    )


print(
    "Registered model:",
    registered_live.name
)

print(
    "Version:",
    registered_live.version
)

print(
    "Model package:",
    model_live_path
)

print(
    "Snapshot source:",
    LIVE_SNAPSHOT_PATH
)

# COMMAND ----------

# Cell 13 - Live endpoint validation

from databricks.sdk import WorkspaceClient
import json

ENDPOINT_NAME = "energy-customer-insights"

w = WorkspaceClient()


# ---------------------------------------------------------
# Test 1 - list_accounts
# ---------------------------------------------------------

list_response = w.serving_endpoints.query(
    name=ENDPOINT_NAME,
    dataframe_records=[
        {
            "request_json": json.dumps({
                "operation": "list_accounts"
            })
        }
    ]
)

print("LIST_ACCOUNTS RESPONSE")
print(list_response)


# ---------------------------------------------------------
# Test 2 - January investigation
# ---------------------------------------------------------

january_response = w.serving_endpoints.query(
    name=ENDPOINT_NAME,
    dataframe_records=[
        {
            "request_json": json.dumps({
                "operation": "investigate_usage",
                "account_id": "DEMO-102517",
                "month": "2018-01"
            })
        }
    ]
)

print("\nJANUARY RESPONSE")
print(january_response)

# COMMAND ----------

# Cell 16 - Validate live AI explanation through endpoint

explain_response = w.serving_endpoints.query(
    name=ENDPOINT_NAME,
    dataframe_records=[
        {
            "request_json": json.dumps({
                "operation": "explain_usage",
                "account_id": "DEMO-102517",
                "month": "2018-05"
            })
        }
    ]
)

print("EXPLAIN_USAGE RESPONSE")
print(explain_response)

response_json = json.loads(
    explain_response.predictions[0]["response_json"]
)

assert response_json["ok"] is True

assert (
    response_json["result"]
    ["data"]
    ["explanation"]
    ["source"]
    == "ai"
)

assert (
    response_json["result"]
    ["metadata"]
    ["weather_alignment_verified"]
    is True
)

print("PASS: live endpoint returned AI explanation.")
print("PASS: weather-aware context preserved.")