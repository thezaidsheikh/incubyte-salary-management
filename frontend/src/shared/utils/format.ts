/**
 * Formats an amount in the given currency with no decimals (e.g. `₹1,50,000`).
 * Unknown or invalid currency codes fall back to a plain `CODE 1,50,000` form
 * instead of throwing, so one bad row never breaks a whole table.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US")}`;
  }
}

/**
 * Formats an ISO date string as a short date (e.g. `1 Mar 2022`, en-IN).
 * Invalid input renders as `Invalid Date` rather than throwing.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
