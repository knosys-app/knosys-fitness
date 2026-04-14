import type { SharedDependencies, NormalizedFood } from '../types';

interface NutrientRow {
  label: string;
  value: number | undefined;
  unit: string;
  dv?: number;
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

/**
 * NutritionLabel — signature polish of the expanded nutrition card.
 * Dense JetBrains Mono tabular layout with chartreuse accent stripe.
 */
export function createNutritionLabel(Shared: SharedDependencies) {
  const { React, cn } = Shared;

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
      const valStr = row.unit === '' ? String(Math.round(row.value)) : `${Math.round(row.value * 10) / 10}${row.unit}`;
      return React.createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          padding: '3px 0',
          fontSize: 11,
          fontFamily: 'var(--knf-font-mono)',
          fontVariantNumeric: 'tabular-nums',
          paddingLeft: row.indent ? 12 : 0,
        },
      },
        React.createElement('span', { style: { color: 'var(--knf-ink)' } },
          React.createElement('span', {
            style: { fontWeight: row.bold ? 600 : 400 },
          }, row.label),
          ' ',
          React.createElement('span', { style: { fontWeight: 400, color: 'var(--knf-ink)' } }, valStr),
        ),
        dvPct != null
          ? React.createElement('span', {
              style: { fontWeight: 600, color: 'var(--knf-hero-ink)' },
            }, `${dvPct}%`)
          : null,
      );
    }

    return React.createElement('div', {
      style: {
        position: 'relative',
        background: 'var(--knf-surface)',
        border: '1px solid var(--knf-hairline)',
        borderRadius: 'var(--knf-radius-md)',
        padding: '12px 14px',
        overflow: 'hidden',
      },
    },
      // Chartreuse accent stripe (top)
      React.createElement('div', {
        'aria-hidden': true,
        style: {
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 3,
          background: 'var(--knf-hero)',
        },
      }),
      // Title
      React.createElement('div', {
        style: {
          fontFamily: 'var(--knf-font-display)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--knf-ink)',
          letterSpacing: '-0.01em',
          marginBottom: 2,
        },
      }, 'Nutrition Facts'),
      React.createElement('div', {
        style: {
          fontSize: 10,
          color: 'var(--knf-muted)',
          fontFamily: 'var(--knf-font-mono)',
          marginBottom: 6,
        },
      }, `${servings} serving${servings !== 1 ? 's' : ''} (${Math.round(food.serving_size_g * servings)}g)`),
      React.createElement('div', {
        style: {
          borderTop: '6px solid var(--knf-ink)',
          marginBottom: 2,
        },
      }),
      React.createElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        },
      },
        ...rows.filter(r => r.value != null).map((row, i) =>
          React.createElement(React.Fragment, { key: row.label },
            i > 0
              ? React.createElement('div', {
                  style: { borderTop: '1px solid var(--knf-hairline)' },
                })
              : null,
            React.createElement(Row, { row }),
          ),
        ),
      ),
      microRows.length > 0
        ? React.createElement(React.Fragment, null,
            React.createElement('div', {
              style: {
                borderTop: '3px solid var(--knf-ink)',
                marginTop: 6, marginBottom: 2,
              },
            }),
            React.createElement('div', {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
              },
            },
              ...microRows.map((row, i) =>
                React.createElement(React.Fragment, { key: row.label },
                  i > 0
                    ? React.createElement('div', {
                        style: { borderTop: '1px solid var(--knf-hairline)' },
                      })
                    : null,
                  React.createElement(Row, { row }),
                ),
              ),
            ),
          )
        : null,
      React.createElement('div', {
        style: {
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid var(--knf-hairline)',
          fontSize: 10,
          color: 'var(--knf-muted)',
          fontFamily: 'var(--knf-font-mono)',
          lineHeight: 1.4,
        },
      }, '* % Daily Value based on a 2,000 calorie diet'),
    );
  };
}
