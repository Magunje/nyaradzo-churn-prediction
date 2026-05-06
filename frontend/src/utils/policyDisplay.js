const FIRST_NAMES = [
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
];

const LAST_NAMES = [
  "Chakuringama",
  "Chibanda",
  "Moyo",
  "Ndlovu",
  "Nyathi",
  "Sibanda",
  "Muchengeti",
  "Muzanenhamo",
  "Mhlanga",
  "Maregere",
  "Chirume",
  "Marufu",
];

const LOCATION_MAP = {
  Harare: "Harare",
  Bulawayo: "Bulawayo",
  Manicaland: "Mutare",
  "Mashonaland East": "Marondera",
  "Mashonaland West": "Chinhoyi",
  Masvingo: "Masvingo",
  "Matabeleland North": "Victoria Falls",
  "Matabeleland South": "Gwanda",
  Midlands: "Gweru",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function serialFromRecord(record) {
  const raw = String(record.policyholder_id || record.id || "").replace(/\D/g, "");
  if (raw) {
    return Number(raw.slice(-6));
  }
  return Number(record.id || 0);
}

function deriveSatisfaction(record) {
  const rawScore =
    Math.round(record.mobile_app_usage_score / 12) +
    (record.retention_offer_received ? 1 : 0) -
    record.complaints_last_12m -
    Math.round(record.payment_delay_days_avg / 18) -
    record.missed_payments_last_12m;
  const score = Math.max(0, Math.min(10, rawScore));
  return {
    score,
    stars: Math.max(0, Math.min(3, Math.round(score / 3))),
  };
}

export function buildPolicyDisplayRecord(record) {
  const serial = serialFromRecord(record);
  const fallbackName = `${FIRST_NAMES[serial % FIRST_NAMES.length]} ${LAST_NAMES[(serial * 7) % LAST_NAMES.length]}`;
  const actualName = [record.first_name, record.last_name].filter(Boolean).join(" ").trim();
  const name = actualName || fallbackName;
  const satisfaction = deriveSatisfaction(record);

  return {
    ...record,
    customerId: `NYC-${String(serial).padStart(6, "0")}`,
    customerName: name,
    location: LOCATION_MAP[record.region] || record.region,
    policyNumber: record.policy_number || `POL-${String(serial).padStart(7, "0")}`,
    policyType: record.plan_type === "Family" ? "Family Policy" : "Individual Policy",
    premiumLabel: formatCurrency(record.monthly_premium_usd),
    tenureLabel: `${Math.floor((record.tenure_months || 0) / 12)} yrs`,
    ageLabel: `${record.age} yrs`,
    satisfactionScore: satisfaction.score,
    starCount: satisfaction.stars,
  };
}

export function filterPolicyDisplayRecords(records, { search, location }) {
  const normalizedSearch = search.trim().toLowerCase();

  return records.filter((record) => {
    const matchesSearch =
      !normalizedSearch ||
      [record.customerId, record.customerName, record.policyNumber, record.location, record.policyType]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);

    const matchesLocation = !location || record.location === location;
    return matchesSearch && matchesLocation;
  });
}
