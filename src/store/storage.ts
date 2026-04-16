import type {
  PluginStorageAPI,
  MealType,
  MealLog,
  Exercise,
  ExerciseEntry,
  ExerciseLog,
  WeightEntry,
  WaterEntry,
  Goals,
  UserProfile,
  NormalizedFood,
  Recipe,
  MealTemplate,
  FrequentFood,
  MonthlySummary,
  DailySummary,
  FitnessSettings,
  FoodEntry,
  WellnessEntry,
  WorkoutTemplate,
  MEAL_TYPES,
} from '../types';

/** Lazy-migrate a legacy v1 exercise entry to v2 shape on read. */
function migrateExerciseEntry(entry: ExerciseEntry): ExerciseEntry {
  if (entry.schema_version === 2) return entry;
  return {
    ...entry,
    schema_version: 2,
    kind: entry.kind ?? 'cardio',
  };
}

// ============================================================
// Key Patterns
// ============================================================

const keys = {
  meal: (date: string, meal: MealType) => `log:${date}:${meal}`,
  exercise: (date: string) => `exercise:${date}`,
  weight: (date: string) => `weight:${date}`,
  water: (date: string) => `water:${date}`,
  wellness: (date: string) => `wellness:${date}`,
  goals: () => 'goals',
  profile: () => 'profile',
  settings: () => 'settings',
  customFood: (id: string) => `food:custom:${id}`,
  recipe: (id: string) => `recipe:${id}`,
  template: (id: string) => `template:${id}`,
  frequentFoods: () => 'frequent_foods',
  recentFoods: () => 'recent_foods',
  monthlySummary: (yearMonth: string) => `summary:${yearMonth}`,
  // Exercise catalog & library
  catalogYuhonas: () => 'catalog:yuhonas:v1',
  catalogYuhonasMeta: () => 'catalog:yuhonas:meta',
  customExercises: () => 'exercises:custom',
  workoutTemplate: (id: string) => `workout-template:${id}`,
  exerciseHistory: (exerciseId: string) => `exercise-history:${exerciseId}`,
  exerciseFavorites: () => 'exercises:favorites',
  exerciseRecents: () => 'exercises:recents',
  exerciseFrequency: () => 'exercises:frequency',
};

export interface CatalogMeta {
  etag?: string;
  fetched_at: string;
  version: string;
  count: number;
}

// ============================================================
// Storage Wrapper
// ============================================================

export function createStorage(storage: PluginStorageAPI) {
  return {
    // ---- Meal Logs ----
    async getMeal(date: string, meal: MealType): Promise<MealLog> {
      const data = await storage.get<MealLog>(keys.meal(date, meal));
      return data ?? { entries: [] };
    },

    async setMeal(date: string, meal: MealType, log: MealLog): Promise<void> {
      await storage.set(keys.meal(date, meal), log);
    },

    async getAllMeals(date: string): Promise<Record<MealType, MealLog>> {
      const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
      const results = await Promise.all(meals.map(m => this.getMeal(date, m)));
      return {
        breakfast: results[0],
        lunch: results[1],
        dinner: results[2],
        snacks: results[3],
      };
    },

    // ---- Exercise ----
    async getExercise(date: string): Promise<ExerciseLog> {
      const data = await storage.get<ExerciseLog>(keys.exercise(date));
      if (!data) return { entries: [] };
      return { entries: data.entries.map(migrateExerciseEntry) };
    },

    async setExercise(date: string, log: ExerciseLog): Promise<void> {
      await storage.set(keys.exercise(date), log);
    },

    // ---- Weight ----
    async getWeight(date: string): Promise<WeightEntry | null> {
      return storage.get<WeightEntry>(keys.weight(date));
    },

    async setWeight(date: string, entry: WeightEntry): Promise<void> {
      await storage.set(keys.weight(date), entry);
    },

    async getWeightRange(startDate: string, endDate: string): Promise<{ date: string; weight_kg: number }[]> {
      const allKeys = await storage.keys();
      const weightKeys = allKeys
        .filter(k => k.startsWith('weight:'))
        .map(k => k.replace('weight:', ''))
        .filter(d => d >= startDate && d <= endDate)
        .sort();

      const results: { date: string; weight_kg: number }[] = [];
      for (const date of weightKeys) {
        const entry = await storage.get<WeightEntry>(keys.weight(date));
        if (entry) results.push({ date, weight_kg: entry.weight_kg });
      }
      return results;
    },

    // ---- Water ----
    async getWater(date: string): Promise<WaterEntry> {
      const data = await storage.get<WaterEntry>(keys.water(date));
      return data ?? { ml: 0 };
    },

    async setWater(date: string, entry: WaterEntry): Promise<void> {
      await storage.set(keys.water(date), entry);
    },

    // ---- Wellness (sleep / steps / resting HR / notes per day) ----
    async getWellness(date: string): Promise<WellnessEntry> {
      const data = await storage.get<WellnessEntry>(keys.wellness(date));
      return data ?? { date };
    },

    async setWellness(date: string, entry: WellnessEntry): Promise<void> {
      // Normalize: always persist the date, strip the object if every
      // field is empty so the storage key can be used as "present = logged".
      const hasAny =
        entry.sleep_minutes != null ||
        entry.steps != null ||
        entry.resting_hr_bpm != null ||
        (entry.notes && entry.notes.trim().length > 0);
      if (!hasAny) {
        await storage.delete(keys.wellness(date));
        return;
      }
      await storage.set(keys.wellness(date), { ...entry, date });
    },

    async getWellnessRange(startDate: string, endDate: string): Promise<WellnessEntry[]> {
      const allKeys = await storage.keys();
      const wellnessDates = allKeys
        .filter(k => k.startsWith('wellness:'))
        .map(k => k.replace('wellness:', ''))
        .filter(d => d >= startDate && d <= endDate)
        .sort();

      const results: WellnessEntry[] = [];
      for (const d of wellnessDates) {
        const entry = await storage.get<WellnessEntry>(keys.wellness(d));
        if (entry) results.push({ ...entry, date: d });
      }
      return results;
    },

    // ---- Goals ----
    async getGoals(): Promise<Goals> {
      const data = await storage.get<Goals>(keys.goals());
      return data ?? { calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, water_ml: 2500 };
    },

    async setGoals(goals: Goals): Promise<void> {
      await storage.set(keys.goals(), goals);
    },

    // ---- Profile ----
    async getProfile(): Promise<UserProfile> {
      const data = await storage.get<UserProfile>(keys.profile());
      return data ?? { unit_system: 'metric' };
    },

    async setProfile(profile: UserProfile): Promise<void> {
      await storage.set(keys.profile(), profile);
    },

    // ---- Settings ----
    async getSettings(): Promise<FitnessSettings> {
      const data = await storage.get<FitnessSettings>(keys.settings());
      return data ?? { default_meal: 'breakfast', show_micros: false, chart_range: '30d' };
    },

    async setSettings(settings: FitnessSettings): Promise<void> {
      await storage.set(keys.settings(), settings);
    },

    // ---- Custom Foods ----
    async getCustomFood(id: string): Promise<NormalizedFood | null> {
      return storage.get<NormalizedFood>(keys.customFood(id));
    },

    async setCustomFood(food: NormalizedFood): Promise<void> {
      await storage.set(keys.customFood(food.id), food);
    },

    async deleteCustomFood(id: string): Promise<void> {
      await storage.delete(keys.customFood(id));
    },

    async getAllCustomFoods(): Promise<NormalizedFood[]> {
      const allKeys = await storage.keys();
      const foodKeys = allKeys.filter(k => k.startsWith('food:custom:'));
      const results: NormalizedFood[] = [];
      for (const key of foodKeys) {
        const food = await storage.get<NormalizedFood>(key);
        if (food) results.push(food);
      }
      return results;
    },

    // ---- Recipes ----
    async getRecipe(id: string): Promise<Recipe | null> {
      return storage.get<Recipe>(keys.recipe(id));
    },

    async setRecipe(recipe: Recipe): Promise<void> {
      await storage.set(keys.recipe(recipe.id), recipe);
    },

    async deleteRecipe(id: string): Promise<void> {
      await storage.delete(keys.recipe(id));
    },

    async getAllRecipes(): Promise<Recipe[]> {
      const allKeys = await storage.keys();
      const recipeKeys = allKeys.filter(k => k.startsWith('recipe:'));
      const results: Recipe[] = [];
      for (const key of recipeKeys) {
        const recipe = await storage.get<Recipe>(key);
        if (recipe) results.push(recipe);
      }
      return results;
    },

    // ---- Meal Templates ----
    async getTemplate(id: string): Promise<MealTemplate | null> {
      return storage.get<MealTemplate>(keys.template(id));
    },

    async setTemplate(template: MealTemplate): Promise<void> {
      await storage.set(keys.template(template.id), template);
    },

    async deleteTemplate(id: string): Promise<void> {
      await storage.delete(keys.template(id));
    },

    async getAllTemplates(): Promise<MealTemplate[]> {
      const allKeys = await storage.keys();
      const templateKeys = allKeys.filter(k => k.startsWith('template:'));
      const results: MealTemplate[] = [];
      for (const key of templateKeys) {
        const template = await storage.get<MealTemplate>(key);
        if (template) results.push(template);
      }
      return results;
    },

    // ---- Frequent & Recent Foods ----
    async getFrequentFoods(): Promise<FrequentFood[]> {
      const data = await storage.get<FrequentFood[]>(keys.frequentFoods());
      return data ?? [];
    },

    async trackFoodUsage(food: NormalizedFood): Promise<void> {
      const frequent = await this.getFrequentFoods();
      const existing = frequent.find(f => f.food.id === food.id && f.food.source === food.source);
      if (existing) {
        existing.count++;
        existing.last_used = new Date().toISOString();
      } else {
        frequent.push({ food, count: 1, last_used: new Date().toISOString() });
      }
      frequent.sort((a, b) => b.count - a.count);
      const top50 = frequent.slice(0, 50);
      await storage.set(keys.frequentFoods(), top50);

      // Also update recent foods
      const recent = await this.getRecentFoods();
      const filtered = recent.filter(f => !(f.id === food.id && f.source === food.source));
      filtered.unshift(food);
      await storage.set(keys.recentFoods(), filtered.slice(0, 30));
    },

    async getRecentFoods(): Promise<NormalizedFood[]> {
      const data = await storage.get<NormalizedFood[]>(keys.recentFoods());
      return data ?? [];
    },

    // ---- Monthly Summary Cache ----
    async getMonthlySummary(yearMonth: string): Promise<MonthlySummary | null> {
      return storage.get<MonthlySummary>(keys.monthlySummary(yearMonth));
    },

    async setMonthlySummary(yearMonth: string, summary: MonthlySummary): Promise<void> {
      await storage.set(keys.monthlySummary(yearMonth), summary);
    },

    // ---- Aggregation Helpers ----
    async getDailySummary(date: string): Promise<DailySummary> {
      const meals = await this.getAllMeals(date);
      const exercise = await this.getExercise(date);
      const water = await this.getWater(date);
      const weight = await this.getWeight(date);

      let calories = 0, protein_g = 0, carbs_g = 0, fat_g = 0;
      for (const mealType of ['breakfast', 'lunch', 'dinner', 'snacks'] as const) {
        for (const entry of meals[mealType].entries) {
          calories += entry.food.calories * entry.servings;
          protein_g += entry.food.protein_g * entry.servings;
          carbs_g += entry.food.carbs_g * entry.servings;
          fat_g += entry.food.fat_g * entry.servings;
        }
      }

      const exercise_calories = exercise.entries.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0);

      return {
        calories: Math.round(calories),
        protein_g: Math.round(protein_g),
        carbs_g: Math.round(carbs_g),
        fat_g: Math.round(fat_g),
        water_ml: water.ml,
        exercise_calories,
        weight_kg: weight?.weight_kg,
      };
    },

    // ---- Exercise Catalog (yuhonas) ----
    async getCatalog(): Promise<Exercise[] | null> {
      return storage.get<Exercise[]>(keys.catalogYuhonas());
    },

    async setCatalog(exercises: Exercise[], meta: CatalogMeta): Promise<void> {
      await storage.set(keys.catalogYuhonas(), exercises);
      await storage.set(keys.catalogYuhonasMeta(), meta);
    },

    async getCatalogMeta(): Promise<CatalogMeta | null> {
      return storage.get<CatalogMeta>(keys.catalogYuhonasMeta());
    },

    async clearCatalog(): Promise<void> {
      await storage.delete(keys.catalogYuhonas());
      await storage.delete(keys.catalogYuhonasMeta());
    },

    // ---- Custom Exercises ----
    async getCustomExercises(): Promise<Exercise[]> {
      const data = await storage.get<Exercise[]>(keys.customExercises());
      return data ?? [];
    },

    async addCustomExercise(exercise: Exercise): Promise<void> {
      const list = await this.getCustomExercises();
      const idx = list.findIndex(e => e.id === exercise.id);
      if (idx >= 0) list[idx] = exercise; else list.push(exercise);
      await storage.set(keys.customExercises(), list);
    },

    async deleteCustomExercise(id: string): Promise<void> {
      const list = await this.getCustomExercises();
      await storage.set(keys.customExercises(), list.filter(e => e.id !== id));
    },

    // ---- Workout Templates (per-entity, mirrors MealTemplate pattern) ----
    async getWorkoutTemplate(id: string): Promise<WorkoutTemplate | null> {
      return storage.get<WorkoutTemplate>(keys.workoutTemplate(id));
    },

    async setWorkoutTemplate(template: WorkoutTemplate): Promise<void> {
      await storage.set(keys.workoutTemplate(template.id), template);
    },

    async deleteWorkoutTemplate(id: string): Promise<void> {
      await storage.delete(keys.workoutTemplate(id));
    },

    async getAllWorkoutTemplates(): Promise<WorkoutTemplate[]> {
      const allKeys = await storage.keys();
      const templateKeys = allKeys.filter(k => k.startsWith('workout-template:'));
      const results: WorkoutTemplate[] = [];
      for (const key of templateKeys) {
        const template = await storage.get<WorkoutTemplate>(key);
        if (template) results.push(template);
      }
      return results;
    },

    // ---- Per-exercise History Index ----
    async appendExerciseHistory(exerciseId: string, date: string, entryId: string): Promise<void> {
      const list = (await storage.get<Array<{ date: string; entry_id: string }>>(keys.exerciseHistory(exerciseId))) ?? [];
      list.push({ date, entry_id: entryId });
      await storage.set(keys.exerciseHistory(exerciseId), list);
    },

    async removeExerciseHistory(exerciseId: string, entryId: string): Promise<void> {
      const list = (await storage.get<Array<{ date: string; entry_id: string }>>(keys.exerciseHistory(exerciseId))) ?? [];
      const next = list.filter(e => e.entry_id !== entryId);
      if (next.length === 0) {
        await storage.delete(keys.exerciseHistory(exerciseId));
      } else {
        await storage.set(keys.exerciseHistory(exerciseId), next);
      }
    },

    async getExerciseHistory(exerciseId: string): Promise<Array<{ date: string; entry_id: string }>> {
      const data = await storage.get<Array<{ date: string; entry_id: string }>>(keys.exerciseHistory(exerciseId));
      return data ?? [];
    },

    /** Rebuild the per-exercise history index from scratch by walking stored exercise logs.
     *  Bounded to `daysBack` trailing days (default 365). */
    async rebuildExerciseHistoryIndex(daysBack = 365): Promise<number> {
      const allKeys = await storage.keys();
      const historyKeys = allKeys.filter(k => k.startsWith('exercise-history:'));
      await Promise.all(historyKeys.map(k => storage.delete(k)));

      const fresh = new Map<string, Array<{ date: string; entry_id: string }>>();
      const today = new Date();
      for (let i = 0; i < daysBack; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().slice(0, 10);
        const log = await storage.get<ExerciseLog>(keys.exercise(dateKey));
        if (!log?.entries?.length) continue;
        for (const entry of log.entries) {
          if (!entry.exercise_id) continue;
          const arr = fresh.get(entry.exercise_id) ?? [];
          arr.push({ date: dateKey, entry_id: entry.id });
          fresh.set(entry.exercise_id, arr);
        }
      }
      let total = 0;
      for (const [exerciseId, entries] of fresh) {
        await storage.set(keys.exerciseHistory(exerciseId), entries);
        total += entries.length;
      }
      return total;
    },

    // ---- Favorites / Recents / Frequency ----
    async getExerciseFavorites(): Promise<string[]> {
      const data = await storage.get<string[]>(keys.exerciseFavorites());
      return data ?? [];
    },

    async toggleExerciseFavorite(exerciseId: string): Promise<boolean> {
      const list = await this.getExerciseFavorites();
      const idx = list.indexOf(exerciseId);
      if (idx >= 0) {
        list.splice(idx, 1);
        await storage.set(keys.exerciseFavorites(), list);
        return false;
      }
      list.push(exerciseId);
      await storage.set(keys.exerciseFavorites(), list);
      return true;
    },

    async getRecentExercises(): Promise<Exercise[]> {
      const data = await storage.get<Exercise[]>(keys.exerciseRecents());
      return data ?? [];
    },

    async trackExerciseUsage(exercise: Exercise): Promise<void> {
      const recents = await this.getRecentExercises();
      const filtered = recents.filter(e => e.id !== exercise.id);
      filtered.unshift(exercise);
      await storage.set(keys.exerciseRecents(), filtered.slice(0, 20));

      const freq = (await storage.get<Record<string, number>>(keys.exerciseFrequency())) ?? {};
      freq[exercise.id] = (freq[exercise.id] ?? 0) + 1;
      await storage.set(keys.exerciseFrequency(), freq);
    },

    async getExerciseFrequency(): Promise<Record<string, number>> {
      const data = await storage.get<Record<string, number>>(keys.exerciseFrequency());
      return data ?? {};
    },
  };
}

export type FitnessStorage = ReturnType<typeof createStorage>;
