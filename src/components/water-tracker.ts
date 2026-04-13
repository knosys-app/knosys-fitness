import type { SharedDependencies, Goals, WaterEntry } from '../types';

export function createWaterTracker(Shared: SharedDependencies) {
  const { React, Card, CardContent, Button, Progress, lucideIcons, cn } = Shared;
  const { Droplets, Plus, Minus } = lucideIcons;

  const QUICK_ADD = [250, 500]; // ml

  return function WaterTracker({ water, goals, onAddWater, onSetWater }: {
    water: WaterEntry;
    goals: Goals;
    onAddWater: (ml: number) => void;
    onSetWater: (ml: number) => void;
  }) {
    const pct = goals.water_ml > 0 ? Math.min((water.ml / goals.water_ml) * 100, 100) : 0;
    const glasses = Math.round(water.ml / 250);

    return React.createElement(Card, null,
      React.createElement(CardContent, { className: 'p-4' },
        React.createElement('div', { className: 'flex items-center justify-between mb-3' },
          React.createElement('div', { className: 'flex items-center gap-2' },
            React.createElement(Droplets, { className: 'h-4 w-4 text-blue-500' }),
            React.createElement('span', { className: 'text-sm font-semibold' }, 'Water'),
          ),
          React.createElement('span', { className: 'text-sm text-muted-foreground' },
            `${water.ml} / ${goals.water_ml} ml`),
        ),

        React.createElement('div', { className: 'space-y-3' },
          React.createElement('div', { className: 'h-2 w-full overflow-hidden rounded-full bg-secondary' },
            React.createElement('div', {
              className: 'h-full rounded-full bg-blue-500 transition-all',
              style: { width: `${pct}%` },
            }),
          ),

          React.createElement('div', { className: 'flex items-center justify-between' },
            React.createElement('div', { className: 'flex gap-1' },
              ...QUICK_ADD.map(ml =>
                React.createElement(Button, {
                  key: ml, variant: 'outline', size: 'sm', className: 'h-7 text-xs',
                  onClick: () => onAddWater(ml),
                },
                  React.createElement(Plus, { className: 'h-3 w-3 mr-1' }),
                  `${ml}ml`,
                ),
              ),
            ),
            React.createElement(Button, {
              variant: 'ghost', size: 'sm', className: 'h-7 text-xs',
              onClick: () => onSetWater(Math.max(0, water.ml - 250)),
            },
              React.createElement(Minus, { className: 'h-3 w-3 mr-1' }),
              '250ml',
            ),
          ),
        ),
      ),
    );
  };
}
