import type { NormalizedFood } from '../types';
import { USDA_NUTRIENT_IDS } from '../utils/nutrients';

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

interface USDAFood {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: {
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }[];
}

interface USDASearchResponse {
  foods: USDAFood[];
  totalHits: number;
}

export async function searchUSDA(query: string, apiKey: string, page = 1): Promise<NormalizedFood[]> {
  const url = `${BASE_URL}/foods/search?query=${encodeURIComponent(query)}&api_key=${apiKey}&pageSize=20&pageNumber=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA search failed: ${res.status}`);
  const data: USDASearchResponse = await res.json();
  return data.foods.map(normalizeUSDA);
}

function normalizeUSDA(food: USDAFood): NormalizedFood {
  const servingG = food.servingSize ?? 100;
  const factor = servingG / 100;

  function getNutrient(key: string): number {
    const id = USDA_NUTRIENT_IDS[key];
    if (!id) return 0;
    const n = food.foodNutrients.find(fn => fn.nutrientId === id);
    return n ? n.value * factor : 0;
  }

  const brand = food.brandName || food.brandOwner;
  const servingUnit = food.servingSizeUnit ?? 'g';
  const servingLabel = servingG === 100 ? '100g' : `${servingG}${servingUnit}`;

  return {
    id: String(food.fdcId),
    source: 'usda',
    name: food.description,
    brand: brand ?? undefined,
    serving_size_g: servingG,
    serving_unit: 'g' as const,
    serving_label: servingLabel,
    calories: Math.round(getNutrient('calories')),
    protein_g: round1(getNutrient('protein_g')),
    carbs_g: round1(getNutrient('carbs_g')),
    fat_g: round1(getNutrient('fat_g')),
    fiber_g: getNutrient('fiber_g') || undefined,
    sugar_g: getNutrient('sugar_g') || undefined,
    sodium_mg: getNutrient('sodium_mg') ? Math.round(getNutrient('sodium_mg')) : undefined,
    cholesterol_mg: getNutrient('cholesterol_mg') ? Math.round(getNutrient('cholesterol_mg')) : undefined,
    saturated_fat_g: getNutrient('saturated_fat_g') || undefined,
    potassium_mg: getNutrient('potassium_mg') ? Math.round(getNutrient('potassium_mg')) : undefined,
    vitamin_a_mcg: getNutrient('vitamin_a_mcg') || undefined,
    vitamin_c_mg: getNutrient('vitamin_c_mg') || undefined,
    calcium_mg: getNutrient('calcium_mg') ? Math.round(getNutrient('calcium_mg')) : undefined,
    iron_mg: getNutrient('iron_mg') || undefined,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
