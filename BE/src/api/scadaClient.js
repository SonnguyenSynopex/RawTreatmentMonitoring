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
 * Normalize history API into { lineA: number[31], lineB: number[31] }
 */
export function normalizeHistory(body, year, month) {
  const empty = () => Array(31).fill(0);

  let lineA = empty();
  let lineB = empty();

  if (!body || typeof body !== 'object') {
    return { year, month, lineA, lineB };
  }

  const data = body.data ?? body;

  if (Array.isArray(data?.lineA) || Array.isArray(data?.LINE_A)) {
    lineA = pad31(data.lineA ?? data.LINE_A);
    lineB = pad31(data.lineB ?? data.LINE_B ?? empty());
    return { year, month, lineA, lineB };
  }

  // Possible shapes: { lineA: { day1: n, ... } } or arrays of { day, value }
  if (data?.lineA || data?.['LINE A'] || data?.LineA) {
    lineA = coerceSeries(data.lineA ?? data['LINE A'] ?? data.LineA);
    lineB = coerceSeries(data.lineB ?? data['LINE B'] ?? data.LineB);
    return { year, month, lineA, lineB };
  }

  // Array of daily records: [{ day, lineA, lineB }, ...]
  if (Array.isArray(data)) {
    for (const row of data) {
      const day = Number(row.day ?? row.Day ?? row.date ?? row.Date);
      if (!Number.isInteger(day) || day < 1 || day > 31) continue;
      const a = Number(row.lineA ?? row.LINE_A ?? row.A ?? 0);
      const b = Number(row.lineB ?? row.LINE_B ?? row.B ?? 0);
      lineA[day - 1] = Number.isFinite(a) ? a : 0;
      lineB[day - 1] = Number.isFinite(b) ? b : 0;
    }
  }

  return { year, month, lineA, lineB };
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

function coerceSeries(src) {
  if (Array.isArray(src)) return pad31(src);
  if (src && typeof src === 'object') {
    const out = Array(31).fill(0);
    for (let d = 1; d <= 31; d++) {
      const n = Number(src[d] ?? src[`day${d}`] ?? src[`Day${d}`] ?? 0);
      out[d - 1] = Number.isFinite(n) ? n : 0;
    }
    return out;
  }
  return Array(31).fill(0);
}

export async function fetchHistory(month, year) {
  const url = `${config.historyBaseUrl.replace(/\/$/, '')}/${month}/${year}`;
  const body = await fetchJson(url);
  return normalizeHistory(body, year, month);
}
