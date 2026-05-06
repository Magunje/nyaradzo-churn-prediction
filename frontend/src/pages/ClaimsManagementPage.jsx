import { useState } from "react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { getClaims, updateClaimStatus } from "../utils/operationsStore";

export default function ClaimsManagementPage() {
  const [claims, setClaims] = useState(getClaims());

  const setStatus = (id, status) => {
    updateClaimStatus(id, status);
    setClaims(getClaims());
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Management"
        title="Claims Management"
        description="Review all filed claims, move them through approval states, and keep the queue up to date."
      />

      <section className="table-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[12px] font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-4">Claim ID</th>
                <th className="px-5 py-4">Policyholder</th>
                <th className="px-5 py-4">Claim Type</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claims.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-slate-500" colSpan="6">
                    No claims filed yet. Use the File a Claim page to create one.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="px-5 py-4 font-mono text-[12px] text-slate-500">{claim.id}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{claim.customerName}</div>
                      <div className="text-xs text-slate-400">{claim.policyholderId}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{claim.claimType}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">${claim.amount.toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge value={claim.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="action-secondary" onClick={() => setStatus(claim.id, "Under Review")}>
                          Review
                        </button>
                        <button type="button" className="action-secondary" onClick={() => setStatus(claim.id, "Approved")}>
                          Approve
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                          onClick={() => setStatus(claim.id, "Rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
