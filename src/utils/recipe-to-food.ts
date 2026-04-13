import type { Recipe, NormalizedFood } from '../types';

/** Convert a recipe to a NormalizedFood representing one serving */
export function recipeToFood(recipe: Recipe): NormalizedFood {
  const servings = recipe.servings || 1;

  let calories = 0, protein_g = 0, carbs_g = 0, fat_g = 0;
  let fiber_g = 0, sugar_g = 0, sodium_mg = 0;
  let total_weight_g = 0;
  let hasFiber = false, hasSugar = false, hasSodium = false;

  for (const ing of recipe.ingredients) {
    const s = ing.servings;
    calories += ing.food.calories * s;
    protein_g += ing.food.protein_g * s;
    carbs_g += ing.food.carbs_g * s;
    fat_g += ing.food.fat_g * s;
    total_weight_g += ing.food.serving_size_g * s;

    if (ing.food.fiber_g != null) { fiber_g += ing.food.fiber_g * s; hasFiber = true; }
    if (ing.food.sugar_g != null) { sugar_g += ing.food.sugar_g * s; hasSugar = true; }
    if (ing.food.sodium_mg != null) { sodium_mg += ing.food.sodium_mg * s; hasSodium = true; }
  }

  const perServing_g = Math.round(total_weight_g / servings);

  return {
    id: recipe.id,
    source: 'recipe',
    name: recipe.name,
    serving_size_g: perServing_g,
    serving_label: `1 serving (${perServing_g}g)`,
    calories: Math.round(calories / servings),
    protein_g: Math.round(protein_g / servings * 10) / 10,
    carbs_g: Math.round(carbs_g / servings * 10) / 10,
    fat_g: Math.round(fat_g / servings * 10) / 10,
    fiber_g: hasFiber ? Math.round(fiber_g / servings * 10) / 10 : undefined,
    sugar_g: hasSugar ? Math.round(sugar_g / servings * 10) / 10 : undefined,
    sodium_mg: hasSodium ? Math.round(sodium_mg / servings) : undefined,
  };
}
