function buildMaxValue(data) {
  return Math.max(
    1,
    ...data.flatMap((item) => [Number(item.primary || 0), Number(item.secondary || 0)]),
  );
}

export default function BarChartCard({
  title,
  subtitle,
  data,
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
  primaryColor = "#18264B",
  secondaryColor = "#F3B300",
}) {
  const maxValue = buildMaxValue(data);

  return (
    <section className="table-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl text-slate-900">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor }} />
            {primaryLabel}
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: secondaryColor }} />
            {secondaryLabel}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6">
        <div className="flex h-64 items-end justify-between gap-4">
          {data.map((item) => {
            const primaryHeight = `${Math.max(10, (Number(item.primary || 0) / maxValue) * 100)}%`;
            const secondaryHeight = `${Math.max(10, (Number(item.secondary || 0) / maxValue) * 100)}%`;

            return (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
                <div className="flex h-52 items-end gap-2">
                  <div
                    className="w-5 rounded-t-lg"
                    style={{ height: primaryHeight, backgroundColor: primaryColor }}
                    title={`${primaryLabel}: ${item.primary}`}
                  />
                  <div
                    className="w-5 rounded-t-lg"
                    style={{ height: secondaryHeight, backgroundColor: secondaryColor }}
                    title={`${secondaryLabel}: ${item.secondary}`}
                  />
                </div>
                <div className="text-xs font-medium text-slate-500">{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
