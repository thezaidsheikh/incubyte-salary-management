// Fixed FX rates used ONLY to normalise pay for comparison (dashboard /
// top earners / outliers). Payroll itself is always stored and paid in
// local currency. Rates are approximate and documented as such.
export const FX_PER_USD: Record<string, number> = {
  INR: 83, USD: 1, GBP: 0.79, EUR: 0.92, SGD: 1.34, CAD: 1.36, AUD: 1.52, AED: 3.67,
};

/**
 * Convert a local-currency amount to USD at the fixed rate above.
 * Unknown currencies fall back to a 1:1 rate rather than failing the
 * whole analytics summary over one bad row.
 * @param amount Amount in the local currency.
 * @param currency ISO currency code, e.g. "INR".
 * @returns The amount in USD.
 */
export function toUsd(amount: number, currency: string): number {
  return amount / (FX_PER_USD[currency] ?? 1);
}

/**
 * Median of a list of numbers; 0 for an empty list so analytics never
 * divides by zero or returns NaN on an empty dataset.
 * @param values Numbers to summarise.
 * @returns The middle value (or the mean of the two middle values).
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/**
 * Arithmetic mean of a list of numbers; 0 for an empty list.
 * @param values Numbers to summarise.
 * @returns The mean, or 0 when there are no values.
 */
export function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

/** Pagination metadata returned alongside every list response. */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Build pagination metadata for a list response. totalPages is at least 1
 * even for an empty list, so clients never see "page 1 of 0".
 * @param total Total rows matching the filters (before paging).
 * @param page Current 1-based page.
 * @param pageSize Rows per page.
 * @returns The metadata object.
 */
export function paginationMeta(total: number, page: number, pageSize: number): PaginationMeta {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
