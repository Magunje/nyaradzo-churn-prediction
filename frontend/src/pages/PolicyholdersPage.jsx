import { Eye, Plus, Search, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import { buildPolicyDisplayRecord, filterPolicyDisplayRecords } from "../utils/policyDisplay";

function Satisfaction({ score, stars }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 text-[#f5c24b]">
        {Array.from({ length: 3 }).map((_, index) => (
          <Star key={index} size={14} fill={index < stars ? "currentColor" : "none"} strokeWidth={2} />
        ))}
      </div>
      <span className="font-medium text-slate-700">{score}/10</span>
    </div>
  );
}

function ViewModal({ record, onClose, onDelete }) {
  if (!record) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Policy Holder Details</p>
            <h3 className="mt-2 font-display text-3xl text-slate-900">{record.customerName}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {record.customerId} • {record.policyNumber}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-500">
            Close
          </button>
        </div>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["Location", record.location],
            ["Age", record.ageLabel],
            ["Customer Email", record.customer_email],
            ["Policy Type", record.policyType],
            ["Premium", record.premiumLabel],
            ["Tenure", record.tenureLabel],
            ["Satisfaction", `${record.satisfactionScore}/10`],
            ["Risk Band", record.last_risk_band || "Low"],
            ["Churn Probability", `${Math.round((record.last_churn_probability || 0) * 100)}%`],
            ["Payment Frequency", record.payment_frequency],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</div>
              <div className="mt-2 font-semibold text-slate-900">{value}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 border-t border-slate-200 px-6 py-5">
          <Link to={`/policyholders/${record.id}/edit`} className="action-secondary">
            Edit Policy
          </Link>
          <Link to={`/predict/${record.id}`} className="action-primary">
            Predict Churn
          </Link>
          <button
            type="button"
            onClick={() => onDelete(record.id)}
            className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          >
            Delete Record
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PolicyholdersPage({ token }) {
  const [records, setRecords] = useState(null);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [error, setError] = useState("");

  const loadRecords = async () => {
    try {
      const response = await api.fetchPolicyholders(token, {
        page: 1,
        page_size: 5000,
        sort_by: "created_at",
        sort_dir: "desc",
      });
      setRecords(response.items.map(buildPolicyDisplayRecord));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [token]);

  if (error) {
    return <div className="table-card p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!records) {
    return <LoadingState label="Loading policy holders..." />;
  }

  const filteredRecords = filterPolicyDisplayRecords(records, { search, location });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const locations = ["", ...new Set(records.map((record) => record.location))];

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this policyholder record?")) {
      return;
    }
    try {
      await api.deletePolicyholder(token, id);
      setSelectedRecord(null);
      await loadRecords();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Policy Holders"
        description={`${filteredRecords.length} policy holders found`}
        action={
          <Link to="/register-policy" className="action-primary">
            <Plus size={16} />
            Register Policyholder
          </Link>
        }
      />

      <section className="table-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="table-input w-full pl-11"
              placeholder="Search by name or ID..."
            />
          </label>

          <select
            value={location}
            onChange={(event) => {
              setLocation(event.target.value);
              setPage(1);
            }}
            className="table-input"
          >
            <option value="">All Locations</option>
            {locations.filter(Boolean).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="table-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[12px] font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-4">Customer ID</th>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Age</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Policy Number</th>
                <th className="px-5 py-4">Policy Type</th>
                <th className="px-5 py-4">Premium</th>
                <th className="px-5 py-4">Tenure</th>
                <th className="px-5 py-4">Satisfaction</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {pageItems.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-[12px] text-slate-500">{record.customerId}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{record.customerName}</td>
                  <td className="px-5 py-4">{record.ageLabel}</td>
                  <td className="px-5 py-4">{record.location}</td>
                  <td className="px-5 py-4 font-mono text-[12px] text-slate-500">{record.policyNumber}</td>
                  <td className="px-5 py-4">{record.policyType}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{record.premiumLabel}</td>
                  <td className="px-5 py-4">{record.tenureLabel}</td>
                  <td className="px-5 py-4">
                    <Satisfaction score={record.satisfactionScore} stars={record.starCount} />
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label={`View ${record.customerName}`}
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            Showing {pageItems.length} of {filteredRecords.length.toLocaleString()} policy holders
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="action-secondary disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 text-sm font-medium text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="action-secondary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <ViewModal record={selectedRecord} onClose={() => setSelectedRecord(null)} onDelete={handleDelete} />
    </div>
  );
}
