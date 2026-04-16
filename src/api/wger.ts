import type { Exercise } from '../types';

const BASE_URL = 'https://wger.de/api/v2';
// Language=2 is English in wger.
const LANG = 2;

interface WgerMuscle { id: number; name: string; name_en?: string; is_front?: boolean }
interface WgerEquipment { id: number; name: string }
interface WgerCategory { id: number; name: string }
interface WgerTranslation { id: number; language: number; name: string; description?: string }
interface WgerImage { id: number; image: string; is_main?: boolean }
interface WgerExerciseInfo {
  id: number;
  uuid?: string;
  category: WgerCategory;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  equipment: WgerEquipment[];
  translations: WgerTranslation[];
  images?: WgerImage[];
}

function extractEnglishName(translations: WgerTranslation[]): string | undefined {
  return translations.find(t => t.language === LANG)?.name;
}

function extractInstructions(translations: WgerTranslation[]): string[] {
  const desc = translations.find(t => t.language === LANG)?.description;
  if (!desc) return [];
  // wger ships HTML; split on paragraph breaks and strip tags for display.
  return desc
    .replace(/<\/(p|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function muscleNames(muscles: WgerMuscle[]): string[] {
  return muscles.map(m => (m.name_en ?? m.name).toLowerCase());
}

function categorize(name: string): Exercise['category'] {
  const n = name.toLowerCase();
  if (n === 'cardio') return 'cardio';
  return 'strength';
}

export function normalizeWger(info: WgerExerciseInfo): Exercise | null {
  const name = extractEnglishName(info.translations);
  if (!name) return null;
  return {
    id: `wger:${info.id}`,
    source: 'wger',
    name,
    primaryMuscles: muscleNames(info.muscles),
    secondaryMuscles: muscleNames(info.muscles_secondary ?? []),
    equipment: info.equipment.map(e => e.name).join(', ') || undefined,
    category: categorize(info.category?.name ?? ''),
    instructions: extractInstructions(info.translations),
    images: (info.images ?? []).map(i => i.image),
  };
}

export async function searchWger(query: string, limit = 20): Promise<Exercise[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${BASE_URL}/exerciseinfo/?language=${LANG}&limit=${limit}&search=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`wger search failed: ${res.status}`);
  const data = await res.json() as { results: WgerExerciseInfo[] };
  return data.results
    .map(normalizeWger)
    .filter((e): e is Exercise => !!e);
}
