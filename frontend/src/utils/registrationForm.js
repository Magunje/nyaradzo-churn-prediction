const numberFields = [
  "age",
  "monthly_income_usd",
  "dependents_count",
  "monthly_premium_usd",
];

export const registrationSections = [
  {
    title: "Policyholder Details",
    description: "Basic onboarding information for a brand-new policyholder.",
    fields: [
      { name: "first_name", label: "First Name", type: "text" },
      { name: "last_name", label: "Surname", type: "text" },
      { name: "customer_email", label: "Customer Email", type: "email" },
      { name: "age", label: "Age", type: "number", min: 18, max: 90, step: 1 },
      { name: "gender", label: "Gender", type: "select", optionsKey: "genders" },
      { name: "marital_status", label: "Marital Status", type: "select", optionsKey: "marital_statuses" },
      { name: "employment_status", label: "Employment Status", type: "select", optionsKey: "employment_statuses" },
      { name: "region", label: "Region", type: "select", optionsKey: "regions" },
    ],
  },
  {
    title: "Policy Setup",
    description: "The initial policy values available at registration time.",
    fields: [
      { name: "monthly_income_usd", label: "Monthly Income (USD)", type: "number", min: 0, step: 0.01 },
      { name: "dependents_count", label: "Dependents Count", type: "number", min: 0, step: 1 },
      { name: "plan_type", label: "Plan Type", type: "select", optionsKey: "plan_types" },
      { name: "payment_frequency", label: "Payment Frequency", type: "select", optionsKey: "payment_frequencies" },
      { name: "acquisition_channel", label: "Acquisition Channel", type: "select", optionsKey: "acquisition_channels" },
      { name: "monthly_premium_usd", label: "Monthly Premium (USD)", type: "number", min: 0, step: 0.01 },
    ],
  },
];

export function createEmptyRegistration() {
  return {
    first_name: "",
    last_name: "",
    customer_email: "",
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
    monthly_premium_usd: "",
  };
}

export function normalizeRegistrationPayload(formData) {
  const payload = {};
  Object.entries(formData).forEach(([key, value]) => {
    payload[key] = numberFields.includes(key) ? Number(value) : String(value).trim();
  });
  return payload;
}

export function toRegistrationValues(record) {
  const values = createEmptyRegistration();
  Object.keys(values).forEach((key) => {
    values[key] = String(record[key] ?? values[key]);
  });
  return values;
}
