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

    const remaining = Math.max(0, goals.calories - calories);
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const overBudget = calories > goals.calories;

    // Macro calorie contributions
    const proteinCal = protein_g * 4;
    const carbsCal = carbs_g * 4;
    const fatCal = fat_g * 9;

    // Each macro as a fraction of the goal (capped so total doesn't exceed 100%)
    const goalCal = goals.calories || 1;
    const segments = [
      { color: '#3b82f6', cal: proteinCal, delay: 100 },  // protein - blue
      { color: '#f59e0b', cal: carbsCal, delay: 250 },     // carbs - amber
      { color: '#ef4444', cal: fatCal, delay: 400 },       // fat - red
    ];

    // Compute arc lengths, capping total at 100%
    let usedFraction = 0;
    const arcs = segments.map(seg => {
      const fraction = Math.min(seg.cal / goalCal, 1 - usedFraction);
      const startFraction = usedFraction;
      usedFraction += fraction;
      return { ...seg, fraction, startFraction };
    });

    return React.createElement('div', {
      className: 'space-y-3',
      style: { opacity: fadeIn ? 1 : 0, transform: fadeIn ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 400ms ease, transform 400ms ease' },
    },
      // Calorie ring summary
      React.createElement('div', { className: 'flex items-center gap-4' },
        React.createElement('div', { className: 'relative flex items-center justify-center' },
          React.createElement('svg', { width: 80, height: 80, viewBox: '0 0 80 80' },
            // Background ring
            React.createElement('circle', {
              cx: 40, cy: 40, r: radius, fill: 'none',
              stroke: 'hsl(var(--secondary))', strokeWidth: 6,
            }),
            // Over budget: single destructive ring
            overBudget
              ? React.createElement('circle', {
                  cx: 40, cy: 40, r: radius, fill: 'none',
                  stroke: 'hsl(var(--destructive))',
                  strokeWidth: 6,
                  strokeDasharray: `${circumference}`,
                  strokeDashoffset: ringAnimated ? '0' : `${circumference}`,
                  strokeLinecap: 'round',
                  transform: 'rotate(-90 40 40)',
                  style: { transition: 'stroke-dashoffset 1000ms cubic-bezier(0.4, 0, 0.2, 1)' },
                })
              // Normal: three macro-colored arcs
              : arcs.map((arc, i) =>
                  arc.fraction > 0 ? React.createElement('circle', {
                    key: i,
                    cx: 40, cy: 40, r: radius, fill: 'none',
                    stroke: arc.color,
                    strokeWidth: 6,
                    strokeDasharray: `${arc.fraction * circumference} ${circumference}`,
                    strokeDashoffset: ringAnimated ? `${-arc.startFraction * circumference}` : `${circumference}`,
                    strokeLinecap: i === arcs.length - 1 && usedFraction < 0.98 ? 'round' : 'butt',
                    transform: 'rotate(-90 40 40)',
                    style: { transition: `stroke-dashoffset ${800 + i * 200}ms cubic-bezier(0.4, 0, 0.2, 1) ${arc.delay}ms` },
                  }) : null
                ),
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
