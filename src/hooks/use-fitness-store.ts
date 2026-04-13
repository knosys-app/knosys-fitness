import type { SharedDependencies, PluginAPI, MealType, MealLog, Goals, FoodEntry, NormalizedFood, ExerciseEntry, ExerciseLog, WaterEntry, WeightEntry, FitnessSettings, UserProfile } from '../types';
import { createStorage, type FitnessStorage } from '../store/storage';
import { toDateKey, uuid } from '../utils/date-helpers';
import { searchOpenFoodFacts } from '../api/open-food-facts';
import { searchUSDA } from '../api/usda';
import { recipeToFood } from '../utils/recipe-to-food';

// Singleton store state shared across components
let _storage: FitnessStorage | null = null;
let _api: PluginAPI | null = null;

export function initStore(api: PluginAPI) {
  _api = api;
  _storage = createStorage(api.storage);
}

export function getStorage(): FitnessStorage {
  if (!_storage) throw new Error('Fitness store not initialized');
  return _storage;
}

export function getApi(): PluginAPI {
  if (!_api) throw new Error('Fitness API not initialized');
  return _api;
}

/** Hook for daily diary data */
export function createUseDiary(Shared: SharedDependencies) {
  const { useState, useEffect, useCallback } = Shared;

  return function useDiary(dateKey: string) {
    const [meals, setMeals] = useState<Record<MealType, MealLog>>({
      breakfast: { entries: [] },
      lunch: { entries: [] },
      dinner: { entries: [] },
      snacks: { entries: [] },
    });
    const [goals, setGoals] = useState<Goals>({ calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, water_ml: 2500 });
    const [water, setWater] = useState<WaterEntry>({ ml: 0 });
    const [exercise, setExercise] = useState<ExerciseLog>({ entries: [] });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
      const s = getStorage();
      setLoading(true);
      const [m, g, w, e] = await Promise.all([
        s.getAllMeals(dateKey),
        s.getGoals(),
        s.getWater(dateKey),
        s.getExercise(dateKey),
      ]);
      setMeals(m);
      setGoals(g);
      setWater(w);
      setExercise(e);
      setLoading(false);
    }, [dateKey]);

    useEffect(() => { load(); }, [load]);

    const addFoodEntry = useCallback(async (mealType: MealType, food: NormalizedFood, servings: number) => {
      const s = getStorage();
      const meal = await s.getMeal(dateKey, mealType);
      const entry: FoodEntry = { id: uuid(), food, servings };
      meal.entries.push(entry);
      await s.setMeal(dateKey, mealType, meal);
      await s.trackFoodUsage(food);
      await load();
    }, [dateKey, load]);

    const removeFoodEntry = useCallback(async (mealType: MealType, entryId: string) => {
      const s = getStorage();
      const meal = await s.getMeal(dateKey, mealType);
      meal.entries = meal.entries.filter(e => e.id !== entryId);
      await s.setMeal(dateKey, mealType, meal);
      await load();
    }, [dateKey, load]);

    const updateFoodEntry = useCallback(async (mealType: MealType, entryId: string, servings: number) => {
      const s = getStorage();
      const meal = await s.getMeal(dateKey, mealType);
      const entry = meal.entries.find(e => e.id === entryId);
      if (entry) {
        entry.servings = servings;
        await s.setMeal(dateKey, mealType, meal);
        await load();
      }
    }, [dateKey, load]);

    const addWater = useCallback(async (ml: number) => {
      const s = getStorage();
      const current = await s.getWater(dateKey);
      const updated = { ml: current.ml + ml };
      await s.setWater(dateKey, updated);
      setWater(updated);
    }, [dateKey]);

    const setWaterAmount = useCallback(async (ml: number) => {
      const s = getStorage();
      const updated = { ml };
      await s.setWater(dateKey, updated);
      setWater(updated);
    }, [dateKey]);

    const addExercise = useCallback(async (name: string, duration_min: number, calories_burned: number) => {
      const s = getStorage();
      const log = await s.getExercise(dateKey);
      log.entries.push({ id: uuid(), name, duration_min, calories_burned });
      await s.setExercise(dateKey, log);
      await load();
    }, [dateKey, load]);

    const removeExercise = useCallback(async (entryId: string) => {
      const s = getStorage();
      const log = await s.getExercise(dateKey);
      log.entries = log.entries.filter(e => e.id !== entryId);
      await s.setExercise(dateKey, log);
      await load();
    }, [dateKey, load]);

    return {
      meals, goals, water, exercise, loading,
      addFoodEntry, removeFoodEntry, updateFoodEntry,
      addWater, setWaterAmount,
      addExercise, removeExercise,
    };
  };
}

/** Hook for food search */
export function createUseFoodSearch(Shared: SharedDependencies) {
  const { useState, useCallback, useRef, useEffect } = Shared;

  return function useFoodSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<NormalizedFood[]>([]);
    const [recentFoods, setRecentFoods] = useState<NormalizedFood[]>([]);
    const [frequentFoods, setFrequentFoods] = useState<NormalizedFood[]>([]);
    const [customFoods, setCustomFoods] = useState<NormalizedFood[]>([]);
    const [searching, setSearching] = useState(false);
    const [source, setSource] = useState<'all' | 'openfoodfacts' | 'usda' | 'custom'>('all');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      const s = getStorage();
      s.getRecentFoods().then(setRecentFoods);
      s.getFrequentFoods().then(ff => setFrequentFoods(ff.map(f => f.food)));
      s.getAllCustomFoods().then(setCustomFoods);
    }, []);

    const search = useCallback(async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const promises: Promise<NormalizedFood[]>[] = [];

        if (source === 'all' || source === 'openfoodfacts') {
          promises.push(searchOpenFoodFacts(q).catch(err => {
            console.warn('Open Food Facts search failed:', err.message);
            return [] as NormalizedFood[];
          }));
        }

        if (source === 'all' || source === 'usda') {
          const apiKey = await getApi().core.getApiKey('usda');
          if (apiKey) {
            promises.push(searchUSDA(q, apiKey).catch(err => {
              console.warn('USDA search failed:', err.message);
              return [] as NormalizedFood[];
            }));
          }
        }

        if (source === 'all' || source === 'custom') {
          const lower = q.toLowerCase();
          const customs = await getStorage().getAllCustomFoods();
          promises.push(Promise.resolve(
            customs.filter(f => f.name.toLowerCase().includes(lower) || f.brand?.toLowerCase().includes(lower))
          ));
          const recipes = await getStorage().getAllRecipes();
          const matchingRecipes = recipes
            .filter(r => r.name.toLowerCase().includes(lower) && r.ingredients.length > 0)
            .map(recipeToFood);
          promises.push(Promise.resolve(matchingRecipes));
        }

        const allResults = await Promise.all(promises);
        setResults(allResults.flat());
      } catch (err) {
        console.error('Food search error:', err);
      } finally {
        setSearching(false);
      }
    }, [source]);

    const debouncedSearch = useCallback((q: string) => {
      setQuery(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(q), 400);
    }, [search]);

    return {
      query, setQuery: debouncedSearch, results, searching, source, setSource,
      recentFoods, frequentFoods, customFoods,
    };
  };
}
