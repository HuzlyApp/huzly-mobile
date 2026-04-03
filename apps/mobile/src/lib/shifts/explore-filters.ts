import { toNum, type ShiftBrowseItem } from '@/lib/shifts/shifts-browse.service';

export const PAY_SLIDER_MIN = 10;
export const PAY_SLIDER_MAX = 120;

export type ExploreBrowseFilters = {
  maxDistanceMins: number | null;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  payMin: number;
  payMax: number;
  roles: string[];
};

export const DEFAULT_EXPLORE_FILTERS: ExploreBrowseFilters = {
  maxDistanceMins: null,
  dateFrom: '',
  dateTo: '',
  timeFrom: '',
  timeTo: '',
  payMin: PAY_SLIDER_MIN,
  payMax: PAY_SLIDER_MAX,
  roles: [],
};

/** Treat pay as “no narrowing” when span covers full slider range. */
export function isPayFilterInactive(f: ExploreBrowseFilters): boolean {
  return f.payMin <= PAY_SLIDER_MIN && f.payMax >= PAY_SLIDER_MAX;
}

/** True when any filter that currently affects the shift list is set (excludes distance/time until wired to data). */
export function hasActiveExploreFilters(f: ExploreBrowseFilters): boolean {
  if (f.dateFrom.trim() || f.dateTo.trim()) return true;
  if (!isPayFilterInactive(f)) return true;
  if (f.roles.length > 0) return true;
  return false;
}

function parseUsShortDate(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t);
  if (!m) return null;
  let month = Number(m[1]);
  let day = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function shiftMatchesExploreFilters(shift: ShiftBrowseItem, f: ExploreBrowseFilters): boolean {
  if (!isPayFilterInactive(f)) {
    const rate = toNum(shift.rate_per_hour);
    if (rate == null) return false;
    if (rate < f.payMin || rate > f.payMax) return false;
  }

  const fromD = parseUsShortDate(f.dateFrom);
  if (fromD && shift.start_date) {
    const sd = new Date(`${shift.start_date}T12:00:00`);
    if (Number.isNaN(sd.getTime()) || sd < fromD) return false;
  }

  const toD = parseUsShortDate(f.dateTo);
  if (toD && shift.start_date) {
    const sd = new Date(`${shift.start_date}T12:00:00`);
    if (!Number.isNaN(sd.getTime()) && sd > endOfDay(toD)) return false;
  }

  if (f.roles.length > 0) {
    const cat = jobCategoryNameFromShift(shift).toLowerCase();
    const title = (shift.title ?? '').toLowerCase();
    const hit = f.roles.some(
      (r) => cat.includes(r.toLowerCase()) || title.includes(r.toLowerCase()),
    );
    if (!hit) return false;
  }

  return true;
}

export function jobCategoryNameFromShift(shift: ShiftBrowseItem): string {
  const raw = shift.job_categories;
  if (!raw) return '';
  const row = Array.isArray(raw) ? raw[0] : raw;
  return row?.name ?? '';
}
