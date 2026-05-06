import { useEffect, useState } from "react";
import { api } from "../api/client";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { createClaim, getClaims } from "../utils/operationsStore";
import { buildPolicyDisplayRecord } from "../utils/policyDisplay";

export default function FileClaimPage({ token }) {
  const [records, setRecords] = useState(null);
  const [claims, setClaims] = useState(getClaims());
  const [formData, setFormData] = useState({
    policyholder: "",
    claimType: "Funeral Benefit",
    amount: "",
    description: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.fetchPolicyholders(token, {
      page: 1,
      page_size: 300,
      sort_by: "created_at",
      sort_dir: "desc",
    })
      .then((response) => setRecords(response.items.map(buildPolicyDisplayRecord)))
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  if (error) {
    return <div className="table-card p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!records) {
    return <LoadingState label="Loading claims workspace..." />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const match = records.find(
      (record) =>
        `${record.customerId} - ${record.customerName}` === formData.policyholder ||
        record.customerId === formData.policyholder ||
        record.customerName === formData.policyholder,
    );

    const claim = createClaim({
      policyholderId: match?.customerId || formData.policyholder,
      customerName: match?.customerName || "Unknown Policyholder",
      claimType: formData.claimType,
      amount: Number(formData.amount || 0),
      description: formData.description,
    });

    setClaims([claim, ...getClaims()]);
    setFormData({
      policyholder: "",
      claimType: "Funeral Benefit",
      amount: "",
      description: "",
    });
    setMessage("Claim filed successfully.");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Management"
        title="File a Claim"
        description="Capture claim details against a policyholder and route the record to the claims management queue."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <form className="table-card p-6" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Policyholder
              <input
                list="policyholders-list"
                value={formData.policyholder}
                onChange={(event) => setFormData((current) => ({ ...current, policyholder: event.target.value }))}
                className="table-input mt-2 w-full"
                placeholder="Search by customer ID or name"
                required
              />
              <datalist id="policyholders-list">
                {records.map((record) => (
                  <option key={record.id} value={`${record.customerId} - ${record.customerName}`} />
                ))}
              </datalist>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Claim Type
              <select
                value={formData.claimType}
                onChange={(event) => setFormData((current) => ({ ...current, claimType: event.target.value }))}
                className="table-input mt-2 w-full"
              >
                <option>Funeral Benefit</option>
                <option>Policy Surrender</option>
                <option>Benefit Adjustment</option>
                <option>Documentation Query</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Claim Amount (USD)
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(event) => setFormData((current) => ({ ...current, amount: event.target.value }))}
                className="table-input mt-2 w-full"
                required
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Description
              <textarea
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#18264b] focus:ring-2 focus:ring-[#18264b]/10"
                required
              />
            </label>

            {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

            <button type="submit" className="action-primary justify-center">
              Submit Claim
            </button>
          </div>
        </form>

        <section className="table-card p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Recent Claims</p>
          <h3 className="mt-2 font-display text-2xl text-slate-900">Latest submitted items</h3>
          <div className="mt-5 space-y-3">
            {claims.slice(0, 6).map((claim) => (
              <div key={claim.id} className="rounded-xl border border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{claim.customerName}</div>
                    <div className="text-sm text-slate-500">
                      {claim.policyholderId} • {claim.claimType}
                    </div>
                  </div>
                  <StatusBadge value={claim.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
