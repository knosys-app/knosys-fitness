import type { SharedDependencies, Goals } from '../types';
import { formatCal, formatG } from '../utils/nutrients';

export function createMacroProgress(Shared: SharedDependencies) {
  const { React, cn } = Shared;

  function MacroBar({ label, current, goal, color, unit, delay }: {
    label: string; current: number; goal: number; color: string; unit: string; delay: number;
  }) {
    const [animated, setAnimated] = React.useState(false);
    React.useEffect(() => {
      const t = setTimeout(() => setAnimated(true), delay);
      return () => clearTimeout(t);
    }, [delay]);

    const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
    const over = current > goal;

    return React.createElement('div', { className: 'space-y-1' },
      React.createElement('div', { className: 'flex justify-between text-xs' },
        React.createElement('span', { className: 'text-muted-foreground' }, label),
        React.createElement('span', { className: cn('font-medium', over && 'text-destructive') },
          `${Math.round(current)}${unit} / ${Math.round(goal)}${unit}`),
      ),
      React.createElement('div', {
        style: { height: '8px', width: '100%', overflow: 'hidden', borderRadius: '9999px', backgroundColor: 'hsl(var(--secondary))' },
      },
        React.createElement('div', {
          style: {
            height: '100%',
            borderRadius: '9999px',
            width: animated ? `${pct}%` : '0%',
            backgroundColor: over ? 'hsl(var(--destructive))' : color,
            transition: 'width 800ms cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }),
      ),
    );
  }

  return function MacroProgress({ calories, protein_g, carbs_g, fat_g, goals }: {
    calories: number; protein_g: number; carbs_g: number; fat_g: number; goals: Goals;
  }) {
    const [ringAnimated, setRingAnimated] = React.useState(false);
    const [fadeIn, setFadeIn] = React.useState(false);

    React.useEffect(() => {
      requestAnimationFrame(() => {
        setFadeIn(true);
        setTimeout(() => setRingAnimated(true), 100);
      });
    }, []);

    const calPct = goals.calories > 0 ? Math.min((calories / goals.calories) * 100, 100) : 0;
    const remaining = Math.max(0, goals.calories - calories);
    const circumference = 2 * Math.PI * 34;

    return React.createElement('div', {
      className: 'space-y-3',
      style: { opacity: fadeIn ? 1 : 0, transform: fadeIn ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 400ms ease, transform 400ms ease' },
    },
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
              strokeDasharray: `${circumference}`,
              strokeDashoffset: ringAnimated ? `${circumference * (1 - calPct / 100)}` : `${circumference}`,
              strokeLinecap: 'round',
              transform: 'rotate(-90 40 40)',
              style: { transition: 'stroke-dashoffset 1000ms cubic-bezier(0.4, 0, 0.2, 1)' },
            }),
          ),
          React.createElement('div', { className: 'absolute text-center' },
            React.createElement('div', { className: 'text-lg font-bold leading-tight' }, formatCal(remaining)),
            React.createElement('div', {
              style: { fontSize: '10px', color: 'hsl(var(--muted-foreground))' },
            }, 'remaining'),
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

      // Macro bars — staggered animation
      React.createElement(MacroBar, { label: 'Protein', current: protein_g, goal: goals.protein_g, color: '#3b82f6', unit: 'g', delay: 300 }),
      React.createElement(MacroBar, { label: 'Carbs', current: carbs_g, goal: goals.carbs_g, color: '#f59e0b', unit: 'g', delay: 450 }),
      React.createElement(MacroBar, { label: 'Fat', current: fat_g, goal: goals.fat_g, color: '#ef4444', unit: 'g', delay: 600 }),
    );
  };
}
