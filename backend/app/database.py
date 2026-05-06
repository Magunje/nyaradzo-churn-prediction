import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterable

from .config import DATABASE_PATH


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
    "Kudzai",
    "Munashe",
    "Nyasha",
    "Farai",
    "Simba",
    "Rudo",
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
    "Maregere",
    "Muchengeti",
    "Dube",
    "Mpofu",
    "Mtetwa",
    "Makwara",
]


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS policyholders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policyholder_id TEXT UNIQUE NOT NULL,
    policy_number TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    customer_email TEXT,
    age INTEGER NOT NULL,
    policy_age_group TEXT NOT NULL,
    gender TEXT NOT NULL,
    marital_status TEXT NOT NULL,
    employment_status TEXT NOT NULL,
    region TEXT NOT NULL,
    monthly_income_usd REAL NOT NULL,
    dependents_count INTEGER NOT NULL,
    plan_type TEXT NOT NULL,
    payment_frequency TEXT NOT NULL,
    acquisition_channel TEXT NOT NULL,
    tenure_months INTEGER NOT NULL,
    monthly_premium_usd REAL NOT NULL,
    billing_amount_usd REAL NOT NULL,
    premium_to_income_ratio REAL NOT NULL,
    payment_delay_days_avg INTEGER NOT NULL,
    missed_payments_last_12m INTEGER NOT NULL,
    late_payments_last_12m INTEGER NOT NULL,
    customer_service_calls_last_6m INTEGER NOT NULL,
    complaints_last_12m INTEGER NOT NULL,
    policy_changes_last_12m INTEGER NOT NULL,
    claims_last_24m INTEGER NOT NULL,
    mobile_app_usage_score INTEGER NOT NULL,
    sms_engagement_rate REAL NOT NULL,
    retention_offer_received INTEGER NOT NULL,
    actual_churn_label INTEGER,
    last_churn_probability REAL,
    last_prediction_label TEXT,
    last_risk_band TEXT,
    last_risk_factors_json TEXT,
    last_all_factors_json TEXT,
    last_retention_action TEXT,
    last_prediction_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_policyholders_policyholder_id ON policyholders(policyholder_id);
CREATE INDEX IF NOT EXISTS idx_policyholders_region ON policyholders(region);
CREATE INDEX IF NOT EXISTS idx_policyholders_plan_type ON policyholders(plan_type);
CREATE INDEX IF NOT EXISTS idx_policyholders_risk_band ON policyholders(last_risk_band);
"""


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _policy_number_from_policyholder_id(policyholder_id: str) -> str:
    digits = "".join(character for character in str(policyholder_id) if character.isdigit())
    serial = int(digits) if digits else 0
    return f"POL-{serial:07d}"


def _customer_email_from_policyholder_id(policyholder_id: str) -> str:
    digits = "".join(character for character in str(policyholder_id) if character.isdigit())
    serial = digits or "0"
    return f"policyholder{serial}@customer.nyaradzo.co.zw"


def _name_parts_from_policyholder_id(policyholder_id: str) -> tuple[str, str]:
    digits = "".join(character for character in str(policyholder_id) if character.isdigit())
    serial = int(digits) if digits else 0
    return (
        FIRST_NAMES[serial % len(FIRST_NAMES)],
        LAST_NAMES[(serial * 7) % len(LAST_NAMES)],
    )


def _column_names(conn: sqlite3.Connection, table_name: str) -> set[str]:
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row[1] for row in rows}


def _ensure_policyholder_schema(conn: sqlite3.Connection) -> None:
    columns = _column_names(conn, "policyholders")
    if "policy_number" not in columns:
        conn.execute("ALTER TABLE policyholders ADD COLUMN policy_number TEXT")
    if "first_name" not in columns:
        conn.execute("ALTER TABLE policyholders ADD COLUMN first_name TEXT")
    if "last_name" not in columns:
        conn.execute("ALTER TABLE policyholders ADD COLUMN last_name TEXT")
    if "customer_email" not in columns:
        conn.execute("ALTER TABLE policyholders ADD COLUMN customer_email TEXT")
    if "last_all_factors_json" not in columns:
        conn.execute("ALTER TABLE policyholders ADD COLUMN last_all_factors_json TEXT")

    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_policyholders_policy_number ON policyholders(policy_number)")

    rows = conn.execute(
        """
        SELECT id, policyholder_id
        FROM policyholders
        WHERE policy_number IS NULL OR TRIM(policy_number) = ''
        """
    ).fetchall()
    for row in rows:
        conn.execute(
            "UPDATE policyholders SET policy_number = ? WHERE id = ?",
            [_policy_number_from_policyholder_id(row["policyholder_id"]), row["id"]],
        )

    name_rows = conn.execute(
        """
        SELECT id, policyholder_id
        FROM policyholders
        WHERE first_name IS NULL
           OR TRIM(first_name) = ''
           OR last_name IS NULL
           OR TRIM(last_name) = ''
           OR first_name LIKE 'Member %'
           OR last_name = 'Imported'
        """
    ).fetchall()
    for row in name_rows:
        first_name, last_name = _name_parts_from_policyholder_id(row["policyholder_id"])
        conn.execute(
            """
            UPDATE policyholders
            SET first_name = CASE
                    WHEN first_name IS NULL OR TRIM(first_name) = '' OR first_name LIKE 'Member %' THEN ?
                    ELSE first_name
                END,
                last_name = CASE
                    WHEN last_name IS NULL OR TRIM(last_name) = '' OR last_name = 'Imported' THEN ?
                    ELSE last_name
                END
            WHERE id = ?
            """,
            [first_name, last_name, row["id"]],
        )

    email_rows = conn.execute(
        """
        SELECT id, policyholder_id
        FROM policyholders
        WHERE customer_email IS NULL OR TRIM(customer_email) = ''
        """
    ).fetchall()
    for row in email_rows:
        conn.execute(
            "UPDATE policyholders SET customer_email = ? WHERE id = ?",
            [_customer_email_from_policyholder_id(row["policyholder_id"]), row["id"]],
        )


@contextmanager
def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.executescript(SCHEMA_SQL)
        _ensure_policyholder_schema(conn)


def fetch_one(query: str, params: Iterable[Any] | None = None) -> sqlite3.Row | None:
    with get_connection() as conn:
        cur = conn.execute(query, tuple(params or []))
        return cur.fetchone()


def fetch_all(query: str, params: Iterable[Any] | None = None) -> list[sqlite3.Row]:
    with get_connection() as conn:
        cur = conn.execute(query, tuple(params or []))
        return cur.fetchall()


def execute(query: str, params: Iterable[Any] | None = None) -> int:
    with get_connection() as conn:
        cur = conn.execute(query, tuple(params or []))
        return cur.lastrowid


def executemany(query: str, param_sets: Iterable[Iterable[Any]]) -> None:
    with get_connection() as conn:
        conn.executemany(query, param_sets)


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    data = dict(row)

    risk_factors = data.get("last_risk_factors_json")
    all_factors = data.get("last_all_factors_json")
    data["last_risk_factors"] = json.loads(risk_factors) if risk_factors else []
    data["all_considered_factors"] = json.loads(all_factors) if all_factors else []

    data.pop("last_risk_factors_json", None)
    data.pop("last_all_factors_json", None)
    return data
