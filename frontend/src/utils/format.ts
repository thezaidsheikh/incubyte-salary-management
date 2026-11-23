export function formatMoney(amount: number, currency: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
  catch { return `${currency} ${amount.toLocaleString("en-US")}`; }
}
export function formatDate(iso: string): string { return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }); }
