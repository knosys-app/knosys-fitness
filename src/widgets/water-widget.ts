import type { SharedDependencies, WaterEntry, Goals } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey } from '../utils/date-helpers';
import { createDataBar, createNumericReadout } from '../design-system/primitives';

/**
 * Water widget — DataBar (monochromatic variant) + big numeric + quick-add buttons.
 */
export function createWaterWidget(Shared: SharedDependencies) {
  const { React, lucideIcons } = Shared;
  const { Droplets, Plus } = lucideIcons;

  const DataBar = createDataBar(Shared);
  const NumericReadout = createNumericReadout(Shared);

  return function WaterWidget() {
    const [water, setWater] = React.useState<WaterEntry>({ ml: 0 });
    const [goals, setGoals] = React.useState<Goals>({
      calories: 2000,
      protein_g: 150,
      carbs_g: 250,
      fat_g: 65,
      water_ml: 2500,
    });

    const load = React.useCallback(async () => {
      const s = getStorage();
      const today = toDateKey(new Date());
      const [w, g] = await Promise.all([s.getWater(today), s.getGoals()]);
      setWater(w);
      setGoals(g);
    }, []);

    React.useEffect(() => {
      load();
    }, [load]);

    const addWater = async (ml: number) => {
      const s = getStorage();
      const today = toDateKey(new Date());
      const next = { ml: water.ml + ml };
      await s.setWater(today, next);
      setWater(next);
    };

    return React.createElement(
      'div',
      {
        className: 'knosys-fitness-root knosys-fitness-widget',
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minWidth: 220,
        },
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            },
          },
          React.createElement(Droplets, {
            style: {
              width: 12,
              height: 12,
              color: 'var(--knf-hydration)',
            },
          }),
          React.createElement(
            'span',
            {
              className: 'knf-eyebrow',
              style: { fontSize: 10 },
            },
            'HYDRATION',
          ),
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'baseline',
              gap: 3,
            },
          },
          React.createElement(NumericReadout, {
            value: water.ml,
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
            `/ ${goals.water_ml} ml`,
          ),
        ),
      ),
      React.createElement(DataBar, {
        value: water.ml,
        max: goals.water_ml,
        accent: 'hydration',
        height: 4,
      }),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            gap: 6,
            marginTop: 2,
          },
        },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => addWater(250),
            style: quickAddStyle(),
          },
          React.createElement(Plus, { style: { width: 10, height: 10 } }),
          '250',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => addWater(500),
            style: quickAddStyle(),
          },
          React.createElement(Plus, { style: { width: 10, height: 10 } }),
          '500',
        ),
      ),
    );
  };
}

function quickAddStyle(): any {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '3px 8px',
    fontSize: 10,
    fontFamily: 'var(--knf-font-mono)',
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--knf-ink-2)',
    background: 'var(--knf-surface)',
    border: '1px solid var(--knf-hairline)',
    borderRadius: 'var(--knf-radius-pill)',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'border-color var(--knf-duration-1) var(--knf-ease)',
  };
}
