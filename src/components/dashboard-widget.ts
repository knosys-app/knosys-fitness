import type { SharedDependencies, DailySummary, Goals } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey } from '../utils/date-helpers';
import { formatCal, formatG } from '../utils/nutrients';

export function createDashboardWidget(Shared: SharedDependencies) {
  const { React, Card, CardContent, CardHeader, CardTitle, lucideIcons, cn } = Shared;
  const { Utensils } = lucideIcons;

  return function FitnessWidget() {
    const [summary, setSummary] = React.useState<DailySummary | null>(null);
    const [goals, setGoals] = React.useState<Goals>({ calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, water_ml: 2500 });

    React.useEffect(() => {
      const s = getStorage();
      const today = toDateKey(new Date());
      Promise.all([s.getDailySummary(today), s.getGoals()]).then(([sum, g]) => {
        setSummary(sum);
        setGoals(g);
      });
    }, []);

    if (!summary) return null;

    const calPct = goals.calories > 0 ? Math.min((summary.calories / goals.calories) * 100, 100) : 0;
    const remaining = Math.max(0, goals.calories - summary.calories);

    return React.createElement('div', { className: 'space-y-3' },
      // Calorie ring
      React.createElement('div', { className: 'flex items-center gap-3' },
        React.createElement('div', { className: 'relative flex items-center justify-center' },
          React.createElement('svg', { width: 56, height: 56, viewBox: '0 0 56 56' },
            React.createElement('circle', {
              cx: 28, cy: 28, r: 23, fill: 'none',
              stroke: 'hsl(var(--secondary))', strokeWidth: 5,
            }),
            React.createElement('circle', {
              cx: 28, cy: 28, r: 23, fill: 'none',
              stroke: 'hsl(var(--primary))', strokeWidth: 5,
              strokeDasharray: `${2 * Math.PI * 23}`,
              strokeDashoffset: `${2 * Math.PI * 23 * (1 - calPct / 100)}`,
              strokeLinecap: 'round',
              transform: 'rotate(-90 28 28)',
            }),
          ),
          React.createElement('div', { className: 'absolute text-center' },
            React.createElement('div', { className: 'text-xs font-bold' }, formatCal(remaining)),
          ),
        ),
        React.createElement('div', { className: 'text-xs space-y-0.5' },
          React.createElement('div', null, `${formatCal(summary.calories)} / ${formatCal(goals.calories)} cal`),
          React.createElement('div', { className: 'text-muted-foreground' },
            `P:${formatG(summary.protein_g)} C:${formatG(summary.carbs_g)} F:${formatG(summary.fat_g)}`),
        ),
      ),
    );
  };
}
