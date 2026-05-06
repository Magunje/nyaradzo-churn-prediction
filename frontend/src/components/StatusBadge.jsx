const badgeStyles = {
  High: "border-rose-200 bg-rose-50 text-rose-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Likely to Churn": "border-rose-200 bg-rose-50 text-rose-700",
  "Watch List": "border-amber-200 bg-amber-50 text-amber-700",
  Retained: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Rejected: "border-rose-200 bg-rose-50 text-rose-700",
  Pending: "border-slate-200 bg-slate-100 text-slate-700",
  "Under Review": "border-amber-200 bg-amber-50 text-amber-700",
  "Reminder Sent": "border-blue-200 bg-blue-50 text-blue-700",
  Observed: "border-slate-200 bg-slate-100 text-slate-700",
};

export default function StatusBadge({ value }) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
        badgeStyles[value] || "border-slate-200 bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {value}
    </span>
  );
}
