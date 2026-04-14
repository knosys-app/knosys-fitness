import type { SharedDependencies, DailySummary, Goals } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey } from '../utils/date-helpers';
import { formatCal } from '../utils/nutrients';
import { createMetricRing, createNumericReadout } from '../design-system/primitives';

/**
 * Small nutrition widget — metric ring (macros) + big kcal number.
 * Renders inside the monochromatic widget variant of the signature theme.
 */
export function createNutritionWidget(Shared: SharedDependencies) {
  const { React, lucideIcons } = Shared;
  const { Flame } = lucideIcons;

  const MetricRing = createMetricRing(Shared);
  const NumericReadout = createNumericReadout(Shared);

  return function NutritionWidget() {
    const [summary, setSummary] = React.useState<DailySummary | null>(null);
    const [goals, setGoals] = React.useState<Goals>({
      calories: 2000,
      protein_g: 150,
      carbs_g: 250,
      fat_g: 65,
      water_ml: 2500,
    });

    React.useEffect(() => {
      let alive = true;
      const s = getStorage();
      const today = toDateKey(new Date());
      Promise.all([s.getDailySummary(today), s.getGoals()]).then(
        ([sum, g]) => {
          if (alive) {
            setSummary(sum);
            setGoals(g);
          }
        },
      );
      return () => {
        alive = false;
      };
    }, []);

    if (!summary) {
      return React.createElement(
        'div',
        {
          className: 'knosys-fitness-root knosys-fitness-widget',
          style: {
            padding: 14,
            color: 'var(--knf-muted)',
            fontSize: 12,
          },
        },
        '…',
      );
    }

    const segments = [
      {
        value: summary.protein_g,
        max: goals.protein_g,
        color: 'protein' as const,
      },
      {
        value: summary.carbs_g,
        max: goals.carbs_g,
        color: 'carbs' as const,
      },
      {
        value: summary.fat_g,
        max: goals.fat_g,
        color: 'fat' as const,
      },
    ];

    return React.createElement(
      'div',
      {
        className: 'knosys-fitness-root knosys-fitness-widget',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          minWidth: 220,
        },
      },
      React.createElement(MetricRing, {
        segments,
        size: 60,
        animate: false,
        stagger: 0,
      }),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 0,
            flex: 1,
          },
        },
        React.createElement(
          'div',
          {
            className: 'knf-eyebrow',
            style: {
              fontSize: 10,
              letterSpacing: '0.14em',
            },
          },
          'EATEN TODAY',
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
            },
          },
          React.createElement(NumericReadout, {
            value: summary.calories,
            animate: false,
            style: {
              fontFamily: 'var(--knf-font-display)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--knf-ink)',
              lineHeight: 1,
            },
          }),
          React.createElement(
            'span',
            {
              style: {
                fontSize: 10,
                color: 'var(--knf-muted)',
                fontFamily: 'var(--knf-font-mono)',
              },
            },
            `/ ${formatCal(goals.calories)} kcal`,
          ),
        ),
        React.createElement(
          'div',
          {
            style: {
              fontSize: 10,
              color: 'var(--knf-muted)',
              fontFamily: 'var(--knf-font-mono)',
              fontVariantNumeric: 'tabular-nums',
            },
          },
          `P ${Math.round(summary.protein_g)} \u00B7 C ${Math.round(summary.carbs_g)} \u00B7 F ${Math.round(summary.fat_g)}`,
        ),
      ),
    );
  };
}
