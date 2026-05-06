import json
from pathlib import Path

import pandas as pd

from app.auth import ensure_default_admin
from app.config import DATASET_PATH
from app.database import executemany, fetch_one, init_db, utc_now_iso
from app.services.insights import derive_feature_columns, policy_number_from_policyholder_id
from app.services.ml import ensure_model_artifact, predict_records

FIRST_NAMES = [
    "Daniela",
    "Anesu",
    "Ashley",
    "Blessing",
    "Tatenda",
    "Nomsa",
    "Rutendo",
    "Tanaka",
    "Tapiwa",
    "Tendai",
]

LAST_NAMES = [
    "Chakuringama",
    "Chibanda",
    "Moyo",
    "Ndlovu",
    "Nyathi",
    "Sibanda",
    "Muzanenhamo",
    "Mhlanga",
    "Marufu",
    "Chirume",
]


def name_parts_for_policyholder(policyholder_id: str) -> tuple[str, str]:
    digits = "".join(character for character in str(policyholder_id) if character.isdigit())
    serial = int(digits) if digits else 0
    return (
        FIRST_NAMES[serial % len(FIRST_NAMES)],
        LAST_NAMES[(serial * 7) % len(LAST_NAMES)],
    )


def seed_policyholders(dataset_path: Path = DATASET_PATH) -> None:
    existing = fetch_one("SELECT COUNT(*) AS count FROM policyholders")
    if existing and existing["count"] > 0:
        print("Policyholders already seeded. Skipping.")
        return

    df = pd.read_csv(dataset_path)
    records = []
    for row in df.to_dict(orient="records"):
        first_name, last_name = name_parts_for_policyholder(row["policyholder_id"])
        payload = {
            "policyholder_id": row["policyholder_id"],
            "policy_number": policy_number_from_policyholder_id(row["policyholder_id"]),
            "first_name": first_name,
            "last_name": last_name,
            "customer_email": f"{row['policyholder_id'].lower()}@customer.nyaradzo.co.zw",
            "age": int(row["age"]),
            "gender": row["gender"],
            "marital_status": row["marital_status"],
            "employment_status": row["employment_status"],
            "region": row["region"],
            "monthly_income_usd": float(row["monthly_income_usd"]),
            "dependents_count": int(row["dependents_count"]),
            "plan_type": row["plan_type"],
            "payment_frequency": row["payment_frequency"],
            "acquisition_channel": row["acquisition_channel"],
            "tenure_months": int(row["tenure_months"]),
            "monthly_premium_usd": float(row["monthly_premium_usd"]),
            "payment_delay_days_avg": int(row["payment_delay_days_avg"]),
            "missed_payments_last_12m": int(row["missed_payments_last_12m"]),
            "late_payments_last_12m": int(row["late_payments_last_12m"]),
            "customer_service_calls_last_6m": int(row["customer_service_calls_last_6m"]),
            "complaints_last_12m": int(row["complaints_last_12m"]),
            "policy_changes_last_12m": int(row["policy_changes_last_12m"]),
            "claims_last_24m": int(row["claims_last_24m"]),
            "mobile_app_usage_score": int(row["mobile_app_usage_score"]),
            "sms_engagement_rate": float(row["sms_engagement_rate"]),
            "retention_offer_received": int(row["retention_offer_received"]),
            "actual_churn_label": int(row["churn"]),
        }
        records.append(derive_feature_columns(payload))

    predictions = predict_records(records)
    now = utc_now_iso()
    rows = []
    for record, prediction in zip(records, predictions, strict=False):
        rows.append(
            [
                record["policyholder_id"],
                record["policy_number"],
                record["first_name"],
                record["last_name"],
                record["customer_email"],
                record["age"],
                record["policy_age_group"],
                record["gender"],
                record["marital_status"],
                record["employment_status"],
                record["region"],
                record["monthly_income_usd"],
                record["dependents_count"],
                record["plan_type"],
                record["payment_frequency"],
                record["acquisition_channel"],
                record["tenure_months"],
                record["monthly_premium_usd"],
                record["billing_amount_usd"],
                record["premium_to_income_ratio"],
                record["payment_delay_days_avg"],
                record["missed_payments_last_12m"],
                record["late_payments_last_12m"],
                record["customer_service_calls_last_6m"],
                record["complaints_last_12m"],
                record["policy_changes_last_12m"],
                record["claims_last_24m"],
                record["mobile_app_usage_score"],
                record["sms_engagement_rate"],
                record["retention_offer_received"],
                record["actual_churn_label"],
                prediction["churn_probability"],
                prediction["predicted_class"],
                prediction["risk_band"],
                json.dumps(prediction["top_risk_factors"]),
                json.dumps(prediction["all_considered_factors"]),
                prediction["suggested_retention_action"],
                now,
                now,
                now,
            ]
        )

    executemany(
        """
        INSERT INTO policyholders (
            policyholder_id, policy_number, first_name, last_name, customer_email, age, policy_age_group, gender, marital_status, employment_status,
            region, monthly_income_usd, dependents_count, plan_type, payment_frequency,
            acquisition_channel, tenure_months, monthly_premium_usd, billing_amount_usd,
            premium_to_income_ratio, payment_delay_days_avg, missed_payments_last_12m,
            late_payments_last_12m, customer_service_calls_last_6m, complaints_last_12m,
            policy_changes_last_12m, claims_last_24m, mobile_app_usage_score,
            sms_engagement_rate, retention_offer_received, actual_churn_label,
            last_churn_probability, last_prediction_label, last_risk_band,
            last_risk_factors_json, last_all_factors_json, last_retention_action, last_prediction_at,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    print(f"Seeded {len(rows)} policyholders.")


if __name__ == "__main__":
    init_db()
    ensure_model_artifact()
    ensure_default_admin()
    seed_policyholders()
    print("Default login:")
    print("  email: admin@nyaradzo.co.zw")
    print("  password: Nyaradzo@123")
