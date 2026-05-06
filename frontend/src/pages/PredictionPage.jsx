import { ArrowLeft, Download, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import PolicyholderFields from "../components/PolicyholderFields";
import StatusBadge from "../components/StatusBadge";
import { formatPercent } from "../utils/format";
import { createEmptyPolicyholder, normalizeFormPayload, toFormValues } from "../utils/policyholderForm";

function TopFactorsPanel({ prediction }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-900">
        <Sparkles size={16} />
        <p className="text-sm font-semibold">Top risk factors</p>
      </div>
      <div className="mt-4 space-y-3">
        {prediction.top_risk_factors.map((factor) => (
          <div key={factor.factor} className="rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">{factor.factor}</p>
              <StatusBadge value={factor.impact} />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">{factor.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllFactorsTable({ prediction }) {
  return (
    <section className="table-card p-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">All Considered Factors</p>
        <h3 className="mt-2 font-display text-2xl text-slate-900">Full explanation trail</h3>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="pb-3">Factor</th>
              <th className="pb-3">Value</th>
              <th className="pb-3">Threshold</th>
              <th className="pb-3">Category</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {prediction.all_considered_factors.map((factor) => (
              <tr key={factor.factor}>
                <td className="py-4 font-semibold text-slate-900">{factor.factor}</td>
                <td className="py-4">{String(factor.value)}</td>
                <td className="py-4">{factor.threshold}</td>
                <td className="py-4">{factor.category}</td>
                <td className="py-4">
                  <StatusBadge value={factor.triggered ? factor.impact : "Observed"} />
                </td>
                <td className="py-4">{factor.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SelectedPolicyPanel({ policyholder }) {
  if (!policyholder) {
    return (
      <section className="table-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Selected Policyholder</p>
        <h3 className="mt-2 font-display text-2xl text-slate-900">No policyholder loaded yet</h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Use a policy number to load a saved policyholder from the database. Churn prediction now runs from the registered
          record, so this page stays separate from policy registration.
        </p>
      </section>
    );
  }

  const summaryCards = [
    ["Policy Number", policyholder.policy_number],
    ["Customer Email", policyholder.customer_email],
    ["Region", policyholder.region],
    ["Plan Type", policyholder.plan_type],
    ["Tenure", `${policyholder.tenure_months} months`],
    ["Monthly Premium", `$${Number(policyholder.monthly_premium_usd || 0).toFixed(2)}`],
    ["Payment Frequency", policyholder.payment_frequency],
    ["Missed Payments (12m)", policyholder.missed_payments_last_12m],
  ];

  return (
    <section className="table-card p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Selected Policyholder</p>
        <h3 className="mt-2 font-display text-2xl text-slate-900">
          {[policyholder.first_name, policyholder.last_name].filter(Boolean).join(" ") || policyholder.policyholder_id}
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Review the registered policy details here before generating or exporting the latest churn result.
        </p>
        </div>
        <StatusBadge value={policyholder.last_risk_band || "Not Yet Scored"} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</div>
            <div className="mt-2 font-semibold text-slate-900">{value || "Not available"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultPanel({ prediction, selectedPolicyholder, onDownloadPdf, actionState }) {
  if (!prediction) {
    return null;
  }

  return (
    <div className="space-y-4">
      <section className="table-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Prediction Result</p>
            <h3 className="mt-2 font-display text-3xl text-slate-900">{prediction.predicted_class}</h3>
            <p className="mt-2 text-sm text-slate-500">
              Churn probability: {formatPercent(prediction.churn_probability)} | Model threshold: {formatPercent(prediction.model_threshold || 0)}
            </p>
          </div>
          <StatusBadge value={prediction.risk_band} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Suggested retention action</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{prediction.suggested_retention_action}</p>

            {selectedPolicyholder?.policy_number ? (
              <div className="mt-6 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={onDownloadPdf} className="action-secondary" disabled={actionState.downloadingPdf}>
                    <Download size={16} />
                    {actionState.downloadingPdf ? "Preparing..." : "Export to PDF"}
                  </button>
                </div>
                {actionState.message ? (
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionState.message}</div>
                ) : null}
              </div>
            ) : null}
          </div>
          <TopFactorsPanel prediction={prediction} />
        </div>
      </section>

      <AllFactorsTable prediction={prediction} />
    </div>
  );
}

function predictionFromPolicyholder(record, modelInfo) {
  if (!record?.last_prediction_label) {
    return null;
  }

  return {
    predicted_class: record.last_prediction_label,
    churn_probability: record.last_churn_probability ?? 0,
    risk_band: record.last_risk_band || "Not Yet Scored",
    risk_badge_color: "",
    suggested_retention_action: record.last_retention_action || "",
    model_threshold: modelInfo?.prediction_threshold ?? null,
    top_risk_factors: record.last_risk_factors || [],
    all_considered_factors: record.all_considered_factors || [],
  };
}

export default function PredictionPage({ token, mode }) {
  const { id } = useParams();
  const [referenceData, setReferenceData] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(mode === "record");
  const [submitting, setSubmitting] = useState(false);
  const [lookupNumber, setLookupNumber] = useState("");
  const [selectedPolicyholder, setSelectedPolicyholder] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [formData, setFormData] = useState(createEmptyPolicyholder());
  const [actionState, setActionState] = useState({
    downloadingPdf: false,
    message: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    api.fetchReferenceData(token)
      .then((response) => setReferenceData(response.data))
      .catch((requestError) => setError(requestError.message));
    api.fetchModelInfo(token)
      .then(setModelInfo)
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  useEffect(() => {
    if (mode !== "record" || !id) {
      setLoading(false);
      return;
    }

    api.fetchPolicyholder(token, id)
      .then((record) => {
        setSelectedPolicyholder(record);
        setLookupNumber(record.policy_number || "");
        setFormData(toFormValues(record));
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id, mode, token]);

  const handleLookup = async () => {
    setError("");
    setPrediction(null);
    setActionState((current) => ({ ...current, message: "" }));
    try {
      const record = await api.fetchPolicyholderByPolicyNumber(token, lookupNumber);
      setSelectedPolicyholder(record);
      setFormData(toFormValues(record));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const buildStoredPolicyPayload = (analysisPayload) => ({
    first_name: selectedPolicyholder?.first_name || "Member",
    last_name: selectedPolicyholder?.last_name || "Imported",
    customer_email: (selectedPolicyholder?.customer_email || "").trim(),
    age: analysisPayload.age,
    gender: analysisPayload.gender,
    marital_status: analysisPayload.marital_status,
    employment_status: analysisPayload.employment_status,
    region: analysisPayload.region,
    monthly_income_usd: analysisPayload.monthly_income_usd,
    dependents_count: analysisPayload.dependents_count,
    plan_type: analysisPayload.plan_type,
    payment_frequency: analysisPayload.payment_frequency,
    acquisition_channel: analysisPayload.acquisition_channel,
    monthly_premium_usd: analysisPayload.monthly_premium_usd,
    tenure_months: analysisPayload.tenure_months,
    payment_delay_days_avg: analysisPayload.payment_delay_days_avg,
    missed_payments_last_12m: analysisPayload.missed_payments_last_12m,
    late_payments_last_12m: analysisPayload.late_payments_last_12m,
    customer_service_calls_last_6m: analysisPayload.customer_service_calls_last_6m,
    complaints_last_12m: analysisPayload.complaints_last_12m,
    policy_changes_last_12m: analysisPayload.policy_changes_last_12m,
    claims_last_24m: analysisPayload.claims_last_24m,
    mobile_app_usage_score: analysisPayload.mobile_app_usage_score,
    sms_engagement_rate: analysisPayload.sms_engagement_rate,
    retention_offer_received: analysisPayload.retention_offer_received,
    policy_number: selectedPolicyholder?.policy_number,
    actual_churn_label: selectedPolicyholder?.actual_churn_label ?? null,
  });

  const handlePredict = async () => {
    setSubmitting(true);
    setError("");
    setActionState((current) => ({ ...current, message: "" }));
    try {
      const analysisPayload = normalizeFormPayload(formData);
      if (selectedPolicyholder?.id) {
        const storedPayload = buildStoredPolicyPayload(analysisPayload);
        const updatedRecord = await api.updatePolicyholder(token, selectedPolicyholder.id, storedPayload);
        setSelectedPolicyholder(updatedRecord);
        setLookupNumber(updatedRecord.policy_number || lookupNumber);
        const refreshedPrediction = predictionFromPolicyholder(updatedRecord, modelInfo);
        if (refreshedPrediction) {
          setPrediction(refreshedPrediction);
        } else {
          const result = await api.predictPolicyholder(token, updatedRecord.id);
          setPrediction(result);
        }
      } else {
        const result = await api.predictAdHoc(token, analysisPayload);
        setPrediction(result);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedPolicyholder?.policy_number) {
      return;
    }

    setActionState((current) => ({ ...current, downloadingPdf: true, message: "" }));
    setError("");
    try {
      const blob = await api.downloadPredictionPdfByPolicyNumber(token, selectedPolicyholder.policy_number);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedPolicyholder.policy_number}_churn_report.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      setActionState((current) => ({
        ...current,
        downloadingPdf: false,
        message: "PDF export is ready.",
      }));
    } catch (requestError) {
      setActionState((current) => ({ ...current, downloadingPdf: false, message: "" }));
      setError(requestError.message);
    }
  };

  if (error) {
    return <div className="table-card p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!referenceData || loading) {
    return <LoadingState label="Preparing prediction workspace..." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Churn Prediction"
        title="Predict churn from policy information"
        description="Load a saved policyholder or enter the policy information you want the model to use for churn analysis."
        action={
          mode === "record" ? (
            <Link to="/policyholders" className="action-secondary">
              <ArrowLeft size={16} />
              Back to records
            </Link>
          ) : null
        }
      />

      {modelInfo ? (
        <section className="table-card flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Model currently deployed</p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">{modelInfo.selected_model}</h3>
          </div>
          <p className="text-sm text-slate-500">
            Threshold tuned at {formatPercent(modelInfo.prediction_threshold || 0)}. You can analyze an existing customer or manually enter the policy and service signals you want to test.
          </p>
        </section>
      ) : null}

      <section className="table-card p-6">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="text-sm font-medium text-slate-700">
            Existing policyholder lookup by policy number
            <input
              value={lookupNumber}
              onChange={(event) => setLookupNumber(event.target.value)}
              className="table-input mt-2 w-full"
              placeholder="Enter policy number e.g. POL-0100000"
            />
          </label>
          <div className="flex items-end">
            <button type="button" onClick={handleLookup} className="action-primary">
              <Search size={16} />
              Find Policy
            </button>
          </div>
        </div>
      </section>

      <SelectedPolicyPanel policyholder={selectedPolicyholder} />

      <PolicyholderFields formData={formData} setFormData={setFormData} referenceData={referenceData} />

      <section className="table-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-display text-2xl text-slate-900">Generate churn result</h3>
          <p className="mt-1 text-sm text-slate-500">
            {selectedPolicyholder?.policy_number
              ? `The selected record ${selectedPolicyholder.policy_number} will be updated with the analysis inputs above before the churn calculation runs.`
              : "No stored policyholder is selected, so the model will score the policy information entered above as a manual scenario."}
          </p>
        </div>
        <button type="button" disabled={submitting} onClick={handlePredict} className="action-primary justify-center disabled:opacity-60">
          <ShieldCheck size={16} />
          {submitting ? "Scoring..." : "Predict Churn"}
        </button>
      </section>

      <ResultPanel
        prediction={prediction}
        selectedPolicyholder={selectedPolicyholder}
        onDownloadPdf={handleDownloadPdf}
        actionState={actionState}
      />
    </div>
  );
}
