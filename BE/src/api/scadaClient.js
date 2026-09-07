import { config } from '../config.js';

async function fetchJson(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  return res.json();
}

/**
 * Extract tags[] from cleaned API response.
 * Supports shapes:
 *  - { data: { tags: [...] } }
 *  - { data: { data: { tags: [...] } } }
 *  - { tags: [...] }
 */
export function extractTags(body) {
  if (!body || typeof body !== 'object') return [];

  const candidates = [
    body?.data?.tags,
    body?.data?.data?.tags,
    body?.tags,
    body?.data,
  ];

  for (const c of candidates) {
    if (Array.isArray(c) && c.length && c[0]?.tagId !== undefined) {
      return c;
    }
  }

  return [];
}

/**
 * Map tag array → { tagId: value }
 */
export function tagsToMap(tags) {
  const map = new Map();
  for (const t of tags) {
    if (!t || t.tagId == null) continue;
    const value =
      t.value ?? t.Value ?? t.cleanedValue ?? t.val ?? t.data ?? null;
    map.set(String(t.tagId), value);
  }
  return map;
}

export async function fetchRealtimeTags() {
  const url = new URL(config.scadaCleanedUrl);
  url.searchParams.set('systemId', config.scadaSystemId);

  const body = await fetchJson(url.toString());
  const tags = extractTags(body);
  return tagsToMap(tags);
}

/**
 * Normalize history API into { RAWUF_LocThoA, RAWUF_LocThoB } number[31]
 * Contract from raw chart.js / record.js
 */
export function normalizeHistory(body, year, month) {
  const empty = () => Array(31).fill(0);

  let locThoA = empty();
  let locThoB = empty();

  if (!body || typeof body !== 'object') {
    return { year, month, RAWUF_LocThoA: locThoA, RAWUF_LocThoB: locThoB };
  }

  const data = body.data ?? body;

  if (
    Array.isArray(data.RAWUF_LocThoA) ||
    Array.isArray(data.RAWUF_LocThoB) ||
    Array.isArray(body.RAWUF_LocThoA)
  ) {
    locThoA = pad31(data.RAWUF_LocThoA ?? body.RAWUF_LocThoA);
    locThoB = pad31(data.RAWUF_LocThoB ?? body.RAWUF_LocThoB);
    return { year, month, RAWUF_LocThoA: locThoA, RAWUF_LocThoB: locThoB };
  }

  if (Array.isArray(data.lineA) || Array.isArray(data.LINE_A)) {
    locThoA = pad31(data.lineA ?? data.LINE_A);
    locThoB = pad31(data.lineB ?? data.LINE_B ?? empty());
    return { year, month, RAWUF_LocThoA: locThoA, RAWUF_LocThoB: locThoB };
  }

  if (Array.isArray(data)) {
    for (const row of data) {
      const day = Number(row.day ?? row.Day ?? row.date ?? row.Date);
      if (!Number.isInteger(day) || day < 1 || day > 31) continue;
      const a = Number(row.RAWUF_LocThoA ?? row.lineA ?? row.A ?? 0);
      const b = Number(row.RAWUF_LocThoB ?? row.lineB ?? row.B ?? 0);
      locThoA[day - 1] = Number.isFinite(a) ? a : 0;
      locThoB[day - 1] = Number.isFinite(b) ? b : 0;
    }
  }

  return { year, month, RAWUF_LocThoA: locThoA, RAWUF_LocThoB: locThoB };
}

function pad31(arr) {
  const out = Array(31).fill(0);
  if (!Array.isArray(arr)) return out;
  for (let i = 0; i < 31; i++) {
    const n = Number(arr[i] ?? 0);
    out[i] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

export async function fetchHistory(month, year) {
  const url = `${config.historyBaseUrl.replace(/\/$/, '')}/${month}/${year}`;
  try {
    const body = await fetchJson(url);
    return normalizeHistory(body, year, month);
  } catch (err) {
    // Empty month / not created yet — still publish zeros so FE retained topic exists
    const msg = String(err.message || err);
    if (msg.includes('HTTP 404') || msg.includes('HTTP 204')) {
      console.warn(`[api] history ${month}/${year} empty (${msg})`);
      return normalizeHistory(null, year, month);
    }
    throw err;
  }
}
