// Fixed FX rates used ONLY to normalise pay for comparison (dashboard /
// top earners / outliers). Payroll itself is always stored and paid in
// local currency. Rates are approximate and documented as such.
export const FX_PER_USD: Record<string, number> = {
  INR: 83, USD: 1, GBP: 0.79, EUR: 0.92, SGD: 1.34, CAD: 1.36, AUD: 1.52, AED: 3.67,
};
export function toUsd(amount: number, currency: string): number {
  return amount / (FX_PER_USD[currency] ?? 1);
}
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}
export function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}
export function paginationMeta(total: number, page: number, pageSize: number) {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
