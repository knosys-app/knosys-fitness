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
            transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }),
      ),
    );
  }

  return function MacroProgress({ calories, protein_g, carbs_g, fat_g, goals }: {
    calories: number; protein_g: number; carbs_g: number; fat_g: number; goals: Goals;
  }) {
    const [fadeIn, setFadeIn] = React.useState(false);
    // Track which arcs have animated (0 = none, 1 = protein, 2 = +carbs, 3 = +fat)
    const [animatedCount, setAnimatedCount] = React.useState(0);

    React.useEffect(() => {
      requestAnimationFrame(() => {
        setFadeIn(true);
        // Stagger each arc sequentially so only one animates at a time
        setTimeout(() => setAnimatedCount(1), 150);
        setTimeout(() => setAnimatedCount(2), 650);
        setTimeout(() => setAnimatedCount(3), 1100);
      });
    }, []);

    const remaining = Math.max(0, goals.calories - calories);
    const radius = 44;
    const svgSize = 104;
    const center = svgSize / 2;
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
      style: { opacity: fadeIn ? 1 : 0, transform: fadeIn ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1), transform 400ms cubic-bezier(0.4, 0, 0.2, 1)' },
    },
      // Calorie ring summary
      React.createElement('div', { className: 'flex items-center gap-4' },
        React.createElement('div', { className: 'relative flex items-center justify-center' },
          React.createElement('svg', { width: svgSize, height: svgSize, viewBox: `0 0 ${svgSize} ${svgSize}` },
            // Background ring
            React.createElement('circle', {
              cx: center, cy: center, r: radius, fill: 'none',
              stroke: 'hsl(var(--secondary))', strokeWidth: 7,
            }),
            // Over budget: single destructive ring
            overBudget
              ? React.createElement('circle', {
                  cx: center, cy: center, r: radius, fill: 'none',
                  stroke: 'hsl(var(--destructive))',
                  strokeWidth: 7,
                  strokeDasharray: `${circumference}`,
                  strokeDashoffset: animatedCount > 0 ? '0' : `${circumference}`,
                  strokeLinecap: 'round',
                  transform: `rotate(-90 ${center} ${center})`,
                  style: { transition: 'stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)' },
                })
              // Normal: three macro-colored arcs — each grows sequentially
              : arcs.map((arc, i) => {
                  if (arc.fraction <= 0) return null;
                  const isAnimated = animatedCount > i;
                  const arcLen = arc.fraction * circumference;
                  const rotationDeg = -90 + arc.startFraction * 360;
                  return React.createElement('circle', {
                    key: i,
                    cx: center, cy: center, r: radius, fill: 'none',
                    stroke: arc.color,
                    strokeWidth: 7,
                    strokeDasharray: isAnimated
                      ? `${arcLen} ${circumference - arcLen}`
                      : `0 ${circumference}`,
                    strokeLinecap: 'butt',
                    transform: `rotate(${rotationDeg} ${center} ${center})`,
                    style: {
                      opacity: isAnimated ? 1 : 0,
                      transition: 'stroke-dasharray 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 0ms',
                    },
                  });
                }),
          ),
          React.createElement('div', { className: 'absolute text-center', style: { pointerEvents: 'none' } },
            overBudget
              ? React.createElement(React.Fragment, null,
                  React.createElement('div', {
                    className: 'text-xl font-bold leading-none tabular-nums',
                    style: { color: 'hsl(var(--destructive))' },
                  }, `+${formatCal(calories - goals.calories)}`),
                  React.createElement('div', {
                    style: { fontSize: '9px', color: 'hsl(var(--destructive))', marginTop: '2px', letterSpacing: '0.03em' },
                  }, 'OVER'),
                )
              : React.createElement(React.Fragment, null,
                  React.createElement('div', {
                    className: 'text-2xl font-bold leading-none tabular-nums',
                  }, formatCal(remaining)),
                  React.createElement('div', {
                    style: { fontSize: '9px', color: 'hsl(var(--muted-foreground))', marginTop: '3px', letterSpacing: '0.05em', textTransform: 'uppercase' },
                  }, 'remaining'),
                ),
          ),
        ),
        React.createElement('div', { className: 'flex-1 space-y-1 text-sm' },
          React.createElement('div', { className: 'flex justify-between' },
            React.createElement('span', { className: 'text-muted-foreground' }, 'Goal'),
            React.createElement('span', { className: 'tabular-nums' }, formatCal(goals.calories)),
          ),
          React.createElement('div', { className: 'flex justify-between' },
            React.createElement('span', { className: 'text-muted-foreground' }, 'Food'),
            React.createElement('span', { className: 'tabular-nums' }, formatCal(calories)),
          ),
          React.createElement('div', { className: 'flex justify-between font-medium' },
            React.createElement('span', { className: 'text-muted-foreground' }, 'Remaining'),
            React.createElement('span', {
              className: cn('tabular-nums', overBudget && 'text-destructive'),
            }, overBudget ? `−${formatCal(calories - goals.calories)}` : formatCal(remaining)),
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
