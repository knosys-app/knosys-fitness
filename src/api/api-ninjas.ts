import type { Exercise } from '../types';

const BASE_URL = 'https://api.api-ninjas.com/v1/exercises';

interface ApiNinjasExercise {
  name: string;
  type: string;
  muscle: string;
  equipment: string;
  difficulty: string;
  instructions: string;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalize(raw: ApiNinjasExercise): Exercise {
  return {
    id: `api-ninjas:${slug(raw.name)}`,
    source: 'api-ninjas',
    name: raw.name,
    primaryMuscles: raw.muscle ? [raw.muscle] : [],
    secondaryMuscles: [],
    equipment: raw.equipment || undefined,
    category: raw.type === 'cardio' ? 'cardio' : 'strength',
    level: (raw.difficulty as Exercise['level']) ?? undefined,
    instructions: raw.instructions ? [raw.instructions] : [],
    images: [],
  };
}

export async function searchApiNinjas(query: string, apiKey: string): Promise<Exercise[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${BASE_URL}?name=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'X-Api-Key': apiKey } });
  if (!res.ok) throw new Error(`api-ninjas search failed: ${res.status}`);
  const data = await res.json() as ApiNinjasExercise[];
  return data.map(normalize);
}
