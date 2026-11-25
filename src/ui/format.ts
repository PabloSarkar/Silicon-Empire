const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const moneyCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number): string {
  return money.format(Math.round(amount));
}

/** Two decimals, for unit costs and share prices. */
export function formatMoneyCents(amount: number): string {
  return moneyCents.format(amount);
}

/** e.g. $1.25M, $830k, $420 */
export function formatMoneyShort(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const a = Math.abs(amount);
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${sign}$${Math.round(a / 1e3)}k`;
  return `${sign}$${Math.round(a).toLocaleString("en-US")}`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Performance in MIPS with a readable unit. */
export function formatPerf(mips: number): string {
  if (mips >= 1e6) return `${(mips / 1e6).toFixed(2)}M MIPS`;
  if (mips >= 1e4) return `${(mips / 1e3).toFixed(0)}k MIPS`;
  if (mips >= 100) return `${Math.round(mips)} MIPS`;
  return `${mips.toFixed(mips >= 10 ? 1 : 2)} MIPS`;
}

export function formatClock(mhz: number): string {
  return mhz >= 1000 ? `${(mhz / 1000).toFixed(2)} GHz` : `${mhz} MHz`;
}

export function formatTransistors(millions: number): string {
  if (millions >= 1000) return `${(millions / 1000).toFixed(2)} billion`;
  if (millions >= 1) return `${millions.toFixed(1)} million`;
  return `${formatNumber(millions * 1e6)}`;
}

export function formatPercent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatRealTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
