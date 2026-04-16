import type { Exercise } from '../types';
import type { FitnessStorage } from '../store/storage';

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main';
const DATA_URL = `${CDN_BASE}/dist/exercises.json`;
const IMAGE_BASE = `${CDN_BASE}/exercises`;

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CATALOG_VERSION = '1';

interface YuhonasExercise {
  id: string;
  name: string;
  force?: string | null;
  level?: string;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  category?: string;
  images?: string[];
}

function normalize(raw: YuhonasExercise): Exercise {
  return {
    id: `yuhonas:${raw.id}`,
    source: 'yuhonas',
    name: raw.name,
    primaryMuscles: raw.primaryMuscles ?? [],
    secondaryMuscles: raw.secondaryMuscles ?? [],
    equipment: raw.equipment ?? undefined,
    category: (raw.category as Exercise['category']) ?? undefined,
    force: (raw.force as Exercise['force']) ?? undefined,
    mechanic: (raw.mechanic as Exercise['mechanic']) ?? undefined,
    level: (raw.level as Exercise['level']) ?? undefined,
    instructions: raw.instructions ?? [],
    images: (raw.images ?? []).map(path => `${IMAGE_BASE}/${path}`),
  };
}

// Module-level cache populated after first load for cheap in-memory search.
let memoryCatalog: Exercise[] | null = null;

function isFresh(fetchedAtIso: string): boolean {
  const age = Date.now() - new Date(fetchedAtIso).getTime();
  return age < CACHE_TTL_MS;
}

/** Load the exercise catalog, preferring persisted cache, refreshing lazily. */
export async function loadCatalog(storage: FitnessStorage): Promise<Exercise[]> {
  if (memoryCatalog) return memoryCatalog;

  const meta = await storage.getCatalogMeta();
  if (meta && meta.version === CATALOG_VERSION && isFresh(meta.fetched_at)) {
    const cached = await storage.getCatalog();
    if (cached && cached.length) {
      memoryCatalog = cached;
      return cached;
    }
  }

  try {
    const res = await fetch(DATA_URL, meta?.etag ? { headers: { 'If-None-Match': meta.etag } } : undefined);
    if (res.status === 304) {
      const cached = await storage.getCatalog();
      if (cached && cached.length) {
        memoryCatalog = cached;
        await storage.setCatalog(cached, {
          etag: meta?.etag,
          fetched_at: new Date().toISOString(),
          version: CATALOG_VERSION,
          count: cached.length,
        });
        return cached;
      }
    }
    if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
    const raw = (await res.json()) as YuhonasExercise[];
    const normalized = raw.map(normalize);
    await storage.setCatalog(normalized, {
      etag: res.headers.get('etag') ?? undefined,
      fetched_at: new Date().toISOString(),
      version: CATALOG_VERSION,
      count: normalized.length,
    });
    memoryCatalog = normalized;
    return normalized;
  } catch (err) {
    // Network failed — fall back to stale cache if present.
    const cached = await storage.getCatalog();
    if (cached && cached.length) {
      memoryCatalog = cached;
      return cached;
    }
    throw err;
  }
}

/** Invalidate memory + persisted cache (called from Settings > Refresh catalog). */
export async function refreshCatalog(storage: FitnessStorage): Promise<Exercise[]> {
  memoryCatalog = null;
  await storage.clearCatalog();
  return loadCatalog(storage);
}

/** Synchronous filter over the loaded catalog. Call loadCatalog() first. */
export function searchLocalCatalog(query: string, limit = 40): Exercise[] {
  if (!memoryCatalog) return [];
  const q = query.trim().toLowerCase();
  if (!q) return memoryCatalog.slice(0, limit);

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: Array<{ exercise: Exercise; score: number }> = [];

  for (const ex of memoryCatalog) {
    const haystack = [
      ex.name,
      ex.equipment ?? '',
      (ex.primaryMuscles ?? []).join(' '),
      (ex.secondaryMuscles ?? []).join(' '),
      ex.category ?? '',
    ].join(' ').toLowerCase();

    let score = 0;
    for (const t of tokens) {
      if (!haystack.includes(t)) { score = 0; break; }
      if (ex.name.toLowerCase().startsWith(t)) score += 10;
      else if (ex.name.toLowerCase().includes(t)) score += 5;
      else score += 1;
    }
    if (score > 0) scored.push({ exercise: ex, score });
  }

  scored.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
  return scored.slice(0, limit).map(s => s.exercise);
}

/** Look up a single exercise by canonical id (e.g. `yuhonas:Bench_Press`). */
export function findCatalogExercise(id: string): Exercise | undefined {
  return memoryCatalog?.find(e => e.id === id);
}

export function catalogLoaded(): boolean {
  return memoryCatalog !== null;
}
