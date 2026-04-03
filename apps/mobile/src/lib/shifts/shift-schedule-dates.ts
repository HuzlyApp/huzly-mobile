/**
 * Helpers for multi-day shift schedule UI (weekday counts, calendar ranges).
 */

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

function parseIsoDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

/** Inclusive; Mon–Fri only. */
export function countWeekdaysInclusive(startIso: string | null, endIso: string | null): number {
  const s = parseIsoDate(startIso);
  const e = parseIsoDate(endIso ?? startIso);
  if (!s || !e) return 0;
  const start = s <= e ? s : e;
  const end = s <= e ? e : s;
  let n = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

/** Every calendar date (YYYY-MM-DD) between range inclusive, weekdays only. */
export function weekdayDatesInRange(startIso: string | null, endIso: string | null): string[] {
  const s = parseIsoDate(startIso);
  const e = parseIsoDate(endIso ?? startIso);
  if (!s || !e) return [];
  const start = s <= e ? s : e;
  const end = s <= e ? e : s;
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      out.push(`${y}-${m}-${d}`);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function formatRangeShort(startIso: string | null, endIso: string | null): string {
  const s = parseIsoDate(startIso);
  const e = parseIsoDate(endIso ?? startIso);
  if (!s) return '—';
  const end = e ?? s;
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const a = fmt.format(s);
  const b = fmt.format(end);
  if (a === b) return a;
  return `${a} - ${b.toLowerCase()}`;
}

/** First weekday of month >= start, last <= end for header grid. */
export function buildMonthGrid(year: number, monthIndex0: number): { date: Date; inMonth: boolean }[][] {
  const first = new Date(year, monthIndex0, 1);
  const startPad = (first.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startPad);

  const rows: { date: Date; inMonth: boolean }[][] = [];
  let cur = new Date(gridStart);
  for (let r = 0; r < 6; r++) {
    const row: { date: Date; inMonth: boolean }[] = [];
    for (let c = 0; c < 7; c++) {
      const inMonth = cur.getMonth() === monthIndex0;
      row.push({ date: new Date(cur), inMonth });
      cur.setDate(cur.getDate() + 1);
    }
    rows.push(row);
  }
  // trim trailing empty week
  while (rows.length > 1 && rows[rows.length - 1].every((cell) => !cell.inMonth)) {
    rows.pop();
  }
  return rows;
}

export function toIsoKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isDateInShiftRange(d: Date, startIso: string | null, endIso: string | null): boolean {
  const key = toIsoKey(d);
  const weekdays = new Set(weekdayDatesInRange(startIso, endIso));
  return weekdays.has(key);
}
