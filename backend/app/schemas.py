from typing import Any

from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PolicyholderCreate(BaseModel):
    first_name: str
    last_name: str
    customer_email: str
    age: int
    gender: str
    marital_status: str
    employment_status: str
    region: str
    monthly_income_usd: float
    dependents_count: int
    plan_type: str
    payment_frequency: str
    acquisition_channel: str
    monthly_premium_usd: float
    tenure_months: int | None = None
    payment_delay_days_avg: int | None = None
    missed_payments_last_12m: int | None = None
    late_payments_last_12m: int | None = None
    customer_service_calls_last_6m: int | None = None
    complaints_last_12m: int | None = None
    policy_changes_last_12m: int | None = None
    claims_last_24m: int | None = None
    mobile_app_usage_score: int | None = None
    sms_engagement_rate: float | None = None
    retention_offer_received: int | None = None
    policyholder_id: str | None = None
    policy_number: str | None = None
    actual_churn_label: int | None = None


class PolicyholderUpdate(BaseModel):
    first_name: str
    last_name: str
    customer_email: str
    age: int
    gender: str
    marital_status: str
    employment_status: str
    region: str
    monthly_income_usd: float
    dependents_count: int
    plan_type: str
    payment_frequency: str
    acquisition_channel: str
    monthly_premium_usd: float
    tenure_months: int | None = None
    payment_delay_days_avg: int | None = None
    missed_payments_last_12m: int | None = None
    late_payments_last_12m: int | None = None
    customer_service_calls_last_6m: int | None = None
    complaints_last_12m: int | None = None
    policy_changes_last_12m: int | None = None
    claims_last_24m: int | None = None
    mobile_app_usage_score: int | None = None
    sms_engagement_rate: float | None = None
    retention_offer_received: int | None = None
    policy_number: str | None = None
    actual_churn_label: int | None = None


class PredictionInput(BaseModel):
    age: int
    gender: str
    marital_status: str
    employment_status: str
    region: str
    monthly_income_usd: float
    dependents_count: int
    plan_type: str
    payment_frequency: str
    acquisition_channel: str
    tenure_months: int
    monthly_premium_usd: float
    payment_delay_days_avg: int
    missed_payments_last_12m: int
    late_payments_last_12m: int
    customer_service_calls_last_6m: int
    complaints_last_12m: int
    policy_changes_last_12m: int
    claims_last_24m: int
    mobile_app_usage_score: int
    sms_engagement_rate: float
    retention_offer_received: int
    policyholder_id: str | None = None
    policy_number: str | None = None


class PolicyholderOut(BaseModel):
    id: int
    policyholder_id: str
    policy_number: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    customer_email: str | None = None
    age: int
    policy_age_group: str
    gender: str
    marital_status: str
    employment_status: str
    region: str
    monthly_income_usd: float
    dependents_count: int
    plan_type: str
    payment_frequency: str
    acquisition_channel: str
    tenure_months: int
    monthly_premium_usd: float
    billing_amount_usd: float
    premium_to_income_ratio: float
    payment_delay_days_avg: int
    missed_payments_last_12m: int
    late_payments_last_12m: int
    customer_service_calls_last_6m: int
    complaints_last_12m: int
    policy_changes_last_12m: int
    claims_last_24m: int
    mobile_app_usage_score: int
    sms_engagement_rate: float
    retention_offer_received: int
    actual_churn_label: int | None = None
    last_churn_probability: float | None = None
    last_prediction_label: str | None = None
    last_risk_band: str | None = None
    last_risk_factors: list[dict[str, Any]] = Field(default_factory=list)
    all_considered_factors: list[dict[str, Any]] = Field(default_factory=list)
    last_retention_action: str | None = None
    last_prediction_at: str | None = None
    created_at: str
    updated_at: str


class PredictionResponse(BaseModel):
    predicted_class: str
    churn_probability: float
    risk_band: str
    risk_badge_color: str
    suggested_retention_action: str
    model_threshold: float | None = None
    top_risk_factors: list[dict[str, Any]] = Field(default_factory=list)
    all_considered_factors: list[dict[str, Any]] = Field(default_factory=list)


class PaginatedPolicyholders(BaseModel):
    items: list[PolicyholderOut]
    total: int
    page: int
    page_size: int


class DashboardMetrics(BaseModel):
    total_policyholders: int
    active_policies: int
    high_risk_customers: int
    retention_rate: float
    average_churn_probability: float
    pending_claims: int
    premium_revenue: float
    new_this_month: int
    claims_processed: int
    matured_policies: int
    region_breakdown: list[dict[str, Any]]
    plan_breakdown: list[dict[str, Any]]
    recent_predictions: list[dict[str, Any]]


class ReferenceDataResponse(BaseModel):
    data: dict[str, list[str]]


class PolicyNumberLookupRequest(BaseModel):
    policy_number: str
