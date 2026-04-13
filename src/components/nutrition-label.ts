import type { SharedDependencies, NormalizedFood } from '../types';

interface NutrientRow {
  label: string;
  value: number | undefined;
  unit: string;
  dv?: number; // daily value for % calculation
  bold?: boolean;
  indent?: boolean;
}

// Reference Daily Values (FDA)
const DAILY_VALUES: Record<string, number> = {
  calories: 2000,
  fat_g: 78,
  saturated_fat_g: 20,
  cholesterol_mg: 300,
  sodium_mg: 2300,
  carbs_g: 275,
  fiber_g: 28,
  sugar_g: 50,
  protein_g: 50,
  vitamin_a_mcg: 900,
  vitamin_c_mg: 90,
  calcium_mg: 1300,
  iron_mg: 18,
  potassium_mg: 4700,
};

export function createNutritionLabel(Shared: SharedDependencies) {
  const { React, Separator, cn } = Shared;

  return function NutritionLabel({ food, servings }: { food: NormalizedFood; servings: number }) {
    const s = servings;

    const rows: NutrientRow[] = [
      { label: 'Calories', value: food.calories * s, unit: '', bold: true },
      { label: 'Total Fat', value: food.fat_g * s, unit: 'g', dv: DAILY_VALUES.fat_g, bold: true },
      { label: 'Saturated Fat', value: food.saturated_fat_g != null ? food.saturated_fat_g * s : undefined, unit: 'g', dv: DAILY_VALUES.saturated_fat_g, indent: true },
      { label: 'Cholesterol', value: food.cholesterol_mg != null ? food.cholesterol_mg * s : undefined, unit: 'mg', dv: DAILY_VALUES.cholesterol_mg, bold: true },
      { label: 'Sodium', value: food.sodium_mg != null ? food.sodium_mg * s : undefined, unit: 'mg', dv: DAILY_VALUES.sodium_mg, bold: true },
      { label: 'Total Carbohydrate', value: food.carbs_g * s, unit: 'g', dv: DAILY_VALUES.carbs_g, bold: true },
      { label: 'Dietary Fiber', value: food.fiber_g != null ? food.fiber_g * s : undefined, unit: 'g', dv: DAILY_VALUES.fiber_g, indent: true },
      { label: 'Total Sugars', value: food.sugar_g != null ? food.sugar_g * s : undefined, unit: 'g', indent: true },
      { label: 'Protein', value: food.protein_g * s, unit: 'g', dv: DAILY_VALUES.protein_g, bold: true },
    ];

    const microRows: NutrientRow[] = [
      { label: 'Vitamin A', value: food.vitamin_a_mcg != null ? food.vitamin_a_mcg * s : undefined, unit: 'mcg', dv: DAILY_VALUES.vitamin_a_mcg },
      { label: 'Vitamin C', value: food.vitamin_c_mg != null ? food.vitamin_c_mg * s : undefined, unit: 'mg', dv: DAILY_VALUES.vitamin_c_mg },
      { label: 'Calcium', value: food.calcium_mg != null ? food.calcium_mg * s : undefined, unit: 'mg', dv: DAILY_VALUES.calcium_mg },
      { label: 'Iron', value: food.iron_mg != null ? food.iron_mg * s : undefined, unit: 'mg', dv: DAILY_VALUES.iron_mg },
      { label: 'Potassium', value: food.potassium_mg != null ? food.potassium_mg * s : undefined, unit: 'mg', dv: DAILY_VALUES.potassium_mg },
    ].filter(r => r.value != null);

    function Row({ row }: { row: NutrientRow }) {
      if (row.value == null) return null;
      const dvPct = row.dv ? Math.round((row.value / row.dv) * 100) : null;
      const valStr = row.unit === '' ? Math.round(row.value) : `${Math.round(row.value * 10) / 10}${row.unit}`;

      return React.createElement('div', {
        className: cn(
          'flex justify-between py-0.5 text-xs',
          row.indent && 'pl-4',
        ),
      },
        React.createElement('span', { className: cn(row.bold && 'font-semibold') },
          `${row.label} `, React.createElement('span', { className: 'font-normal' }, valStr)),
        dvPct != null && React.createElement('span', { className: 'font-semibold' }, `${dvPct}%`),
      );
    }

    return React.createElement('div', { className: 'border rounded-md p-3 space-y-0.5 text-xs' },
      React.createElement('div', { className: 'text-sm font-bold mb-1' }, 'Nutrition Facts'),
      React.createElement('div', { className: 'text-[10px] text-muted-foreground mb-1' },
        `${servings} serving${servings !== 1 ? 's' : ''} (${Math.round(food.serving_size_g * servings)}g)`),
      React.createElement('div', { className: 'border-t-8 border-foreground pt-0.5' }),

      ...rows.filter(r => r.value != null).map((row, i) =>
        React.createElement(React.Fragment, { key: row.label },
          i > 0 && React.createElement('div', { className: 'border-t border-muted' }),
          React.createElement(Row, { row }),
        ),
      ),

      microRows.length > 0 && React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'border-t-4 border-foreground mt-1 pt-1' }),
        ...microRows.map((row, i) =>
          React.createElement(React.Fragment, { key: row.label },
            i > 0 && React.createElement('div', { className: 'border-t border-muted' }),
            React.createElement(Row, { row }),
          ),
        ),
      ),

      React.createElement('div', { className: 'border-t border-muted pt-1 mt-1 text-[10px] text-muted-foreground' },
        '* % Daily Value based on a 2,000 calorie diet'),
    );
  };
}
