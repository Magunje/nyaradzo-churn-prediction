from __future__ import annotations

import json
from functools import lru_cache
from threading import RLock

from ..config import DATASET_PATH, MODEL_METADATA_PATH, MODEL_PATH, PREFERRED_DEPLOYED_MODEL
from .insights import (
    build_risk_factors,
    classify_risk,
    predicted_class_from_threshold,
    suggest_retention_action,
    top_risk_factors_from_all,
)


FEATURE_COLUMNS = [
    "age",
    "policy_age_group",
    "gender",
    "marital_status",
    "employment_status",
    "region",
    "monthly_income_usd",
    "dependents_count",
    "plan_type",
    "payment_frequency",
    "acquisition_channel",
    "tenure_months",
    "monthly_premium_usd",
    "billing_amount_usd",
    "premium_to_income_ratio",
    "payment_delay_days_avg",
    "missed_payments_last_12m",
    "late_payments_last_12m",
    "customer_service_calls_last_6m",
    "complaints_last_12m",
    "policy_changes_last_12m",
    "claims_last_24m",
    "mobile_app_usage_score",
    "sms_engagement_rate",
    "retention_offer_received",
]

_MODEL_LOAD_LOCK = RLock()

_WARMUP_RECORD = {
    "age": 42,
    "policy_age_group": "36-45",
    "gender": "Female",
    "marital_status": "Married",
    "employment_status": "Formally Employed",
    "region": "Harare",
    "monthly_income_usd": 650.0,
    "dependents_count": 3,
    "plan_type": "Family",
    "payment_frequency": "Monthly",
    "acquisition_channel": "Agent",
    "tenure_months": 36,
    "monthly_premium_usd": 28.0,
    "billing_amount_usd": 28.0,
    "premium_to_income_ratio": 0.0431,
    "payment_delay_days_avg": 2,
    "missed_payments_last_12m": 0,
    "late_payments_last_12m": 1,
    "customer_service_calls_last_6m": 1,
    "complaints_last_12m": 0,
    "policy_changes_last_12m": 0,
    "claims_last_24m": 0,
    "mobile_app_usage_score": 68,
    "sms_engagement_rate": 0.72,
    "retention_offer_received": 0,
}


def _build_preprocessor(X: pd.DataFrame) -> ColumnTransformer:
    from sklearn.compose import ColumnTransformer
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder, StandardScaler

    categorical_cols = X.select_dtypes(include=["object"]).columns.tolist()
    numeric_cols = X.select_dtypes(exclude=["object"]).columns.tolist()

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_cols),
            ("cat", categorical_transformer, categorical_cols),
        ]
    )


def _extract_feature_importances(model_pipeline: Pipeline) -> list[dict]:
    preprocessor = model_pipeline.named_steps["preprocessor"]
    model = model_pipeline.named_steps["model"]
    feature_names = preprocessor.get_feature_names_out()
    if hasattr(model, "feature_importances_"):
        scores = model.feature_importances_
    elif hasattr(model, "coef_"):
        scores = abs(model.coef_[0])
    else:
        return []
    ranked = sorted(zip(feature_names, scores, strict=False), key=lambda item: item[1], reverse=True)
    return [{"feature": name, "importance": round(float(score), 6)} for name, score in ranked[:20]]


def _optimal_threshold(y_true, probabilities: np.ndarray) -> tuple[float, dict]:
    import numpy as np
    from sklearn.metrics import f1_score, precision_score, recall_score

    best_threshold = 0.5
    best_metrics = {"f1_score": -1.0, "precision": 0.0, "recall": 0.0}

    for threshold in np.arange(0.1, 0.91, 0.01):
        predictions = (probabilities >= threshold).astype(int)
        f1_value = f1_score(y_true, predictions, zero_division=0)
        if f1_value > best_metrics["f1_score"]:
            best_threshold = float(round(threshold, 2))
            best_metrics = {
                "f1_score": round(float(f1_value), 4),
                "precision": round(float(precision_score(y_true, predictions, zero_division=0)), 4),
                "recall": round(float(recall_score(y_true, predictions, zero_division=0)), 4),
            }

    return best_threshold, best_metrics


def train_and_save_model(dataset_path=DATASET_PATH) -> dict:
    import joblib
    import pandas as pd
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import (
        accuracy_score,
        average_precision_score,
        f1_score,
        precision_score,
        recall_score,
        roc_auc_score,
    )
    from sklearn.model_selection import train_test_split
    from sklearn.pipeline import Pipeline
    from sklearn.utils.class_weight import compute_sample_weight

    df = pd.read_csv(dataset_path)
    X = df[FEATURE_COLUMNS].copy()
    y = df["churn"].astype(int)

    X_temp, X_test, y_temp, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )
    X_train, X_valid, y_train, y_valid = train_test_split(
        X_temp,
        y_temp,
        test_size=0.25,
        random_state=42,
        stratify=y_temp,
    )

    candidates = {
        "Logistic Regression": {
            "model": LogisticRegression(max_iter=2500, class_weight="balanced"),
            "fit_kwargs": {},
        },
        "Random Forest": {
            "model": RandomForestClassifier(
                n_estimators=400,
                random_state=42,
                class_weight="balanced_subsample",
                min_samples_leaf=2,
            ),
            "fit_kwargs": {},
        },
        "Gradient Boosting": {
            "model": GradientBoostingClassifier(
                random_state=42,
                n_estimators=250,
                learning_rate=0.05,
                max_depth=3,
                subsample=0.95,
            ),
            "fit_kwargs": {
                "model__sample_weight": compute_sample_weight(class_weight="balanced", y=y_train),
            },
        },
    }

    results: list[dict] = []

    for name, candidate in candidates.items():
        pipeline = Pipeline(
            steps=[
                ("preprocessor", _build_preprocessor(X)),
                ("model", candidate["model"]),
            ]
        )
        pipeline.fit(X_train, y_train, **candidate["fit_kwargs"])

        valid_probabilities = pipeline.predict_proba(X_valid)[:, 1]
        threshold, threshold_metrics = _optimal_threshold(y_valid, valid_probabilities)

        test_probabilities = pipeline.predict_proba(X_test)[:, 1]
        test_predictions = (test_probabilities >= threshold).astype(int)

        results.append(
            {
                "model_name": name,
                "roc_auc": round(float(roc_auc_score(y_test, test_probabilities)), 4),
                "pr_auc": round(float(average_precision_score(y_test, test_probabilities)), 4),
                "accuracy": round(float(accuracy_score(y_test, test_predictions)), 4),
                "precision": round(float(precision_score(y_test, test_predictions, zero_division=0)), 4),
                "recall": round(float(recall_score(y_test, test_predictions, zero_division=0)), 4),
                "f1_score": round(float(f1_score(y_test, test_predictions, zero_division=0)), 4),
                "optimal_threshold": threshold,
                "validation_threshold_metrics": threshold_metrics,
            }
        )

    def rank_key(item: dict) -> tuple[float, float, float]:
        return (item["roc_auc"], item["pr_auc"], item["f1_score"])

    best_metrics = sorted(results, key=rank_key, reverse=True)[0]
    best_name = best_metrics["model_name"]

    deployed_metrics = next(
        (item for item in results if item["model_name"] == PREFERRED_DEPLOYED_MODEL),
        best_metrics,
    )
    deployed_name = deployed_metrics["model_name"]
    deployed_threshold = deployed_metrics["optimal_threshold"]
    deployed_candidate = candidates[deployed_name]

    final_pipeline = Pipeline(
        steps=[
            ("preprocessor", _build_preprocessor(X)),
            ("model", deployed_candidate["model"]),
        ]
    )
    final_fit_kwargs = {}
    if deployed_name == "Gradient Boosting":
        final_fit_kwargs["model__sample_weight"] = compute_sample_weight(class_weight="balanced", y=y)
    final_pipeline.fit(X, y, **final_fit_kwargs)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(final_pipeline, MODEL_PATH)

    metadata = {
        "dataset_path": str(dataset_path),
        "trained_at": pd.Timestamp.utcnow().isoformat(),
        "selected_model": deployed_name,
        "best_evaluated_model": best_name,
        "prediction_threshold": deployed_threshold,
        "evaluation": results,
        "feature_columns": FEATURE_COLUMNS,
        "top_feature_importances": _extract_feature_importances(final_pipeline),
        "notes": [
            "Gradient Boosting remains part of the model evaluation set as requested.",
            "The selected model uses an optimized churn classification threshold derived from validation data.",
            f"Deployed model preference is set to {deployed_name}.",
        ],
    }
    MODEL_METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    clear_model_cache()
    load_metadata.cache_clear()
    return metadata


def ensure_model_artifact() -> dict:
    if not MODEL_PATH.exists() or not MODEL_METADATA_PATH.exists():
        return train_and_save_model()
    return _read_metadata()


@lru_cache(maxsize=1)
def _load_model_from_disk():
    import joblib

    ensure_model_artifact()
    return joblib.load(MODEL_PATH)


def clear_model_cache() -> None:
    with _MODEL_LOAD_LOCK:
        _load_model_from_disk.cache_clear()


def load_model():
    with _MODEL_LOAD_LOCK:
        return _load_model_from_disk()


def _read_metadata() -> dict:
    return json.loads(MODEL_METADATA_PATH.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_metadata() -> dict:
    if not MODEL_PATH.exists() or not MODEL_METADATA_PATH.exists():
        return train_and_save_model()
    return _read_metadata()


def _prepare_dataframe(records: list[dict]) -> pd.DataFrame:
    import pandas as pd

    frame = pd.DataFrame(records)
    return frame[FEATURE_COLUMNS].copy()


def warm_model() -> dict:
    metadata = load_metadata()
    model = load_model()
    frame = _prepare_dataframe([_WARMUP_RECORD])
    model.predict_proba(frame)
    return metadata


def predict_records(records: list[dict]) -> list[dict]:
    model = load_model()
    metadata = load_metadata()
    threshold = float(metadata.get("prediction_threshold", 0.5))
    frame = _prepare_dataframe(records)
    probabilities = model.predict_proba(frame)[:, 1]

    outputs: list[dict] = []
    for record, probability in zip(records, probabilities, strict=False):
        all_factors = build_risk_factors(record, float(probability))
        top_risk_factors = top_risk_factors_from_all(all_factors)
        risk_band, risk_color = classify_risk(float(probability), threshold, all_factors)
        outputs.append(
            {
                "predicted_class": predicted_class_from_threshold(float(probability), threshold),
                "churn_probability": round(float(probability), 4),
                "risk_band": risk_band,
                "risk_badge_color": risk_color,
                "suggested_retention_action": suggest_retention_action(
                    risk_band,
                    top_risk_factors,
                    float(probability),
                    threshold,
                ),
                "top_risk_factors": top_risk_factors,
                "all_considered_factors": all_factors,
                "model_threshold": round(threshold, 4),
            }
        )
    return outputs
