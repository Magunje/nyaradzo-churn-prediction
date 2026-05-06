function buildLinePath(points, width, height, padding) {
  if (points.length === 0) {
    return "";
  }

  const minY = Math.min(...points.map((point) => point.value));
  const maxY = Math.max(...points.map((point) => point.value));
  const yRange = maxY - minY || 1;
  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  return points
    .map((point, index) => {
      const x = padding + index * xStep;
      const y = height - padding - ((point.value - minY) / yRange) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildPlotPoints(points, width, height, padding) {
  if (points.length === 0) {
    return [];
  }

  const minY = Math.min(...points.map((point) => point.value));
  const maxY = Math.max(...points.map((point) => point.value));
  const yRange = maxY - minY || 1;
  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  return points.map((point, index) => ({
    ...point,
    x: padding + index * xStep,
    y: height - padding - ((point.value - minY) / yRange) * (height - padding * 2),
  }));
}

export default function LineChartCard({ title, subtitle, data, color = "#18264B", valueFormatter = (value) => value }) {
  const width = 520;
  const height = 220;
  const padding = 24;
  const points = buildPlotPoints(data, width, height, padding);
  const path = buildLinePath(data, width, height, padding);

  return (
    <section className="table-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <h3 className="mt-2 font-display text-2xl text-slate-900">{subtitle}</h3>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
          <defs>
            <linearGradient id={`fill-${title.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
          {points.map((point) => (
            <g key={`${point.label}-${point.value}`}>
              <circle cx={point.x} cy={point.y} r="4.5" fill={color} />
              <text x={point.x} y={height - 4} textAnchor="middle" fontSize="10" fill="#64748B">
                {point.label}
              </text>
              <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="10" fill="#0F172A">
                {valueFormatter(point.value)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
