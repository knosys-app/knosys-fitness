import type { NormalizedFood } from '../types';

const BASE_URL = 'https://world.openfoodfacts.org';

// Rate limiting: minimum 2 seconds between requests
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 2000;

// Simple cache: query -> results (keeps last 20 searches)
const cache = new Map<string, { results: NormalizedFood[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 20;

interface OFFProduct {
  code: string;
  product_name?: string;
  brands?: string;
  serving_quantity?: number;
  serving_size?: string;
  nutriments?: Record<string, number>;
}

interface OFFSearchResponse {
  products: OFFProduct[];
  count: number;
}

export async function searchOpenFoodFacts(query: string, page = 1): Promise<NormalizedFood[]> {
  const cacheKey = `${query}:${page}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.results;
  }

  // Rate limit: wait if we're calling too fast
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=20&page=${page}&search_simple=1&action=process`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'KnosysFitness/1.0 (https://github.com/knosys-app/atlas-fitness)' },
  });
  if (!res.ok) throw new Error(`Open Food Facts search failed: ${res.status}`);
  const data: OFFSearchResponse = await res.json();
  const results = data.products
    .filter(p => p.product_name && p.nutriments)
    .map(normalizeOFF);

  // Store in cache
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(cacheKey, { results, ts: Date.now() });

  return results;
}

function normalizeOFF(product: OFFProduct): NormalizedFood {
  const n = product.nutriments ?? {};
  const servingG = product.serving_quantity ?? 100;
  const factor = servingG / 100;

  return {
    id: product.code,
    source: 'openfoodfacts',
    name: product.product_name ?? 'Unknown',
    brand: product.brands ?? undefined,
    serving_size_g: servingG,
    serving_unit: 'g' as const,
    serving_label: product.serving_size ?? `${servingG}g`,
    calories: Math.round((n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0) * factor),
    protein_g: round1((n['proteins_100g'] ?? 0) * factor),
    carbs_g: round1((n['carbohydrates_100g'] ?? 0) * factor),
    fat_g: round1((n['fat_100g'] ?? 0) * factor),
    fiber_g: n['fiber_100g'] != null ? round1(n['fiber_100g'] * factor) : undefined,
    sugar_g: n['sugars_100g'] != null ? round1(n['sugars_100g'] * factor) : undefined,
    sodium_mg: n['sodium_100g'] != null ? Math.round(n['sodium_100g'] * factor * 1000) : undefined,
    saturated_fat_g: n['saturated-fat_100g'] != null ? round1(n['saturated-fat_100g'] * factor) : undefined,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
