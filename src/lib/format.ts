const kwachaFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const quantityFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

/** 5000000 → "K5,000,000" */
export function formatKwacha(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}K${kwachaFormatter.format(Math.abs(Math.round(amount)))}`;
}

/** 1234.5 → "1,234.5" */
export function formatNumber(value: number): string {
  return quantityFormatter.format(value);
}

/** Compact money for dashboard tiles: K10.8M, K950K. */
export function formatKwachaCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `K${trim(amount / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `K${trim(amount / 1_000_000)}M`;
  if (abs >= 1_000) return `K${trim(amount / 1_000)}K`;
  return formatKwacha(amount);
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Blantyre",
  });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Blantyre",
  });
}
