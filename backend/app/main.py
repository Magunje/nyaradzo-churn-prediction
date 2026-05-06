import asyncio
import json
import logging
import re
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .auth import ensure_default_admin, get_current_user, login_user, validate_email_format
from .config import AUTO_SEED_POLICYHOLDERS, FRONTEND_DIST_DIR, REFERENCE_DATA, prepare_runtime_environment
from .database import execute, executemany, fetch_all, fetch_one, init_db, row_to_dict, utc_now_iso
from .schemas import (
    DashboardMetrics,
    LoginRequest,
    LoginResponse,
    PaginatedPolicyholders,
    PolicyNumberLookupRequest,
    PolicyholderCreate,
    PolicyholderOut,
    PolicyholderUpdate,
    PredictionInput,
    PredictionResponse,
    ReferenceDataResponse,
)
from .services.insights import classify_risk, derive_feature_columns, policy_number_from_policyholder_id
from .services.ml import ensure_model_artifact, load_metadata, predict_records, warm_model


SORTABLE_COLUMNS = {
    "policyholder_id": "policyholder_id",
    "policy_number": "policy_number",
    "region": "region",
    "plan_type": "plan_type",
    "tenure_months": "tenure_months",
    "monthly_premium_usd": "monthly_premium_usd",
    "last_churn_probability": "last_churn_probability",
    "created_at": "created_at",
}
logger = logging.getLogger(__name__)
background_tasks: set[asyncio.Task] = set()


def model_to_dict(model, *, exclude_unset: bool = False) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump(exclude_unset=exclude_unset)
    return model.dict(exclude_unset=exclude_unset)


def normalize_policy_number(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]", "", value or "").upper()
    if cleaned.startswith("POL"):
        digits = cleaned[3:]
    else:
        digits = cleaned
    if not digits or not digits.isdigit():
        raise HTTPException(status_code=400, detail="Please provide a valid policy number.")
    return f"POL-{int(digits):07d}"


def serialize_policyholder_row(row) -> dict:
    data = row_to_dict(row)
    if data is None:
        raise HTTPException(status_code=404, detail="Policyholder not found.")
    if not data.get("policy_number"):
        data["policy_number"] = policy_number_from_policyholder_id(data["policyholder_id"])
    if data.get("last_churn_probability") is not None:
        data["last_risk_band"], _ = classify_risk(
            float(data["last_churn_probability"] or 0),
            factors=data.get("all_considered_factors") or [],
        )
    return data


def next_policyholder_id() -> str:
    row = fetch_one(
        """
        SELECT policyholder_id
        FROM policyholders
        WHERE policyholder_id LIKE 'PH%'
        ORDER BY id DESC
        LIMIT 1
        """
    )
    if row is None:
        return "PH200000"
    last_value = row["policyholder_id"]
    try:
        serial = int(last_value.replace("PH", ""))
    except ValueError:
        serial = 200000
    return f"PH{serial + 1}"


def fetch_policyholder_by_policy_number(policy_number: str):
    normalized = normalize_policy_number(policy_number)
    row = fetch_one("SELECT * FROM policyholders WHERE policy_number = ?", [normalized])
    if row is None:
        raise HTTPException(status_code=404, detail="No policyholder was found for that policy number.")
    return row


def normalize_policyholder_identity(data: dict) -> dict:
    data["first_name"] = str(data.get("first_name", "")).strip()
    data["last_name"] = str(data.get("last_name", "")).strip()
    data["customer_email"] = str(data.get("customer_email", "")).strip().lower()

    if not data["first_name"] or not data["last_name"]:
        raise HTTPException(status_code=400, detail="Please provide both first name and surname.")
    if not validate_email_format(data["customer_email"]):
        raise HTTPException(status_code=400, detail="Please provide a valid customer email address.")
    return data


def persist_prediction_for_policyholder(policyholder_db_id: int, record: dict) -> dict:
    prediction = predict_records([record])[0]
    now = utc_now_iso()
    execute(
        """
        UPDATE policyholders
        SET last_churn_probability = ?,
            last_prediction_label = ?,
            last_risk_band = ?,
            last_risk_factors_json = ?,
            last_all_factors_json = ?,
            last_retention_action = ?,
            last_prediction_at = ?,
            updated_at = ?
        WHERE id = ?
        """,
        [
            prediction["churn_probability"],
            prediction["predicted_class"],
            prediction["risk_band"],
            json.dumps(prediction["top_risk_factors"]),
            json.dumps(prediction["all_considered_factors"]),
            prediction["suggested_retention_action"],
            now,
            now,
            policyholder_db_id,
        ],
    )
    return prediction


def build_dashboard_trend_series() -> list[dict]:
    rows = fetch_all(
        """
        SELECT
            CASE
                WHEN tenure_months < 12 THEN '0-11'
                WHEN tenure_months < 24 THEN '12-23'
                WHEN tenure_months < 36 THEN '24-35'
                WHEN tenure_months < 48 THEN '36-47'
                WHEN tenure_months < 60 THEN '48-59'
                ELSE '60+'
            END AS tenure_bucket,
            AVG(COALESCE(last_churn_probability, 0)) AS avg_probability,
            COUNT(*) AS total
        FROM policyholders
        GROUP BY tenure_bucket
        ORDER BY MIN(tenure_months)
        """
    )
    return [dict(row) for row in rows]


def build_dashboard_monthly_series() -> dict[str, list[dict]]:
    rows = fetch_all(
        """
        SELECT id, claims_last_24m, last_churn_probability
        FROM policyholders
        ORDER BY id
        """
    )

    now = datetime.now()
    labels = []
    for offset in range(6, -1, -1):
        month_number = ((now.month - offset - 1) % 12) + 1
        labels.append(datetime(now.year, month_number, 1).strftime("%b"))

    buckets = {
        label: {"new_policies": 0, "claims": 0, "churn_probability_sum": 0.0, "count": 0}
        for label in labels
    }

    for row in rows:
        label = labels[int(row["id"]) % len(labels)]
        bucket = buckets[label]
        bucket["new_policies"] += 1
        bucket["claims"] += int(row["claims_last_24m"] or 0)
        bucket["churn_probability_sum"] += float(row["last_churn_probability"] or 0)
        bucket["count"] += 1

    monthly_activity = []
    churn_rate = []
    for label in labels:
        bucket = buckets[label]
        monthly_activity.append(
            {
                "label": label,
                "new_policies": bucket["new_policies"],
                "claims": bucket["claims"],
            }
        )
        average_probability = (bucket["churn_probability_sum"] / bucket["count"]) if bucket["count"] else 0.0
        churn_rate.append(
            {
                "label": label,
                "value": round(average_probability * 100, 2),
            }
        )

    return {
        "monthly_activity": monthly_activity,
        "churn_rate": churn_rate,
    }


def refresh_cached_risk_bands() -> None:
    rows = fetch_all(
        """
        SELECT id, last_churn_probability, last_all_factors_json, last_risk_band
        FROM policyholders
        WHERE last_churn_probability IS NOT NULL
        """
    )
    updates = []
    for row in rows:
        factors = json.loads(row["last_all_factors_json"] or "[]")
        risk_band, _ = classify_risk(float(row["last_churn_probability"] or 0), factors=factors)
        if risk_band != row["last_risk_band"]:
            updates.append([risk_band, utc_now_iso(), row["id"]])

    if updates:
        executemany(
            """
            UPDATE policyholders
            SET last_risk_band = ?,
                updated_at = ?
            WHERE id = ?
            """,
            updates,
        )
        logger.info("Refreshed %s cached risk bands.", len(updates))


def build_age_risk_series() -> list[dict]:
    rows = fetch_all(
        """
        SELECT
            CASE
                WHEN age <= 25 THEN '18-25'
                WHEN age <= 35 THEN '26-35'
                WHEN age <= 45 THEN '36-45'
                WHEN age <= 60 THEN '46-60'
                ELSE '60+'
            END AS label,
            AVG(COALESCE(last_churn_probability, 0)) AS value,
            COUNT(*) AS total
        FROM policyholders
        GROUP BY label
        ORDER BY MIN(age)
        """
    )
    return [{"label": row["label"], "value": float(row["value"] or 0), "total": int(row["total"] or 0)} for row in rows]


def build_premium_tenure_series() -> list[dict]:
    rows = fetch_all(
        """
        SELECT
            CAST(tenure_months / 12 AS INTEGER) || 'y' AS label,
            AVG(COALESCE(monthly_premium_usd, 0)) AS value,
            COUNT(*) AS total
        FROM policyholders
        GROUP BY CAST(tenure_months / 12 AS INTEGER)
        ORDER BY CAST(tenure_months / 12 AS INTEGER)
        LIMIT 10
        """
    )
    return [{"label": row["label"], "value": float(row["value"] or 0), "total": int(row["total"] or 0)} for row in rows]


def track_background_task(task: asyncio.Task) -> None:
    background_tasks.add(task)

    def handle_done(completed_task: asyncio.Task) -> None:
        background_tasks.discard(completed_task)
        try:
            completed_task.result()
        except asyncio.CancelledError:
            pass
        except Exception:
            logger.exception("Background startup task failed.")

    task.add_done_callback(handle_done)


async def prepare_model_and_seed_data() -> None:
    if AUTO_SEED_POLICYHOLDERS:
        from .scripts.seed_data import seed_policyholders

        await asyncio.to_thread(seed_policyholders)

    await asyncio.to_thread(refresh_cached_risk_bands)
    await asyncio.to_thread(warm_model)


@asynccontextmanager
async def lifespan(_: FastAPI):
    prepare_runtime_environment()
    init_db()
    ensure_model_artifact()
    ensure_default_admin()
    track_background_task(asyncio.create_task(prepare_model_and_seed_data()))
    yield


app = FastAPI(
    title="Nyaradzo Policyholder Churn Prediction API",
    version="1.1.1",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_assets_dir = FRONTEND_DIST_DIR / "assets"
if frontend_assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=frontend_assets_dir), name="frontend-assets")


def frontend_index_path():
    return FRONTEND_DIST_DIR / "index.html"


def frontend_is_available() -> bool:
    return frontend_index_path().exists()


def serve_frontend_index():
    return FileResponse(frontend_index_path())


@app.get("/health")
def health_check():
    metadata = load_metadata()
    return {
        "status": "ok",
        "model": metadata["selected_model"],
        "trained_at": metadata["trained_at"],
        "prediction_threshold": metadata.get("prediction_threshold"),
    }


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    token, user = login_user(payload.email, payload.password)
    return {"access_token": token, "user": user}


@app.get("/api/reference-data", response_model=ReferenceDataResponse)
def reference_data(_: dict = Depends(get_current_user)):
    return {"data": REFERENCE_DATA}


@app.get("/api/dashboard/metrics", response_model=DashboardMetrics)
def dashboard_metrics(_: dict = Depends(get_current_user)):
    totals = fetch_one(
        """
        SELECT
            COUNT(*) AS total_policyholders,
            SUM(CASE WHEN COALESCE(actual_churn_label, 0) = 0 THEN 1 ELSE 0 END) AS active_policies,
            SUM(CASE WHEN COALESCE(last_risk_band, '') = 'High' THEN 1 ELSE 0 END) AS high_risk_customers,
            AVG(COALESCE(last_churn_probability, 0)) AS average_churn_probability,
            SUM(COALESCE(billing_amount_usd, 0)) AS premium_revenue,
            SUM(CASE WHEN COALESCE(claims_last_24m, 0) > 0 THEN 1 ELSE 0 END) AS pending_claims,
            SUM(COALESCE(claims_last_24m, 0)) AS claims_processed,
            SUM(CASE WHEN COALESCE(tenure_months, 0) >= 60 THEN 1 ELSE 0 END) AS matured_policies,
            SUM(
                CASE
                    WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
                    THEN 1
                    ELSE 0
                END
            ) AS new_this_month
        FROM policyholders
        """
    )
    total_policyholders = int(totals["total_policyholders"] or 0)
    active_policies = int(totals["active_policies"] or 0)
    retention_rate = round((active_policies / total_policyholders) * 100, 2) if total_policyholders else 0.0

    region_rows = fetch_all(
        """
        SELECT region, COUNT(*) AS total
        FROM policyholders
        GROUP BY region
        ORDER BY total DESC
        LIMIT 5
        """
    )
    plan_rows = fetch_all(
        """
        SELECT plan_type, COUNT(*) AS total
        FROM policyholders
        GROUP BY plan_type
        ORDER BY total DESC
        """
    )
    recent_rows = fetch_all(
        """
        SELECT policyholder_id, policy_number, first_name, last_name, plan_type, region, last_churn_probability, last_risk_band, last_prediction_at
        FROM policyholders
        WHERE last_prediction_at IS NOT NULL
        ORDER BY last_prediction_at DESC
        LIMIT 6
        """
    )

    response = {
        "total_policyholders": total_policyholders,
        "active_policies": active_policies,
        "high_risk_customers": int(totals["high_risk_customers"] or 0),
        "retention_rate": retention_rate,
        "average_churn_probability": round(float(totals["average_churn_probability"] or 0), 4),
        "pending_claims": int(totals["pending_claims"] or 0),
        "premium_revenue": round(float(totals["premium_revenue"] or 0), 2),
        "new_this_month": int(totals["new_this_month"] or 0),
        "claims_processed": int(totals["claims_processed"] or 0),
        "matured_policies": int(totals["matured_policies"] or 0),
        "region_breakdown": [dict(row) for row in region_rows],
        "plan_breakdown": [dict(row) for row in plan_rows],
        "recent_predictions": [dict(row) for row in recent_rows],
    }
    return response


@app.get("/api/dashboard/trends")
def dashboard_trends(_: dict = Depends(get_current_user)):
    return {
        "series": build_dashboard_trend_series(),
        **build_dashboard_monthly_series(),
    }


@app.get("/api/reports/summary")
def reports_summary(_: dict = Depends(get_current_user)):
    top_rows = fetch_all(
        """
        SELECT *
        FROM policyholders
        WHERE last_churn_probability IS NOT NULL
        ORDER BY last_churn_probability DESC
        LIMIT 10
        """
    )
    return {
        "age_series": build_age_risk_series(),
        "premium_series": build_premium_tenure_series(),
        "top_at_risk": [serialize_policyholder_row(row) for row in top_rows],
    }


@app.get("/api/policyholders", response_model=PaginatedPolicyholders)
def list_policyholders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=5000),
    search: str | None = None,
    region: str | None = None,
    plan_type: str | None = None,
    risk_band: str | None = None,
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc"),
    _: dict = Depends(get_current_user),
):
    filters = []
    params: list = []

    if search:
        filters.append(
            "(policyholder_id LIKE ? OR policy_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR region LIKE ? OR plan_type LIKE ?)"
        )
        pattern = f"%{search.strip()}%"
        params.extend([pattern, pattern, pattern, pattern, pattern, pattern])
    if region:
        filters.append("region = ?")
        params.append(region)
    if plan_type:
        filters.append("plan_type = ?")
        params.append(plan_type)
    if risk_band:
        filters.append("last_risk_band = ?")
        params.append(risk_band)

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
    safe_sort_by = SORTABLE_COLUMNS.get(sort_by, "created_at")
    safe_sort_dir = "ASC" if sort_dir.lower() == "asc" else "DESC"
    offset = (page - 1) * page_size

    count_row = fetch_one(f"SELECT COUNT(*) AS total FROM policyholders {where_clause}", params)
    items = fetch_all(
        f"""
        SELECT *
        FROM policyholders
        {where_clause}
        ORDER BY {safe_sort_by} {safe_sort_dir}
        LIMIT ? OFFSET ?
        """,
        [*params, page_size, offset],
    )

    return {
        "items": [serialize_policyholder_row(row) for row in items],
        "total": int(count_row["total"] if count_row else 0),
        "page": page,
        "page_size": page_size,
    }


@app.get("/api/policyholders/by-policy-number/{policy_number}", response_model=PolicyholderOut)
def get_policyholder_by_policy_number(policy_number: str, _: dict = Depends(get_current_user)):
    row = fetch_policyholder_by_policy_number(policy_number)
    return serialize_policyholder_row(row)


@app.get("/api/policyholders/{policyholder_db_id}", response_model=PolicyholderOut)
def get_policyholder(policyholder_db_id: int, _: dict = Depends(get_current_user)):
    row = fetch_one("SELECT * FROM policyholders WHERE id = ?", [policyholder_db_id])
    return serialize_policyholder_row(row)


@app.post("/api/policyholders", response_model=PolicyholderOut)
def create_policyholder(payload: PolicyholderCreate, _: dict = Depends(get_current_user)):
    data = derive_feature_columns(model_to_dict(payload, exclude_unset=True))
    data = normalize_policyholder_identity(data)
    now = utc_now_iso()
    policyholder_id = data.get("policyholder_id") or next_policyholder_id()
    policy_number = data.get("policy_number") or policy_number_from_policyholder_id(policyholder_id)
    inserted_id = execute(
        """
        INSERT INTO policyholders (
            policyholder_id, policy_number, first_name, last_name, customer_email, age, policy_age_group, gender, marital_status, employment_status,
            region, monthly_income_usd, dependents_count, plan_type, payment_frequency,
            acquisition_channel, tenure_months, monthly_premium_usd, billing_amount_usd,
            premium_to_income_ratio, payment_delay_days_avg, missed_payments_last_12m,
            late_payments_last_12m, customer_service_calls_last_6m, complaints_last_12m,
            policy_changes_last_12m, claims_last_24m, mobile_app_usage_score,
            sms_engagement_rate, retention_offer_received, actual_churn_label, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            policyholder_id,
            policy_number,
            data["first_name"],
            data["last_name"],
            data["customer_email"],
            data["age"],
            data["policy_age_group"],
            data["gender"],
            data["marital_status"],
            data["employment_status"],
            data["region"],
            data["monthly_income_usd"],
            data["dependents_count"],
            data["plan_type"],
            data["payment_frequency"],
            data["acquisition_channel"],
            data["tenure_months"],
            data["monthly_premium_usd"],
            data["billing_amount_usd"],
            data["premium_to_income_ratio"],
            data["payment_delay_days_avg"],
            data["missed_payments_last_12m"],
            data["late_payments_last_12m"],
            data["customer_service_calls_last_6m"],
            data["complaints_last_12m"],
            data["policy_changes_last_12m"],
            data["claims_last_24m"],
            data["mobile_app_usage_score"],
            data["sms_engagement_rate"],
            data["retention_offer_received"],
            data.get("actual_churn_label"),
            now,
            now,
        ],
    )
    data["policyholder_id"] = policyholder_id
    data["policy_number"] = policy_number
    persist_prediction_for_policyholder(inserted_id, data)
    row = fetch_one("SELECT * FROM policyholders WHERE id = ?", [inserted_id])
    return serialize_policyholder_row(row)


@app.put("/api/policyholders/{policyholder_db_id}", response_model=PolicyholderOut)
def update_policyholder(policyholder_db_id: int, payload: PolicyholderUpdate, _: dict = Depends(get_current_user)):
    current_row = fetch_one("SELECT * FROM policyholders WHERE id = ?", [policyholder_db_id])
    if current_row is None:
        raise HTTPException(status_code=404, detail="Policyholder not found.")

    current = serialize_policyholder_row(current_row)
    incoming = model_to_dict(payload, exclude_unset=True)
    data = derive_feature_columns({**current, **incoming})
    data = normalize_policyholder_identity(data)
    now = utc_now_iso()
    policy_number = data.get("policy_number") or current["policy_number"] or policy_number_from_policyholder_id(current["policyholder_id"])
    execute(
        """
        UPDATE policyholders
        SET policy_number = ?, first_name = ?, last_name = ?, customer_email = ?, age = ?, policy_age_group = ?, gender = ?, marital_status = ?, employment_status = ?,
            region = ?, monthly_income_usd = ?, dependents_count = ?, plan_type = ?, payment_frequency = ?,
            acquisition_channel = ?, tenure_months = ?, monthly_premium_usd = ?, billing_amount_usd = ?,
            premium_to_income_ratio = ?, payment_delay_days_avg = ?, missed_payments_last_12m = ?,
            late_payments_last_12m = ?, customer_service_calls_last_6m = ?, complaints_last_12m = ?,
            policy_changes_last_12m = ?, claims_last_24m = ?, mobile_app_usage_score = ?, sms_engagement_rate = ?,
            retention_offer_received = ?, actual_churn_label = ?, updated_at = ?
        WHERE id = ?
        """,
        [
            policy_number,
            data["first_name"],
            data["last_name"],
            data["customer_email"],
            data["age"],
            data["policy_age_group"],
            data["gender"],
            data["marital_status"],
            data["employment_status"],
            data["region"],
            data["monthly_income_usd"],
            data["dependents_count"],
            data["plan_type"],
            data["payment_frequency"],
            data["acquisition_channel"],
            data["tenure_months"],
            data["monthly_premium_usd"],
            data["billing_amount_usd"],
            data["premium_to_income_ratio"],
            data["payment_delay_days_avg"],
            data["missed_payments_last_12m"],
            data["late_payments_last_12m"],
            data["customer_service_calls_last_6m"],
            data["complaints_last_12m"],
            data["policy_changes_last_12m"],
            data["claims_last_24m"],
            data["mobile_app_usage_score"],
            data["sms_engagement_rate"],
            data["retention_offer_received"],
            data.get("actual_churn_label"),
            now,
            policyholder_db_id,
        ],
    )
    data["policyholder_id"] = current["policyholder_id"]
    data["policy_number"] = policy_number
    persist_prediction_for_policyholder(policyholder_db_id, data)
    row = fetch_one("SELECT * FROM policyholders WHERE id = ?", [policyholder_db_id])
    return serialize_policyholder_row(row)


@app.delete("/api/policyholders/{policyholder_db_id}")
def delete_policyholder(policyholder_db_id: int, _: dict = Depends(get_current_user)):
    current = fetch_one("SELECT id FROM policyholders WHERE id = ?", [policyholder_db_id])
    if current is None:
        raise HTTPException(status_code=404, detail="Policyholder not found.")
    execute("DELETE FROM policyholders WHERE id = ?", [policyholder_db_id])
    return {"status": "deleted"}


@app.post("/api/policyholders/{policyholder_db_id}/predict", response_model=PredictionResponse)
def predict_policyholder(policyholder_db_id: int, _: dict = Depends(get_current_user)):
    row = fetch_one("SELECT * FROM policyholders WHERE id = ?", [policyholder_db_id])
    data = serialize_policyholder_row(row)
    prediction = persist_prediction_for_policyholder(policyholder_db_id, data)
    return prediction


@app.post("/api/predictions/by-policy-number", response_model=PredictionResponse)
def predict_by_policy_number(payload: PolicyNumberLookupRequest, _: dict = Depends(get_current_user)):
    row = fetch_policyholder_by_policy_number(payload.policy_number)
    data = serialize_policyholder_row(row)
    prediction = persist_prediction_for_policyholder(data["id"], data)
    return prediction


@app.post("/api/predictions", response_model=PredictionResponse)
def predict_ad_hoc(payload: PredictionInput, _: dict = Depends(get_current_user)):
    data = derive_feature_columns(model_to_dict(payload))
    if data.get("policyholder_id") and not data.get("policy_number"):
        data["policy_number"] = policy_number_from_policyholder_id(data["policyholder_id"])
    prediction = predict_records([data])[0]
    return prediction


@app.get("/api/policyholders/{policyholder_db_id}/prediction-pdf")
def prediction_pdf_for_policyholder(policyholder_db_id: int, _: dict = Depends(get_current_user)):
    from .services.pdf_export import build_prediction_pdf

    row = fetch_one("SELECT * FROM policyholders WHERE id = ?", [policyholder_db_id])
    policyholder = serialize_policyholder_row(row)
    prediction = persist_prediction_for_policyholder(policyholder_db_id, policyholder)
    pdf_bytes = build_prediction_pdf(policyholder, prediction)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={policyholder['policy_number']}_churn_report.pdf"},
    )


@app.get("/api/predictions/by-policy-number/{policy_number}/pdf")
def prediction_pdf_by_policy_number(policy_number: str, _: dict = Depends(get_current_user)):
    from .services.pdf_export import build_prediction_pdf

    row = fetch_policyholder_by_policy_number(policy_number)
    policyholder = serialize_policyholder_row(row)
    prediction = persist_prediction_for_policyholder(policyholder["id"], policyholder)
    pdf_bytes = build_prediction_pdf(policyholder, prediction)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={policyholder['policy_number']}_churn_report.pdf"},
    )


@app.get("/api/model-info")
def model_info(_: dict = Depends(get_current_user)):
    return load_metadata()


@app.get("/", include_in_schema=False)
def serve_frontend_root():
    if not frontend_is_available():
        return {
            "status": "ok",
            "message": "API is running. Build the frontend or start the Vite dev server to use the web UI.",
        }
    return serve_frontend_index()


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend_routes(full_path: str):
    reserved_prefixes = ("api/", "docs", "redoc", "openapi.json", "health")
    if full_path.startswith(reserved_prefixes):
        raise HTTPException(status_code=404, detail="Not found.")

    if not frontend_is_available():
        raise HTTPException(status_code=404, detail="Frontend build not found.")

    candidate_path = (FRONTEND_DIST_DIR / full_path).resolve()
    frontend_root = FRONTEND_DIST_DIR.resolve()
    if candidate_path.is_file() and frontend_root in candidate_path.parents:
        return FileResponse(candidate_path)

    return serve_frontend_index()
