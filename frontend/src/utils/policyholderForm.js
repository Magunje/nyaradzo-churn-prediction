const numberFields = [
  "age",
  "monthly_income_usd",
  "dependents_count",
  "tenure_months",
  "monthly_premium_usd",
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
];

export const fieldSections = [
  {
    title: "Customer Snapshot",
    description: "Core profile inputs used alongside the policy history to estimate churn risk.",
    fields: [
      { name: "age", label: "Age", type: "number", min: 18, max: 90, step: 1 },
      { name: "gender", label: "Gender", type: "select", optionsKey: "genders" },
      { name: "marital_status", label: "Marital Status", type: "select", optionsKey: "marital_statuses" },
      { name: "employment_status", label: "Employment Status", type: "select", optionsKey: "employment_statuses" },
      { name: "region", label: "Region", type: "select", optionsKey: "regions" },
      { name: "monthly_income_usd", label: "Monthly Income (USD)", type: "number", min: 0, step: 0.01 },
      { name: "dependents_count", label: "Dependents Count", type: "number", min: 0, step: 1 },
    ],
  },
  {
    title: "Policy and Payment Signals",
    description: "Add the policy information and payment behavior you want the model to use for the churn calculation.",
    fields: [
      { name: "plan_type", label: "Plan Type", type: "select", optionsKey: "plan_types" },
      { name: "payment_frequency", label: "Payment Frequency", type: "select", optionsKey: "payment_frequencies" },
      { name: "acquisition_channel", label: "Acquisition Channel", type: "select", optionsKey: "acquisition_channels" },
      { name: "tenure_months", label: "Tenure (Months)", type: "number", min: 0, step: 1 },
      { name: "monthly_premium_usd", label: "Monthly Premium (USD)", type: "number", min: 0, step: 0.01 },
      { name: "payment_delay_days_avg", label: "Avg Payment Delay (Days)", type: "number", min: 0, step: 1 },
      { name: "missed_payments_last_12m", label: "Missed Payments Last 12 Months", type: "number", min: 0, step: 1 },
      { name: "late_payments_last_12m", label: "Late Payments Last 12 Months", type: "number", min: 0, step: 1 },
      {
        name: "retention_offer_received",
        label: "Retention Offer Received",
        type: "select",
        options: [
          { value: "1", label: "Yes" },
          { value: "0", label: "No" },
        ],
      },
    ],
  },
  {
    title: "Service and Engagement Signals",
    description: "Use these values when you want the prediction to account for service friction or customer engagement.",
    fields: [
      { name: "customer_service_calls_last_6m", label: "Customer Service Calls Last 6 Months", type: "number", min: 0, step: 1 },
      { name: "complaints_last_12m", label: "Complaints Last 12 Months", type: "number", min: 0, step: 1 },
      { name: "policy_changes_last_12m", label: "Policy Changes Last 12 Months", type: "number", min: 0, step: 1 },
      { name: "claims_last_24m", label: "Claims Last 24 Months", type: "number", min: 0, step: 1 },
      { name: "mobile_app_usage_score", label: "Mobile App Usage Score", type: "number", min: 0, max: 100, step: 1 },
      { name: "sms_engagement_rate", label: "SMS Engagement Rate", type: "number", min: 0, max: 1, step: 0.001 },
    ],
  },
];

export function createEmptyPolicyholder() {
  return {
    age: "",
    gender: "",
    marital_status: "",
    employment_status: "",
    region: "",
    monthly_income_usd: "",
    dependents_count: "",
    plan_type: "",
    payment_frequency: "",
    acquisition_channel: "",
    tenure_months: "0",
    monthly_premium_usd: "",
    payment_delay_days_avg: "0",
    missed_payments_last_12m: "0",
    late_payments_last_12m: "0",
    customer_service_calls_last_6m: "0",
    complaints_last_12m: "0",
    policy_changes_last_12m: "0",
    claims_last_24m: "0",
    mobile_app_usage_score: "50",
    sms_engagement_rate: "0.5",
    retention_offer_received: "0",
  };
}

function derivePreviewValues(payload) {
  const premium = Number(payload.monthly_premium_usd || 0);
  const income = Math.max(Number(payload.monthly_income_usd || 0), 1);
  const paymentFrequency = payload.payment_frequency;
  const multipliers = {
    Monthly: 1,
    Quarterly: 2.8,
    Biannual: 5.4,
    Annual: 10,
  };

  return {
    billing_amount_usd: premium * (multipliers[paymentFrequency] || 1),
    premium_to_income_ratio: premium / income,
  };
}

export function normalizeFormPayload(formData, { allowPartial = false } = {}) {
  const payload = {};

  Object.entries(formData).forEach(([key, value]) => {
    payload[key] = numberFields.includes(key) ? Number(value) : value;
  });

  if (allowPartial) {
    return { ...payload, ...derivePreviewValues(payload) };
  }

  return { ...payload, ...derivePreviewValues(payload) };
}

export function toFormValues(record) {
  const values = createEmptyPolicyholder();
  Object.keys(values).forEach((key) => {
    values[key] = String(record[key] ?? values[key]);
  });
  return values;
}
