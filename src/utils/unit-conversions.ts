export type ServingUnit = 'g' | 'mg' | 'oz' | 'lb' | 'ml' | 'l' | 'fl_oz' | 'cup' | 'tbsp' | 'tsp';

export interface UnitInfo {
  label: string;
  short: string;
  toGrams: number; // multiply by this to get gram-equivalent
  category: 'weight' | 'volume';
}

export const UNITS: Record<ServingUnit, UnitInfo> = {
  g:     { label: 'Grams',          short: 'g',     toGrams: 1,        category: 'weight' },
  mg:    { label: 'Milligrams',     short: 'mg',    toGrams: 0.001,    category: 'weight' },
  oz:    { label: 'Ounces',         short: 'oz',    toGrams: 28.3495,  category: 'weight' },
  lb:    { label: 'Pounds',         short: 'lb',    toGrams: 453.592,  category: 'weight' },
  ml:    { label: 'Milliliters',    short: 'ml',    toGrams: 1,        category: 'volume' },
  l:     { label: 'Liters',         short: 'L',     toGrams: 1000,     category: 'volume' },
  fl_oz: { label: 'Fluid Ounces',   short: 'fl oz', toGrams: 29.5735,  category: 'volume' },
  cup:   { label: 'Cups',           short: 'cup',   toGrams: 236.588,  category: 'volume' },
  tbsp:  { label: 'Tablespoons',    short: 'tbsp',  toGrams: 14.787,   category: 'volume' },
  tsp:   { label: 'Teaspoons',      short: 'tsp',   toGrams: 4.929,    category: 'volume' },
};

export const UNIT_OPTIONS: ServingUnit[] = ['g', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'ml', 'fl_oz', 'l', 'mg'];

/** Convert a value in the given unit to grams */
export function toGrams(value: number, unit: ServingUnit): number {
  return Math.round(value * UNITS[unit].toGrams * 100) / 100;
}

/** Convert grams to the given unit */
export function fromGrams(grams: number, unit: ServingUnit): number {
  return Math.round(grams / UNITS[unit].toGrams * 100) / 100;
}

/** Build a human-readable serving label */
export function servingLabel(value: number, unit: ServingUnit): string {
  const info = UNITS[unit];
  return `${value}${info.short}`;
}
