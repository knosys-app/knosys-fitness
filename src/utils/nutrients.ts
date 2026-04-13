import type { NormalizedFood, FoodEntry, MealLog, MealType } from '../types';

/** Compute totals for a single food entry (food * servings) */
export function entryNutrients(entry: FoodEntry) {
  const s = entry.servings;
  return {
    calories: Math.round(entry.food.calories * s),
    protein_g: Math.round(entry.food.protein_g * s * 10) / 10,
    carbs_g: Math.round(entry.food.carbs_g * s * 10) / 10,
    fat_g: Math.round(entry.food.fat_g * s * 10) / 10,
  };
}

/** Sum nutrients across all entries in a meal */
export function mealTotals(meal: MealLog) {
  let calories = 0, protein_g = 0, carbs_g = 0, fat_g = 0;
  for (const entry of meal.entries) {
    const n = entryNutrients(entry);
    calories += n.calories;
    protein_g += n.protein_g;
    carbs_g += n.carbs_g;
    fat_g += n.fat_g;
  }
  return { calories, protein_g, carbs_g, fat_g };
}

/** Sum nutrients across all meals in a day */
export function dayTotals(meals: Record<MealType, MealLog>) {
  let calories = 0, protein_g = 0, carbs_g = 0, fat_g = 0;
  for (const meal of Object.values(meals)) {
    const t = mealTotals(meal);
    calories += t.calories;
    protein_g += t.protein_g;
    carbs_g += t.carbs_g;
    fat_g += t.fat_g;
  }
  return { calories, protein_g, carbs_g, fat_g };
}

/** Format a number as display calories */
export function formatCal(n: number): string {
  return Math.round(n).toLocaleString();
}

/** Format grams with one decimal */
export function formatG(n: number): string {
  return `${Math.round(n * 10) / 10}g`;
}

/** USDA nutrient ID mapping */
export const USDA_NUTRIENT_IDS: Record<string, number> = {
  calories: 1008,
  protein_g: 1003,
  fat_g: 1004,
  carbs_g: 1005,
  fiber_g: 1079,
  sugar_g: 2000,
  sodium_mg: 1093,
  cholesterol_mg: 1253,
  saturated_fat_g: 1258,
  potassium_mg: 1092,
  vitamin_a_mcg: 1106,
  vitamin_c_mg: 1162,
  calcium_mg: 1087,
  iron_mg: 1089,
};

/** Convert kg to lbs */
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

/** Convert lbs to kg */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462 * 10) / 10;
}

/** Convert ml to fl oz */
export function mlToFlOz(ml: number): number {
  return Math.round(ml / 29.5735 * 10) / 10;
}
