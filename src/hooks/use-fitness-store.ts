import type { SharedDependencies, PluginAPI, MealType, MealLog, Goals, FoodEntry, NormalizedFood, Exercise, ExerciseEntry, ExerciseLog, WaterEntry, WeightEntry, FitnessSettings, UserProfile, WellnessEntry, WellnessGoals } from '../types';
import { createStorage, type FitnessStorage } from '../store/storage';
import { toDateKey, uuid } from '../utils/date-helpers';
import { searchOpenFoodFacts } from '../api/open-food-facts';
import { searchUSDA } from '../api/usda';
import { loadCatalog, searchLocalCatalog } from '../api/exercise-catalog';
import { searchWger } from '../api/wger';
import { searchApiNinjas } from '../api/api-ninjas';
import { recipeToFood } from '../utils/recipe-to-food';

/** Default wellness goals — can be overridden in Settings by TL later. */
const DEFAULT_WELLNESS_GOALS: WellnessGoals = {
  sleep_minutes: 480, // 8h
  steps: 10000,
};

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
      log.entries.push({
        id: uuid(),
        schema_version: 2,
        name,
        kind: 'cardio',
        duration_min,
        calories_burned,
        logged_at: new Date().toISOString(),
      });
      await s.setExercise(dateKey, log);
      await load();
    }, [dateKey, load]);

    const addExerciseEntry = useCallback(async (entry: Omit<ExerciseEntry, 'id' | 'schema_version'>) => {
      const s = getStorage();
      const log = await s.getExercise(dateKey);
      const full: ExerciseEntry = {
        id: uuid(),
        schema_version: 2,
        logged_at: entry.logged_at ?? new Date().toISOString(),
        ...entry,
      };
      log.entries.push(full);
      await s.setExercise(dateKey, log);
      if (full.exercise_id) {
        await s.appendExerciseHistory(full.exercise_id, dateKey, full.id);
      }
      await load();
      return full;
    }, [dateKey, load]);

    const updateExerciseEntry = useCallback(async (entryId: string, patch: Partial<ExerciseEntry>) => {
      const s = getStorage();
      const log = await s.getExercise(dateKey);
      const idx = log.entries.findIndex(e => e.id === entryId);
      if (idx < 0) return;
      log.entries[idx] = { ...log.entries[idx], ...patch };
      await s.setExercise(dateKey, log);
      await load();
    }, [dateKey, load]);

    const removeExercise = useCallback(async (entryId: string) => {
      const s = getStorage();
      const log = await s.getExercise(dateKey);
      const entry = log.entries.find(e => e.id === entryId);
      log.entries = log.entries.filter(e => e.id !== entryId);
      await s.setExercise(dateKey, log);
      if (entry?.exercise_id) {
        await s.removeExerciseHistory(entry.exercise_id, entryId);
      }
      await load();
    }, [dateKey, load]);

    return {
      meals, goals, water, exercise, loading,
      addFoodEntry, removeFoodEntry, updateFoodEntry,
      addWater, setWaterAmount,
      addExercise, addExerciseEntry, updateExerciseEntry, removeExercise,
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
    const searchIdRef = useRef(0);

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
      const thisSearchId = ++searchIdRef.current;
      const allResults: NormalizedFood[] = [];

      // Open Food Facts
      if (source === 'all' || source === 'openfoodfacts') {
        try {
          const foods = await searchOpenFoodFacts(q);
          allResults.push(...foods);
        } catch (err: any) {
          console.warn('Open Food Facts search failed:', err.message);
        }
      }

      // USDA
      if (source === 'all' || source === 'usda') {
        try {
          const apiKey = await getApi().core.getApiKey('usda');
          if (apiKey) {
            const foods = await searchUSDA(q, apiKey);
            allResults.push(...foods);
          }
        } catch (err: any) {
          console.warn('USDA search failed:', err.message);
        }
      }

      // Custom foods + recipes
      if (source === 'all' || source === 'custom') {
        try {
          const lower = q.toLowerCase();
          const customs = await getStorage().getAllCustomFoods();
          allResults.push(...customs.filter(f =>
            f.name.toLowerCase().includes(lower) || f.brand?.toLowerCase().includes(lower)
          ));
          const recipes = await getStorage().getAllRecipes();
          allResults.push(...recipes
            .filter(r => r.name.toLowerCase().includes(lower) && r.ingredients.length > 0)
            .map(recipeToFood)
          );
        } catch (err: any) {
          console.warn('Custom food search failed:', err.message);
        }
      }

      // Only update if this is still the latest search
      if (thisSearchId === searchIdRef.current) {
        setResults(allResults);
        setSearching(false);
      }
    }, [source]);

    const debouncedSearch = useCallback((q: string) => {
      setQuery(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(q), 700);
    }, [search]);

    return {
      query, setQuery: debouncedSearch, results, searching, source, setSource,
      recentFoods, frequentFoods, customFoods,
    };
  };
}

/**
 * Hook for wellness data for a single day.
 * Loads the day's entry + global wellness goals on mount, exposes
 * `saveWellness(partial)` for incremental updates (merged with existing
 * values so individual fields can be edited without clobbering others).
 */
export function createUseWellness(Shared: SharedDependencies) {
  const { useState, useEffect, useCallback } = Shared;

  return function useWellness(dateKey: string) {
    const [entry, setEntry] = useState<WellnessEntry>({ date: dateKey });
    const [goals, setGoals] = useState<WellnessGoals>(DEFAULT_WELLNESS_GOALS);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
      const s = getStorage();
      setLoading(true);
      const [e, g] = await Promise.all([
        s.getWellness(dateKey),
        // WellnessGoals are stored alongside Goals on the same key for v1.
        // If they exist as a nested field we read them; otherwise use defaults.
        s.getGoals().then((goalsObj: any) => {
          const w = goalsObj && goalsObj.wellness ? goalsObj.wellness : null;
          return w
            ? { ...DEFAULT_WELLNESS_GOALS, ...w }
            : DEFAULT_WELLNESS_GOALS;
        }),
      ]);
      setEntry(e);
      setGoals(g);
      setLoading(false);
    }, [dateKey]);

    useEffect(() => { load(); }, [load]);

    const saveWellness = useCallback(async (partial: Partial<WellnessEntry>) => {
      const s = getStorage();
      const current = await s.getWellness(dateKey);
      const next: WellnessEntry = { ...current, ...partial, date: dateKey };
      await s.setWellness(dateKey, next);
      setEntry(next);
    }, [dateKey]);

    return { entry, goals, loading, saveWellness, reload: load };
  };
}

/**
 * Hook for wellness data across a date range.
 * Returns sorted entries for consumers (e.g., Trends or sparklines).
 */
export function createUseWellnessRange(Shared: SharedDependencies) {
  const { useState, useEffect, useCallback } = Shared;

  return function useWellnessRange(startDate: string, endDate: string) {
    const [entries, setEntries] = useState<WellnessEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
      const s = getStorage();
      setLoading(true);
      const results = await s.getWellnessRange(startDate, endDate);
      setEntries(results);
      setLoading(false);
    }, [startDate, endDate]);

    useEffect(() => { load(); }, [load]);

    return { entries, loading, reload: load };
  };
}

export type ExerciseSourceTab = 'all' | 'yuhonas' | 'custom' | 'wger' | 'api-ninjas';

/**
 * Unified exercise search hook. Fans out across:
 *   - custom exercises (local storage)
 *   - yuhonas catalog (lazy-loaded JSON, in-memory index)
 *   - wger live API (on non-empty query only)
 *   - api-ninjas (on non-empty query, requires manifest key)
 *
 * Dedups across sources by normalized name + equipment, preferring:
 *   custom > yuhonas > wger > api-ninjas.
 */
export function createUseExerciseSearch(Shared: SharedDependencies) {
  const { useState, useCallback, useRef, useEffect } = Shared;

  return function useExerciseSearch() {
    const [query, setQueryState] = useState('');
    const [results, setResults] = useState<Exercise[]>([]);
    const [catalogReady, setCatalogReady] = useState(false);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [recents, setRecents] = useState<Exercise[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [frequency, setFrequency] = useState<Record<string, number>>({});
    const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
    const [searching, setSearching] = useState(false);
    const [source, setSource] = useState<ExerciseSourceTab>('all');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchIdRef = useRef(0);

    useEffect(() => {
      const s = getStorage();
      s.getRecentExercises().then(setRecents);
      s.getExerciseFavorites().then(setFavorites);
      s.getExerciseFrequency().then(setFrequency);
      s.getCustomExercises().then(setCustomExercises);
      loadCatalog(s)
        .then(() => setCatalogReady(true))
        .catch(err => setCatalogError(err?.message ?? 'Failed to load exercise catalog'));
    }, []);

    const search = useCallback(async (q: string) => {
      const trimmed = q.trim();
      const thisSearchId = ++searchIdRef.current;
      setSearching(true);
      const all: Exercise[] = [];

      if (source === 'all' || source === 'custom') {
        const lower = trimmed.toLowerCase();
        const customs = trimmed
          ? customExercises.filter(ex =>
              ex.name.toLowerCase().includes(lower) ||
              ex.primaryMuscles.some(m => m.toLowerCase().includes(lower)) ||
              (ex.equipment ?? '').toLowerCase().includes(lower)
            )
          : customExercises.slice(0, 40);
        all.push(...customs);
      }

      if ((source === 'all' || source === 'yuhonas') && catalogReady) {
        all.push(...searchLocalCatalog(trimmed, 40));
      }

      if (trimmed) {
        const remoteTasks: Array<Promise<Exercise[]>> = [];
        if (source === 'all' || source === 'wger') {
          remoteTasks.push(
            searchWger(trimmed).catch(err => { console.warn('wger search failed:', err?.message); return []; })
          );
        }
        if (source === 'all' || source === 'api-ninjas') {
          remoteTasks.push((async () => {
            try {
              const apiKey = await getApi().core.getApiKey('api-ninjas');
              if (!apiKey) return [];
              return await searchApiNinjas(trimmed, apiKey);
            } catch (err: any) {
              console.warn('api-ninjas search failed:', err?.message); return [];
            }
          })());
        }
        if (remoteTasks.length) {
          const settled = await Promise.allSettled(remoteTasks);
          for (const r of settled) if (r.status === 'fulfilled') all.push(...r.value);
        }
      }

      if (thisSearchId !== searchIdRef.current) return;

      const priority: Record<string, number> = { custom: 4, yuhonas: 3, wger: 2, 'api-ninjas': 1 };
      const seen = new Map<string, Exercise>();
      for (const ex of all) {
        const key = `${ex.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${(ex.equipment ?? '').toLowerCase()}`;
        const existing = seen.get(key);
        if (!existing || (priority[ex.source] ?? 0) > (priority[existing.source] ?? 0)) {
          seen.set(key, ex);
        }
      }
      setResults(Array.from(seen.values()));
      setSearching(false);
    }, [source, catalogReady, customExercises]);

    const setQuery = useCallback((q: string) => {
      setQueryState(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(q), 250);
    }, [search]);

    useEffect(() => { search(query); }, [source, catalogReady, customExercises.length]);

    const toggleFavorite = useCallback(async (exerciseId: string) => {
      await getStorage().toggleExerciseFavorite(exerciseId);
      const next = await getStorage().getExerciseFavorites();
      setFavorites(next);
    }, []);

    const trackUsage = useCallback(async (exercise: Exercise) => {
      await getStorage().trackExerciseUsage(exercise);
      const [r, f] = await Promise.all([
        getStorage().getRecentExercises(),
        getStorage().getExerciseFrequency(),
      ]);
      setRecents(r);
      setFrequency(f);
    }, []);

    const refreshCustomExercises = useCallback(async () => {
      const list = await getStorage().getCustomExercises();
      setCustomExercises(list);
    }, []);

    return {
      query, setQuery, results, searching, catalogReady, catalogError,
      source, setSource, recents, favorites, frequency, customExercises,
      toggleFavorite, trackUsage, refreshCustomExercises,
    };
  };
}
