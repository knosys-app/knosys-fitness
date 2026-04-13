import type { SharedDependencies, Goals } from '../types';
import { formatCal, formatG } from '../utils/nutrients';

export function createMacroProgress(Shared: SharedDependencies) {
  const { React, Progress, cn } = Shared;

  function MacroBar({ label, current, goal, color, unit }: {
    label: string; current: number; goal: number; color: string; unit: string;
  }) {
    const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
    const over = current > goal;

    return React.createElement('div', { className: 'space-y-1' },
      React.createElement('div', { className: 'flex justify-between text-xs' },
        React.createElement('span', { className: 'text-muted-foreground' }, label),
        React.createElement('span', { className: cn('font-medium', over && 'text-destructive') },
          `${Math.round(current)}${unit} / ${Math.round(goal)}${unit}`),
      ),
      React.createElement('div', { className: 'relative' },
        React.createElement('div', {
          className: 'h-2 w-full overflow-hidden rounded-full bg-secondary',
        },
          React.createElement('div', {
            className: cn('h-full rounded-full transition-all', over ? 'bg-destructive' : ''),
            style: { width: `${pct}%`, backgroundColor: over ? undefined : color },
          }),
        ),
      ),
    );
  }

  return function MacroProgress({ calories, protein_g, carbs_g, fat_g, goals }: {
    calories: number; protein_g: number; carbs_g: number; fat_g: number; goals: Goals;
  }) {
    const calPct = goals.calories > 0 ? Math.min((calories / goals.calories) * 100, 100) : 0;
    const remaining = Math.max(0, goals.calories - calories);

    return React.createElement('div', { className: 'space-y-3' },
      // Calorie ring summary
      React.createElement('div', { className: 'flex items-center gap-4' },
        React.createElement('div', { className: 'relative flex items-center justify-center' },
          React.createElement('svg', { width: 80, height: 80, viewBox: '0 0 80 80' },
            React.createElement('circle', {
              cx: 40, cy: 40, r: 34, fill: 'none',
              stroke: 'hsl(var(--secondary))', strokeWidth: 6,
            }),
            React.createElement('circle', {
              cx: 40, cy: 40, r: 34, fill: 'none',
              stroke: calories > goals.calories ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
              strokeWidth: 6,
              strokeDasharray: `${2 * Math.PI * 34}`,
              strokeDashoffset: `${2 * Math.PI * 34 * (1 - calPct / 100)}`,
              strokeLinecap: 'round',
              transform: 'rotate(-90 40 40)',
              className: 'transition-all duration-500',
            }),
          ),
          React.createElement('div', { className: 'absolute text-center' },
            React.createElement('div', { className: 'text-lg font-bold leading-tight' }, formatCal(remaining)),
            React.createElement('div', { className: 'text-[10px] text-muted-foreground' }, 'remaining'),
          ),
        ),
        React.createElement('div', { className: 'flex-1 space-y-1 text-sm' },
          React.createElement('div', { className: 'flex justify-between' },
            React.createElement('span', { className: 'text-muted-foreground' }, 'Base Goal'),
            React.createElement('span', null, formatCal(goals.calories)),
          ),
          React.createElement('div', { className: 'flex justify-between' },
            React.createElement('span', { className: 'text-muted-foreground' }, 'Food'),
            React.createElement('span', null, formatCal(calories)),
          ),
          React.createElement('div', { className: 'flex justify-between font-medium' },
            React.createElement('span', { className: 'text-muted-foreground' }, 'Remaining'),
            React.createElement('span', { className: cn(remaining < 0 && 'text-destructive') }, formatCal(remaining)),
          ),
        ),
      ),

      // Macro bars
      React.createElement(MacroBar, { label: 'Protein', current: protein_g, goal: goals.protein_g, color: '#3b82f6', unit: 'g' }),
      React.createElement(MacroBar, { label: 'Carbs', current: carbs_g, goal: goals.carbs_g, color: '#f59e0b', unit: 'g' }),
      React.createElement(MacroBar, { label: 'Fat', current: fat_g, goal: goals.fat_g, color: '#ef4444', unit: 'g' }),
    );
  };
}
