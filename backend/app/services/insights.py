from ..config import HIGH_RISK_THRESHOLD, MEDIUM_RISK_THRESHOLD


PAYMENT_MULTIPLIERS = {
    "Monthly": 1.0,
    "Quarterly": 2.8,
    "Biannual": 5.4,
    "Annual": 10.0,
}

DEFAULT_POLICY_SIGNALS = {
    "tenure_months": 0,
    "payment_delay_days_avg": 0,
    "missed_payments_last_12m": 0,
    "late_payments_last_12m": 0,
    "customer_service_calls_last_6m": 0,
    "complaints_last_12m": 0,
    "policy_changes_last_12m": 0,
    "claims_last_24m": 0,
    "mobile_app_usage_score": 50,
    "sms_engagement_rate": 0.5,
    "retention_offer_received": 0,
}


def age_to_group(age: int) -> str:
    if age <= 25:
        return "18-25"
    if age <= 35:
        return "26-35"
    if age <= 45:
        return "36-45"
    if age <= 60:
        return "46-60"
    return "60+"


def policy_number_from_policyholder_id(policyholder_id: str) -> str:
    digits = "".join(character for character in str(policyholder_id) if character.isdigit())
    serial = int(digits) if digits else 0
    return f"POL-{serial:07d}"


def derive_feature_columns(payload: dict) -> dict:
    enriched = {**DEFAULT_POLICY_SIGNALS, **dict(payload)}
    enriched["policy_age_group"] = age_to_group(int(enriched["age"]))
    income = max(float(enriched["monthly_income_usd"]), 1.0)
    premium = float(enriched["monthly_premium_usd"])
    multiplier = PAYMENT_MULTIPLIERS.get(enriched["payment_frequency"], 1.0)
    enriched["billing_amount_usd"] = round(premium * multiplier, 2)
    enriched["premium_to_income_ratio"] = round(premium / income, 4)
    enriched["retention_offer_received"] = int(enriched["retention_offer_received"])
    if enriched.get("policyholder_id") and not enriched.get("policy_number"):
        enriched["policy_number"] = policy_number_from_policyholder_id(enriched["policyholder_id"])
    return enriched


def classify_risk(probability: float, threshold: float | None = None, factors: list[dict] | None = None) -> tuple[str, str]:
    medium_threshold = float(threshold or MEDIUM_RISK_THRESHOLD)
    high_threshold = min(0.9, max(HIGH_RISK_THRESHOLD, medium_threshold + 0.12, medium_threshold * 1.75))

    if probability >= high_threshold:
        risk_band = "High"
    elif probability >= medium_threshold:
        risk_band = "Medium"
    else:
        risk_band = "Low"

    triggered_factors = [factor for factor in (factors or []) if factor.get("triggered")]
    high_count = sum(1 for factor in triggered_factors if factor.get("impact") == "High")
    medium_count = sum(1 for factor in triggered_factors if factor.get("impact") == "Medium")

    if probability >= medium_threshold:
        if high_count >= 3:
            risk_band = "High"
        elif high_count >= 1 or medium_count >= 2:
            risk_band = "Medium"

    color_map = {
        "Low": "bg-emerald-500",
        "Medium": "bg-amber-500",
        "High": "bg-rose-500",
    }
    return risk_band, color_map[risk_band]


def predicted_class_from_threshold(probability: float, threshold: float) -> str:
    return "Likely to Churn" if probability >= threshold else "Retained"


def build_risk_factors(features: dict, probability: float) -> list[dict]:
    factors: list[dict] = []

    def add(
        *,
        label: str,
        value,
        threshold,
        triggered: bool,
        impact: str,
        detail: str,
        score: int,
        category: str,
    ) -> None:
        factors.append(
            {
                "factor": label,
                "value": value,
                "threshold": threshold,
                "triggered": triggered,
                "impact": impact,
                "detail": detail,
                "score": score,
                "category": category,
            }
        )

    add(
        label="Payment delays",
        value=features["payment_delay_days_avg"],
        threshold=">= 15 days",
        triggered=features["payment_delay_days_avg"] >= 15,
        impact="High",
        detail="Average payment delay is above 15 days.",
        score=95,
        category="Payment Behaviour",
    )
    add(
        label="Missed payments",
        value=features["missed_payments_last_12m"],
        threshold=">= 3",
        triggered=features["missed_payments_last_12m"] >= 3,
        impact="High",
        detail="The policyholder missed 3 or more payments in the last year.",
        score=92,
        category="Payment Behaviour",
    )
    add(
        label="Late payment pattern",
        value=features["late_payments_last_12m"],
        threshold=">= 4",
        triggered=features["late_payments_last_12m"] >= 4,
        impact="Medium",
        detail="Late payment frequency is above the portfolio comfort level.",
        score=84,
        category="Payment Behaviour",
    )
    add(
        label="Service contacts",
        value=features["customer_service_calls_last_6m"],
        threshold=">= 3",
        triggered=features["customer_service_calls_last_6m"] >= 3,
        impact="Medium",
        detail="Frequent service calls may signal friction or dissatisfaction.",
        score=74,
        category="Customer Experience",
    )
    add(
        label="Complaint history",
        value=features["complaints_last_12m"],
        threshold=">= 1",
        triggered=features["complaints_last_12m"] >= 1,
        impact="High",
        detail="One or more complaints were logged in the last year.",
        score=88,
        category="Customer Experience",
    )
    add(
        label="Policy changes",
        value=features["policy_changes_last_12m"],
        threshold=">= 2",
        triggered=features["policy_changes_last_12m"] >= 2,
        impact="Low",
        detail="Multiple recent policy changes can indicate uncertainty or affordability pressure.",
        score=61,
        category="Policy Activity",
    )
    add(
        label="Claims activity",
        value=features["claims_last_24m"],
        threshold=">= 2",
        triggered=features["claims_last_24m"] >= 2,
        impact="Low",
        detail="Higher claims activity may increase service and pricing sensitivity.",
        score=58,
        category="Claims",
    )
    add(
        label="Low digital engagement",
        value=features["mobile_app_usage_score"],
        threshold="<= 35",
        triggered=features["mobile_app_usage_score"] <= 35,
        impact="Medium",
        detail="App usage is weak, reducing touchpoints for retention campaigns.",
        score=72,
        category="Engagement",
    )
    add(
        label="Low SMS engagement",
        value=features["sms_engagement_rate"],
        threshold="<= 0.35",
        triggered=features["sms_engagement_rate"] <= 0.35,
        impact="Medium",
        detail="SMS engagement is below 35%, limiting campaign response.",
        score=69,
        category="Engagement",
    )
    add(
        label="Early-life policy",
        value=features["tenure_months"],
        threshold="<= 12 months",
        triggered=features["tenure_months"] <= 12,
        impact="Medium",
        detail="Newer policyholders typically need extra onboarding and care.",
        score=66,
        category="Lifecycle",
    )
    add(
        label="Affordability pressure",
        value=features["premium_to_income_ratio"],
        threshold=">= 0.08",
        triggered=features["premium_to_income_ratio"] >= 0.08,
        impact="High",
        detail="Premium burden is high relative to monthly income.",
        score=90,
        category="Affordability",
    )
    add(
        label="Retention offer coverage",
        value=features["retention_offer_received"],
        threshold="0 when risk >= medium",
        triggered=features["retention_offer_received"] == 0 and probability >= MEDIUM_RISK_THRESHOLD,
        impact="Low",
        detail="A proactive retention offer has not been recorded.",
        score=55,
        category="Retention",
    )

    return factors


def top_risk_factors_from_all(all_factors: list[dict]) -> list[dict]:
    triggered = [factor for factor in all_factors if factor["triggered"]]
    ranked = sorted(triggered, key=lambda item: item["score"], reverse=True)
    if ranked:
        return ranked[:5]

    stable_signals = [
        {
            "factor": "Healthy relationship signals",
            "value": "Stable",
            "threshold": "N/A",
            "triggered": False,
            "impact": "Low",
            "detail": "Payments, engagement, and service indicators look stable.",
            "score": 40,
            "category": "Summary",
        }
    ]
    return stable_signals


def suggest_retention_action(risk_band: str, factors: list[dict], probability: float | None = None, threshold: float | None = None) -> str:
    factor_labels = {factor["factor"] for factor in factors}
    if risk_band == "High":
        if "Affordability pressure" in factor_labels:
            return "Offer a premium review, payment plan counseling, and a same-week retention call."
        if "Complaint history" in factor_labels:
            return "Escalate to a service recovery agent and resolve open complaints before the next billing cycle."
        return "Assign an agent follow-up within 48 hours and bundle payment reminders with a retention offer."
    if risk_band == "Medium":
        if "Low SMS engagement" in factor_labels or "Low digital engagement" in factor_labels:
            return "Shift outreach to agent or branch follow-up and refresh the digital onboarding journey."
        return "Queue the customer for a targeted reminder campaign and monitor behavior over the next 30 days."
    if probability is not None and threshold is not None and probability >= threshold:
        return "Schedule a preventive retention review and monitor the policyholder closely over the next billing cycle."
    return "Maintain normal servicing with loyalty messaging and periodic check-ins."
