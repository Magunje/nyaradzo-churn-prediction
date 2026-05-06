import { useEffect, useState } from "react";
import { api } from "../api/client";
import LineChartCard from "../components/LineChartCard";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { formatPercent } from "../utils/format";
import { buildPolicyDisplayRecord } from "../utils/policyDisplay";

export default function ReportsPage({ token }) {
  const [metrics, setMetrics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.fetchMetrics(token), api.fetchReportsSummary(token)])
      .then(([metricsResponse, summaryResponse]) => {
        setMetrics(metricsResponse);
        setSummary({
          ageSeries: summaryResponse.age_series || [],
          premiumSeries: summaryResponse.premium_series || [],
          records: (summaryResponse.top_at_risk || []).map(buildPolicyDisplayRecord),
        });
      })
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  if (error) {
    return <div className="table-card p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!metrics || !summary) {
    return <LoadingState label="Loading reports..." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Reports"
        title="Portfolio performance reports"
        description="Review line-chart trends, risk concentration, and the policyholders most in need of retention action."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Average churn probability", formatPercent(metrics.average_churn_probability)],
          ["High-risk customers", metrics.high_risk_customers.toLocaleString()],
          ["Retention rate", `${metrics.retention_rate}%`],
        ].map(([label, value]) => (
          <div key={label} className="metric-card">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Risk Curve"
          subtitle="Average churn probability by age group"
          data={summary.ageSeries}
          color="#C2410C"
          valueFormatter={(value) => `${Math.round(value * 100)}%`}
        />
        <LineChartCard
          title="Premium Curve"
          subtitle="Average monthly premium by tenure year"
          data={summary.premiumSeries}
          color="#0F766E"
          valueFormatter={(value) => `$${Math.round(value)}`}
        />
      </div>

      <section className="table-card p-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Top At-Risk Policyholders</p>
          <h3 className="mt-2 font-display text-2xl text-slate-900">Latest retention priority list</h3>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Policy Number</th>
                <th className="pb-3">Location</th>
                <th className="pb-3">Policy Type</th>
                <th className="pb-3">Probability</th>
                <th className="pb-3">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {summary.records.map((record) => (
                <tr key={record.id}>
                  <td className="py-4">
                    <div className="font-semibold text-slate-900">{record.customerName}</div>
                    <div className="text-xs text-slate-400">{record.customerId}</div>
                  </td>
                  <td className="py-4 font-mono text-[12px]">{record.policyNumber}</td>
                  <td className="py-4">{record.location}</td>
                  <td className="py-4">{record.policyType}</td>
                  <td className="py-4">{formatPercent(record.last_churn_probability || 0)}</td>
                  <td className="py-4">
                    <StatusBadge value={record.last_risk_band || "Low"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
