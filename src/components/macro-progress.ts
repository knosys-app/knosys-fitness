import type { SharedDependencies, Goals, WaterEntry } from '../types';
import { formatCal } from '../utils/nutrients';
import {
  createMetricRing,
  createDataBar,
  createNumericReadout,
  createSemanticBadge,
} from '../design-system/primitives';
import { SIG_PALETTE } from '../theme/palette';

/**
 * MacroProgress — rebuilt on the signature design system.
 *
 * Composition:
 *   [ MetricRing (3 arcs)  ] [ Protein DataBar  ]
 *                            [ Carbs   DataBar  ]
 *                            [ Fat     DataBar  ]
 *   [ Goal / Food / Remaining summary ]
 *   [ Water   DataBar ]  (optional — pass water + goals.water_ml)
 */
export function createMacroProgress(Shared: SharedDependencies) {
  const { React } = Shared;

  const MetricRing = createMetricRing(Shared);
  const DataBar = createDataBar(Shared);
  const NumericReadout = createNumericReadout(Shared);
  const SemanticBadge = createSemanticBadge(Shared);

  // --- Helper components defined with the captured React ---
  function MacroRow({
    label,
    current,
    goal,
    accent,
  }: {
    label: string;
    current: number;
    goal: number;
    accent: 'protein' | 'carbs' | 'fat';
  }) {
    return React.createElement(DataBar, {
      label,
      value: current,
      max: goal,
      accent,
      showValue: true,
      formatValue: (v: number) => `${Math.round(v)}g`,
      height: 6,
    });
  }

  function SummaryCol({
    label,
    value,
    negative,
    signed,
  }: {
    label: string;
    value: number;
    negative?: boolean;
    signed?: boolean;
  }) {
    const display = signed && negative
      ? `\u2212${formatCal(Math.abs(value))}`
      : formatCal(value);
    return React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0,
      },
    },
      React.createElement('span', {
        className: 'knf-eyebrow',
        style: {
          fontFamily: 'var(--knf-font-mono)',
          fontSize: 10,
          color: 'var(--knf-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontWeight: 500,
        },
      }, label),
      React.createElement('span', {
        style: {
          fontFamily: 'var(--knf-font-mono)',
          fontSize: 18,
          fontWeight: 600,
          color: negative ? 'var(--knf-alert)' : 'var(--knf-ink)',
          fontVariantNumeric: 'tabular-nums slashed-zero',
          lineHeight: 1,
        },
      }, display),
    );
  }

  return function MacroProgress({
    calories, protein_g, carbs_g, fat_g, goals, water,
  }: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    goals: Goals;
    water?: WaterEntry;
  }) {
    const overBudget = calories > goals.calories;
    const remaining = Math.max(0, goals.calories - calories);
    const overBy = Math.max(0, calories - goals.calories);

    // Convert macro grams to their calorie share
    const proteinCal = protein_g * 4;
    const carbsCal = carbs_g * 4;
    const fatCal = fat_g * 9;
    const goalCal = goals.calories || 1;

    const segments = [
      { value: proteinCal, max: goalCal, color: 'protein' as const, label: 'Protein' },
      { value: carbsCal, max: goalCal, color: 'carbs' as const, label: 'Carbs' },
      { value: fatCal, max: goalCal, color: 'fat' as const, label: 'Fat' },
    ];

    return React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      },
    },
      // Top row: ring + bars
      React.createElement('div', {
        style: {
          display: 'flex',
          gap: 20,
          alignItems: 'center',
        },
      },
        // Ring (no centerValue — we overlay our own animated NumericReadout)
        React.createElement('div', {
          style: { flexShrink: 0, position: 'relative', width: 144, height: 144 },
        },
          React.createElement(MetricRing, {
            segments,
            size: 144,
          }),
          // Center overlay with animated count-up
          React.createElement('div', {
            style: {
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              lineHeight: 1,
            },
          },
            React.createElement(NumericReadout, {
              value: overBudget ? overBy : remaining,
              format: (n: number) => overBudget ? `+${formatCal(n)}` : formatCal(n),
              style: {
                fontSize: 28,
                fontWeight: 700,
                color: overBudget ? SIG_PALETTE.alert : SIG_PALETTE.ink,
                fontFamily: 'var(--knf-font-mono)',
              },
            }),
            React.createElement('div', {
              style: {
                marginTop: 4,
                fontFamily: 'var(--knf-font-mono)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--knf-muted)',
                fontWeight: 500,
              },
            }, overBudget ? 'OVER' : 'LEFT'),
          ),
          overBudget
            ? React.createElement('div', {
                style: {
                  position: 'absolute',
                  top: -4,
                  right: -4,
                },
              },
                React.createElement(SemanticBadge, { accent: 'alert', variant: 'solid' }, 'OVER'),
              )
            : null,
        ),

        // Bars stack
        React.createElement('div', {
          style: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minWidth: 0,
          },
        },
          React.createElement(MacroRow, {
            label: 'Protein',
            current: protein_g,
            goal: goals.protein_g,
            accent: 'protein',
          }),
          React.createElement(MacroRow, {
            label: 'Carbs',
            current: carbs_g,
            goal: goals.carbs_g,
            accent: 'carbs',
          }),
          React.createElement(MacroRow, {
            label: 'Fat',
            current: fat_g,
            goal: goals.fat_g,
            accent: 'fat',
          }),
        ),
      ),

      // Calories summary row
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          paddingTop: 12,
          borderTop: '1px solid var(--knf-hairline)',
        },
      },
        React.createElement(SummaryCol, { label: 'Goal', value: goals.calories }),
        React.createElement(SummaryCol, { label: 'Food', value: calories }),
        React.createElement(SummaryCol, {
          label: 'Remaining',
          value: overBudget ? -overBy : remaining,
          negative: overBudget,
          signed: overBudget,
        }),
      ),

      // Optional water bar (hydration accent)
      water
        ? React.createElement('div', {
            style: {
              paddingTop: 12,
              borderTop: '1px solid var(--knf-hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            },
          },
            React.createElement('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontSize: 12,
              },
            },
              React.createElement('span', {
                style: { color: 'var(--knf-muted)' },
              }, 'Water'),
              React.createElement('span', {
                style: {
                  fontFamily: 'var(--knf-font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--knf-ink)',
                  fontWeight: 500,
                },
              }, `${water.ml.toLocaleString()} / ${goals.water_ml.toLocaleString()} ml`),
            ),
            React.createElement(DataBar, {
              value: water.ml,
              max: goals.water_ml,
              accent: 'hydration',
              height: 6,
            }),
          )
        : null,
    );
  };
}
