export default function StatCard({ label, value, accent, helper }) {
  return (
    <div className="panel relative overflow-hidden p-5">
      <div className={`absolute inset-x-0 top-0 h-1.5 ${accent}`} />
      <p className="text-xs uppercase tracking-[0.3em] text-ink/45">{label}</p>
      <h3 className="mt-4 text-3xl font-extrabold text-pine">{value}</h3>
      {helper ? <p className="mt-2 text-sm text-ink/60">{helper}</p> : null}
    </div>
  );
}
