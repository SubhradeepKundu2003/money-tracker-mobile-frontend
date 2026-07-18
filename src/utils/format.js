/** Formatting helpers shared across screens. */

export function formatMoney(amount, currency = 'INR') {
  const value = Number(amount ?? 0);
  try {
    // en-IN gives the Indian digit grouping (lakh/crore) and the ₹ symbol.
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    // Unknown currency code -> fall back to a plain formatted number.
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Returns today's date as YYYY-MM-DD (the format the backend expects). */
export function todayIso() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** First and last day of the current month as YYYY-MM-DD. */
export function currentMonthRange() {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(
      x.getDate(),
    ).padStart(2, '0')}`;
  return { from: fmt(first), to: fmt(last) };
}

/** "Good morning" / "Good afternoon" / "Good evening" based on the local clock. */
export function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** e.g. "May 2025" — used as a section header when grouping transactions by month. */
export function formatMonthYear(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
}
