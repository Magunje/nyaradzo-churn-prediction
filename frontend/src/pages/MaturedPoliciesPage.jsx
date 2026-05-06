import { useEffect, useState } from "react";
import { api } from "../api/client";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import { buildPolicyDisplayRecord } from "../utils/policyDisplay";

export default function MaturedPoliciesPage({ token }) {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.fetchPolicyholders(token, {
      page: 1,
      page_size: 20,
      sort_by: "tenure_months",
      sort_dir: "desc",
    })
      .then((response) => setRecords(response.items.map(buildPolicyDisplayRecord)))
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  if (error) {
    return <div className="table-card p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!records) {
    return <LoadingState label="Loading matured policies..." />;
  }

  const matured = records.filter((record) => record.tenure_months >= 60).slice(0, 20);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Management"
        title="Matured Policies"
        description="Review long-standing policies that may need benefit review, loyalty outreach, or renewal attention."
      />

      <section className="table-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[12px] font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Policy Number</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Tenure</th>
                <th className="px-5 py-4">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matured.map((record) => (
                <tr key={record.id}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{record.customerName}</div>
                    <div className="text-xs text-slate-400">{record.customerId}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-[12px] text-slate-500">{record.policyNumber}</td>
                  <td className="px-5 py-4 text-slate-600">{record.location}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{record.tenureLabel}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{record.premiumLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
