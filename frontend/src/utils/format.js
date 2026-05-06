export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatPercent(value) {
  return `${((value || 0) * 100).toFixed(1)}%`;
}
