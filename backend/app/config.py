import os
from pathlib import Path

from dotenv import load_dotenv


APP_NAME = "Nyaradzo Churn Prediction"

APP_DIR = Path(__file__).resolve().parent
SOURCE_ROOT = APP_DIR.parents[1]
BACKEND_DIR = SOURCE_ROOT / "backend"

for env_path in [SOURCE_ROOT / ".env", Path.cwd() / ".env"]:
    load_dotenv(env_path, override=False)


def path_from_env(name: str, default: Path) -> Path:
    raw_value = os.getenv(name)
    path = Path(raw_value) if raw_value else default
    return path if path.is_absolute() else SOURCE_ROOT / path


def env_flag(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


APP_STORAGE_DIR = path_from_env("APP_STORAGE_DIR", SOURCE_ROOT)
DATA_DIR = path_from_env("DATA_DIR", APP_DIR / "data")
DATABASE_PATH = path_from_env("DATABASE_PATH", BACKEND_DIR / "nyaradzo_churn.db")
MODEL_PATH = path_from_env("MODEL_PATH", DATA_DIR / "churn_model.pkl")
MODEL_METADATA_PATH = path_from_env("MODEL_METADATA_PATH", DATA_DIR / "model_metadata.json")
DATASET_PATH = path_from_env("DATASET_PATH", APP_DIR / "data" / "funeral_insurance_policyholder_churn_5000.csv")
FRONTEND_DIST_DIR = path_from_env("FRONTEND_DIST_DIR", SOURCE_ROOT / "frontend" / "dist")

DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@nyaradzo.co.zw").strip().lower()
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "Nyaradzo@123")
DEFAULT_ADMIN_NAME = os.getenv("DEFAULT_ADMIN_NAME", "MAGUNJE ANALYST")

PREFERRED_DEPLOYED_MODEL = os.getenv("PREFERRED_DEPLOYED_MODEL", "Random Forest")
AUTO_SEED_POLICYHOLDERS = env_flag("AUTO_SEED_POLICYHOLDERS")

TOKEN_TTL_HOURS = 12
HIGH_RISK_THRESHOLD = 0.65
MEDIUM_RISK_THRESHOLD = 0.4


def prepare_runtime_environment() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

REFERENCE_DATA = {
    "genders": ["Female", "Male"],
    "marital_statuses": ["Divorced", "Married", "Single", "Widowed"],
    "employment_statuses": [
        "Farmer",
        "Formally Employed",
        "Informal Trader",
        "Self Employed",
        "Unemployed",
    ],
    "regions": [
        "Bulawayo",
        "Harare",
        "Manicaland",
        "Mashonaland East",
        "Mashonaland West",
        "Masvingo",
        "Matabeleland North",
        "Matabeleland South",
        "Midlands",
    ],
    "plan_types": ["Basic", "Family", "Premium", "Standard"],
    "payment_frequencies": ["Monthly", "Quarterly", "Biannual", "Annual"],
    "acquisition_channels": ["Agent", "Branch", "Mobile App", "Referral", "Website"],
}
