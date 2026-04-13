import type { NormalizedFood } from '../types';

const BASE_URL = 'https://world.openfoodfacts.org';

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
  const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=20&page=${page}&search_simple=1&action=process`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'KnosysFitness/1.0 (https://github.com/knosys-app/atlas-fitness)' },
  });
  if (!res.ok) throw new Error(`Open Food Facts search failed: ${res.status}`);
  const data: OFFSearchResponse = await res.json();
  return data.products
    .filter(p => p.product_name && p.nutriments)
    .map(normalizeOFF);
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
