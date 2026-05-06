import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  ClipboardList,
  FileText,
  TrendingUp,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import BarChartCard from "../components/BarChartCard";
import LineChartCard from "../components/LineChartCard";
import LoadingState from "../components/LoadingState";
import StatusBadge from "../components/StatusBadge";
import { formatPercent } from "../utils/format";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function DashboardStatCard({ label, value, helper, helperTone = "text-emerald-600", icon: Icon, iconClassName }) {
  return (
    <div className="dashboard-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <h3 className="mt-3 text-[2rem] font-extrabold leading-none text-slate-900">{value}</h3>
          <p className={`mt-3 text-sm font-medium ${helperTone}`}>{helper}</p>
        </div>
        <div className={`dashboard-stat-icon ${iconClassName}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage({ token }) {
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.fetchMetrics(token), api.fetchDashboardTrends(token)])
      .then(([metricsResponse, trendsResponse]) => {
        setMetrics(metricsResponse);
        setTrends(trendsResponse);
      })
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  if (error) {
    return <div className="table-card p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!metrics || !trends) {
    return <LoadingState label="Loading dashboard overview..." />;
  }

  const statCards = [
    {
      label: "Total Policies",
      value: metrics.total_policyholders.toLocaleString(),
      helper: `${metrics.new_this_month.toLocaleString()} new this month`,
      helperTone: "text-emerald-600",
      icon: FileText,
      iconClassName: "bg-slate-100 text-slate-700",
    },
    {
      label: "Active Policies",
      value: metrics.active_policies.toLocaleString(),
      helper: `${metrics.retention_rate}% active rate`,
      helperTone: "text-emerald-600",
      icon: UsersRound,
      iconClassName: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Pending Claims",
      value: metrics.pending_claims.toLocaleString(),
      helper: `${metrics.high_risk_customers.toLocaleString()} urgent`,
      helperTone: "text-rose-500",
      icon: ClipboardList,
      iconClassName: "bg-amber-50 text-amber-500",
    },
    {
      label: "Avg Churn Rate",
      value: formatPercent(metrics.average_churn_probability),
      helper: `${metrics.high_risk_customers.toLocaleString()} high-risk customers`,
      helperTone: "text-rose-500",
      icon: AlertTriangle,
      iconClassName: "bg-rose-50 text-rose-500",
    },
    {
      label: "Premium Revenue",
      value: formatCurrency(metrics.premium_revenue),
      helper: `${metrics.plan_breakdown?.[0]?.plan_type || "Portfolio"} leading`,
      helperTone: "text-emerald-600",
      icon: BadgeDollarSign,
      iconClassName: "bg-amber-50 text-amber-600",
    },
    {
      label: "New This Month",
      value: metrics.new_this_month.toLocaleString(),
      helper: `${metrics.region_breakdown?.[0]?.region || "Harare"} strongest region`,
      helperTone: "text-emerald-600",
      icon: UserPlus,
      iconClassName: "bg-blue-50 text-blue-500",
    },
    {
      label: "Claims Processed",
      value: metrics.claims_processed.toLocaleString(),
      helper: `${metrics.pending_claims.toLocaleString()} policies with claims`,
      helperTone: "text-slate-500",
      icon: TrendingUp,
      iconClassName: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Matured Policies",
      value: metrics.matured_policies.toLocaleString(),
      helper: "Pending payout review",
      helperTone: "text-slate-500",
      icon: CalendarClock,
      iconClassName: "bg-slate-100 text-slate-700",
    },
  ];

  const activitySeries = (trends.monthly_activity || []).map((item) => ({
    label: item.label,
    primary: item.new_policies,
    secondary: item.claims,
  }));

  const churnSeries = trends.churn_rate || [];

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="font-display text-3xl text-slate-900 md:text-4xl">Dashboard Overview</h1>
        <p className="text-base text-slate-500">Welcome back, Admin. Here's your policy management summary.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {statCards.map((card) => (
          <DashboardStatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <BarChartCard
          title="New Policies & Claims (Monthly)"
          subtitle="A monthly view of portfolio intake versus claims pressure."
          data={activitySeries}
          primaryLabel="New policies"
          secondaryLabel="Claims"
          primaryColor="#18264B"
          secondaryColor="#F2B203"
        />
        <LineChartCard
          title="Churn Rate Trend (%)"
          subtitle="Average churn probability by monthly dashboard cycle."
          data={churnSeries}
          color="#E4312B"
          valueFormatter={(value) => `${Math.round(value)}%`}
        />
      </section>

      <section className="table-card p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Recent Activity</p>
            <h3 className="mt-2 font-display text-2xl text-slate-900">Latest scored policyholders</h3>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="pb-3">Policyholder</th>
                <th className="pb-3">Policy Number</th>
                <th className="pb-3">Plan</th>
                <th className="pb-3">Region</th>
                <th className="pb-3">Probability</th>
                <th className="pb-3">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {metrics.recent_predictions.map((item) => (
                <tr key={`${item.policy_number}-${item.last_prediction_at}`}>
                  <td className="py-4">
                    <div className="font-semibold text-slate-900">
                      {[item.first_name, item.last_name].filter(Boolean).join(" ") || item.policyholder_id}
                    </div>
                    <div className="text-xs text-slate-400">{item.policyholder_id}</div>
                  </td>
                  <td className="py-4 font-mono text-[12px]">{item.policy_number}</td>
                  <td className="py-4">{item.plan_type}</td>
                  <td className="py-4">{item.region}</td>
                  <td className="py-4">{formatPercent(item.last_churn_probability)}</td>
                  <td className="py-4">
                    <StatusBadge value={item.last_risk_band} />
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
