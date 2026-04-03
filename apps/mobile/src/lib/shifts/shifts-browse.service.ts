/**
 * Browse / list shifts from Supabase: `shifts` plus linked `job_categories`,
 * `shift_requirements`, and `facility` (batch by `facility_id` when present).
 */

import { supabase } from '@/lib/config/supabase';

export type JobCategoryRow = {
  id: string;
  name: string;
  active: boolean | null;
};

export type RequirementTypeRow = {
  id: string;
  name: string;
  est_time_min: number | null;
  icon_url: string | null;
};

export type ShiftRequirementRow = {
  id: string;
  requirement_type_id: string;
  description: string | null;
  requirement_types?: RequirementTypeRow | RequirementTypeRow[] | null;
};

export type FacilityRow = {
  id: string;
  name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  /** Facility-level credential labels from DB (not a clothing spec today). */
  required_credentials?: string[] | null;
};

export type ClientEmbedRow = {
  user_id: string;
  company_name: string | null;
};

export type ShiftBrowseRow = {
  id: string;
  title: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  rate_per_hour: number | string | null;
  total_escrow: number | string | null;
  number_of_people_needed: number | string | null;
  weeks: number | string | null;
  posted_at: string | null;
  completed_at: string | null;
  claimed_at: string | null;
  facility_id: string | null;
  client_id: string | null;
  job_category_id: string | null;
  job_categories: JobCategoryRow | JobCategoryRow[] | null;
  shift_requirements: ShiftRequirementRow[] | null;
  /** Set when the shifts query embeds `facility (...)`. Null if RLS hides the row or embed omitted. */
  facility?: FacilityRow | FacilityRow[] | null;
  /** When embedded via `clients (...)`, used for employer messaging (`receiver_id` = user_id). */
  clients?: ClientEmbedRow | ClientEmbedRow[] | null;
};

export type ShiftBrowseItem = ShiftBrowseRow & {
  facility: FacilityRow | null;
  /** Resolved from `clients` embed; `receiver_id` for `/messaging/chat` is `user_id`. */
  employer_contact: { user_id: string; company_name: string } | null;
};

export interface FetchShiftsPageResult {
  data: ShiftBrowseItem[] | null;
  error: string | null;
  hasMore: boolean;
}

const PAGE_SIZE = 15;

function normalizeCategory(raw: ShiftBrowseRow['job_categories']): JobCategoryRow | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

/** Resolved `requirement_types` row for a shift_requirements line. */
export function requirementTypeForShiftReq(row: ShiftRequirementRow): RequirementTypeRow | null {
  const raw = row.requirement_types;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

const SHIFT_REQUIREMENTS_SELECT = `
  id,
  requirement_type_id,
  description,
  requirement_types ( id, name, est_time_min, icon_url )
`;

const FACILITY_EMBED_SELECT = `
  id,
  name,
  address,
  lat,
  lng,
  required_credentials
`;

function normalizeEmbeddedFacility(raw: ShiftBrowseRow['facility']): FacilityRow | null {
  if (raw == null) return null;
  const f = Array.isArray(raw) ? raw[0] : raw;
  if (!f?.id) return null;
  return {
    ...f,
    lat: toNum(f.lat),
    lng: toNum(f.lng),
  };
}

function normalizeEmployerContact(raw: ShiftBrowseRow['clients']): { user_id: string; company_name: string } | null {
  if (raw == null) return null;
  const c = Array.isArray(raw) ? raw[0] : raw;
  if (!c?.user_id) return null;
  return {
    user_id: c.user_id,
    company_name: (c.company_name ?? '').trim() || 'Employer',
  };
}

/** Prefer embedded facility from the shifts query; else map from a follow-up fetch. */
function resolveFacilityForRow(row: ShiftBrowseRow, facilityMap: Map<string, FacilityRow>): FacilityRow | null {
  if (!row.facility_id) return null;
  const embedded = normalizeEmbeddedFacility(row.facility);
  if (embedded) return embedded;
  return facilityMap.get(row.facility_id) ?? null;
}

/**
 * `shift_requirement_id`s the signed-in worker has marked complete (`completed_at` set).
 */
export async function fetchCompletedShiftRequirementIds(
  userId: string,
  shiftRequirementIds: string[],
): Promise<{ ids: Set<string>; error: string | null }> {
  if (shiftRequirementIds.length === 0) return { ids: new Set(), error: null };
  try {
    const { data, error } = await supabase
      .from('worker_shift_requirements')
      .select('shift_requirement_id')
      .eq('worker_id', userId)
      .in('shift_requirement_id', shiftRequirementIds)
      .not('completed_at', 'is', null);

    if (error) {
      return { ids: new Set(), error: error.message };
    }
    const ids = new Set<string>();
    for (const row of data ?? []) {
      const id = (row as { shift_requirement_id?: string }).shift_requirement_id;
      if (id) ids.add(id);
    }
    return { ids, error: null };
  } catch (e) {
    return { ids: new Set(), error: e instanceof Error ? e.message : 'Failed to load completions' };
  }
}

export function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Estimated pay for card display: prefer `total_escrow`; else rough single-day estimate from hourly rate.
 */
export function estimateShiftPay(shift: ShiftBrowseItem): number | null {
  const escrow = toNum(shift.total_escrow);
  if (escrow != null && escrow > 0) return escrow;
  const rate = toNum(shift.rate_per_hour);
  if (rate == null || rate <= 0) return null;
  const weeks = Math.max(1, Math.floor(toNum(shift.weeks) ?? 1));
  const hoursPerDay = 8;
  return rate * hoursPerDay * weeks;
}

export function isMultiShift(shift: ShiftBrowseItem): boolean {
  const w = toNum(shift.weeks);
  if (w != null && w > 1) return true;
  if (shift.start_date && shift.end_date && shift.start_date !== shift.end_date) return true;
  return false;
}

/**
 * Google Maps URL: prefer street address, else coordinates from `facility.lat` / `facility.lng`.
 */
export function mapsUrlForFacility(f: FacilityRow | null | undefined): string | null {
  if (!f) return null;
  const addr = f.address?.trim();
  if (addr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  }
  const lat = toNum(f.lat);
  const lng = toNum(f.lng);
  if (lat != null && lng != null) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  return null;
}

/**
 * Text passed to the Directions screen / Mapbox geocoder when lat/lng are missing.
 * Prefer street address; else approximate from facility name.
 */
export function directionsGeocodeQueryFromShift(shift: ShiftBrowseItem): string {
  const f = shift.facility;
  const addr = f?.address?.trim();
  if (addr) return addr;
  const name = f?.name?.trim();
  if (name) return `${name}, United States`;
  return '';
}

/** True if we can open in-app / native directions (coords, address, or geocodable name). */
export function canOpenDirectionsForShift(shift: ShiftBrowseItem): boolean {
  if (mapsUrlForFacility(shift.facility)) return true;
  return directionsGeocodeQueryFromShift(shift).length > 0;
}

export type DirectionsBlockReason =
  | { kind: 'ok' }
  | { kind: 'no_facility_id' }
  /** Shift has facility_id but no row returned (often Supabase RLS or missing GRANT SELECT on facility). */
  | { kind: 'facility_not_visible'; facilityId: string }
  | { kind: 'facility_incomplete' };

export function directionsAvailability(shift: ShiftBrowseItem): DirectionsBlockReason {
  if (!shift.facility_id) return { kind: 'no_facility_id' };
  if (!shift.facility) return { kind: 'facility_not_visible', facilityId: shift.facility_id };
  if (!canOpenDirectionsForShift(shift)) return { kind: 'facility_incomplete' };
  return { kind: 'ok' };
}

async function fetchFacilitiesByIds(ids: string[]): Promise<Map<string, FacilityRow>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from('facility')
    .select('id, name, address, lat, lng, required_credentials')
    .in('id', unique);

  if (error || !data) {
    console.warn('[shifts-browse] facility fetch:', error?.message);
    return new Map();
  }

  const map = new Map<string, FacilityRow>();
  for (const raw of data as FacilityRow[]) {
    const row: FacilityRow = {
      ...raw,
      lat: toNum(raw.lat),
      lng: toNum(raw.lng),
    };
    map.set(row.id, row);
  }
  return map;
}

export async function fetchShiftsPage(from: number): Promise<FetchShiftsPageResult> {
  try {
    const { data: rows, error } = await supabase
      .from('shifts')
      .select(
        `
        id,
        title,
        description,
        start_date,
        end_date,
        rate_per_hour,
        total_escrow,
        number_of_people_needed,
        weeks,
        posted_at,
        completed_at,
        claimed_at,
        facility_id,
        facility ( ${FACILITY_EMBED_SELECT} ),
        client_id,
        job_category_id,
        job_categories ( id, name, active ),
        shift_requirements ( ${SHIFT_REQUIREMENTS_SELECT} )
      `,
      )
      .is('completed_at', null)
      .order('start_date', { ascending: true, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('[shifts-browse] shifts query:', error.message);
      return { data: null, error: error.message, hasMore: false };
    }

    const list = (rows ?? []) as ShiftBrowseRow[];
    const missingFacilityIds = list
      .filter((r) => r.facility_id && !normalizeEmbeddedFacility(r.facility))
      .map((r) => r.facility_id as string);
    const facilityMap = await fetchFacilitiesByIds(missingFacilityIds);

    const merged: ShiftBrowseItem[] = list.map((row) => ({
      ...row,
      job_categories: normalizeCategory(row.job_categories),
      shift_requirements: Array.isArray(row.shift_requirements) ? row.shift_requirements : [],
      facility: resolveFacilityForRow(row, facilityMap),
      employer_contact: normalizeEmployerContact(row.clients),
    }));

    return {
      data: merged,
      error: null,
      hasMore: list.length === PAGE_SIZE,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load shifts';
    return { data: null, error: msg, hasMore: false };
  }
}

export async function fetchShiftById(id: string): Promise<{ data: ShiftBrowseItem | null; error: string | null }> {
  try {
    const { data: row, error } = await supabase
      .from('shifts')
      .select(
        `
        id,
        title,
        description,
        start_date,
        end_date,
        rate_per_hour,
        total_escrow,
        number_of_people_needed,
        weeks,
        posted_at,
        completed_at,
        claimed_at,
        facility_id,
        facility ( ${FACILITY_EMBED_SELECT} ),
        client_id,
        job_category_id,
        job_categories ( id, name, active ),
        shift_requirements ( ${SHIFT_REQUIREMENTS_SELECT} )
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    if (!row) {
      return { data: null, error: 'Shift not found' };
    }

    const r = row as ShiftBrowseRow;
    const needFacilityFetch = r.facility_id && !normalizeEmbeddedFacility(r.facility);
    const facilityMap = needFacilityFetch ? await fetchFacilitiesByIds([r.facility_id as string]) : new Map();
    const item: ShiftBrowseItem = {
      ...r,
      job_categories: normalizeCategory(r.job_categories),
      shift_requirements: Array.isArray(r.shift_requirements) ? r.shift_requirements : [],
      facility: resolveFacilityForRow(r, facilityMap),
      employer_contact: normalizeEmployerContact(r.clients),
    };
    return { data: item, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to load shift' };
  }
}

export { PAGE_SIZE };
