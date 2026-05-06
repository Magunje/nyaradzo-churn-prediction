import { useEffect, useState } from "react";
import { api } from "../api/client";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { getReminderState, markReminderSent } from "../utils/operationsStore";
import { buildPolicyDisplayRecord } from "../utils/policyDisplay";

export default function PaymentUpdatesPage({ token }) {
  const [records, setRecords] = useState(null);
  const [reminders, setReminders] = useState(getReminderState());
  const [error, setError] = useState("");

  useEffect(() => {
    api.fetchPolicyholders(token, {
      page: 1,
      page_size: 200,
      sort_by: "last_churn_probability",
      sort_dir: "desc",
    })
      .then((response) => setRecords(response.items.map(buildPolicyDisplayRecord)))
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  if (error) {
    return <div className="table-card p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!records) {
    return <LoadingState label="Loading payment updates..." />;
  }

  const priorityRows = records
    .filter((record) => record.payment_delay_days_avg > 0 || record.missed_payments_last_12m > 0)
    .slice(0, 20);

  const sendReminder = (record) => {
    markReminderSent(record.customerId);
    setReminders(getReminderState());
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Management"
        title="Payment Updates"
        description="Monitor delayed and missed payments, then record reminder actions directly from the queue."
      />

      <section className="table-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[12px] font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Delay Days</th>
                <th className="px-5 py-4">Missed Payments</th>
                <th className="px-5 py-4">Risk</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {priorityRows.map((record) => (
                <tr key={record.id}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{record.customerName}</div>
                    <div className="text-xs text-slate-400">{record.customerId}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{record.payment_delay_days_avg} days</td>
                  <td className="px-5 py-4 text-slate-600">{record.missed_payments_last_12m}</td>
                  <td className="px-5 py-4">
                    <StatusBadge value={record.last_risk_band || "Low"} />
                  </td>
                  <td className="px-5 py-4">
                    {reminders[record.customerId] ? (
                      <StatusBadge value="Reminder Sent" />
                    ) : (
                      <button type="button" onClick={() => sendReminder(record)} className="action-secondary">
                        Send Reminder
                      </button>
                    )}
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
