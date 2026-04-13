import type { SharedDependencies, DailySummary, Goals, WaterEntry, WeightEntry } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey } from '../utils/date-helpers';
import { formatCal, formatG } from '../utils/nutrients';

export function createDashboardWidgets(Shared: SharedDependencies) {
  const { React, lucideIcons, cn, dateFns, recharts } = Shared;
  const { Utensils, Droplets, Scale, Flame, TrendingDown, TrendingUp, Minus: MinusIcon } = lucideIcons;
  const { LineChart, Line, ResponsiveContainer } = recharts;

  // =========================================================================
  // Nutrition Widget — daily calorie ring + macros summary
  // =========================================================================
  function NutritionWidget() {
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

    return React.createElement('div', { className: 'flex items-center gap-3' },
      React.createElement('div', { className: 'relative flex items-center justify-center shrink-0' },
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
          React.createElement('div', { className: 'text-xs font-bold tabular-nums' }, formatCal(remaining)),
        ),
      ),
      React.createElement('div', { className: 'text-xs space-y-0.5 min-w-0 flex-1' },
        React.createElement('div', { className: 'tabular-nums' }, `${formatCal(summary.calories)} / ${formatCal(goals.calories)} cal`),
        React.createElement('div', { className: 'text-muted-foreground tabular-nums truncate' },
          `P ${formatG(summary.protein_g)} · C ${formatG(summary.carbs_g)} · F ${formatG(summary.fat_g)}`),
      ),
    );
  }

  // =========================================================================
  // Water Widget — today's water progress
  // =========================================================================
  function WaterWidget() {
    const [water, setWater] = React.useState<WaterEntry>({ ml: 0 });
    const [goals, setGoals] = React.useState<Goals>({ calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, water_ml: 2500 });

    React.useEffect(() => {
      const s = getStorage();
      const today = toDateKey(new Date());
      Promise.all([s.getWater(today), s.getGoals()]).then(([w, g]) => {
        setWater(w);
        setGoals(g);
      });
    }, []);

    const pct = goals.water_ml > 0 ? Math.min((water.ml / goals.water_ml) * 100, 100) : 0;

    return React.createElement('div', { className: 'space-y-2' },
      React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement('div', { className: 'flex items-center gap-1.5' },
          React.createElement(Droplets, { className: 'h-3.5 w-3.5 text-blue-500' }),
          React.createElement('span', { className: 'text-xs font-semibold' }, 'Water'),
        ),
        React.createElement('span', { className: 'text-xs text-muted-foreground tabular-nums' },
          `${water.ml} / ${goals.water_ml} ml`),
      ),
      React.createElement('div', {
        style: { height: '6px', width: '100%', overflow: 'hidden', borderRadius: '9999px', backgroundColor: 'hsl(var(--secondary))' },
      },
        React.createElement('div', {
          style: {
            height: '100%', borderRadius: '9999px', backgroundColor: 'hsl(217, 91%, 60%)',
            transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            width: `${pct}%`,
          },
        }),
      ),
    );
  }

  // =========================================================================
  // Weight Widget — latest weight + 14-day sparkline
  // =========================================================================
  function WeightWidget() {
    const [data, setData] = React.useState<{ date: string; weight_kg: number }[]>([]);

    React.useEffect(() => {
      const s = getStorage();
      const end = toDateKey(new Date());
      const start = toDateKey(dateFns.subDays(new Date(), 14));
      s.getWeightRange(start, end).then(setData);
    }, []);

    if (data.length === 0) {
      return React.createElement('div', { className: 'flex items-center gap-2 text-xs text-muted-foreground' },
        React.createElement(Scale, { className: 'h-3.5 w-3.5' }),
        React.createElement('span', null, 'No weigh-ins yet'),
      );
    }

    const latest = data[data.length - 1].weight_kg;
    const oldest = data[0].weight_kg;
    const trend = latest - oldest;
    const TrendIcon = trend < -0.05 ? TrendingDown : trend > 0.05 ? TrendingUp : MinusIcon;
    const trendColor = trend < -0.05 ? '#10b981' : trend > 0.05 ? '#ef4444' : 'hsl(var(--muted-foreground))';

    const sparklineData = data.map(d => ({ value: d.weight_kg }));

    return React.createElement('div', { className: 'flex items-center gap-3' },
      React.createElement('div', { className: 'flex-1 min-w-0' },
        React.createElement('div', { className: 'flex items-center gap-1.5 mb-0.5' },
          React.createElement(Scale, { className: 'h-3.5 w-3.5 text-muted-foreground' }),
          React.createElement('span', { className: 'text-xs font-semibold' }, 'Weight'),
        ),
        React.createElement('div', { className: 'flex items-baseline gap-1.5' },
          React.createElement('span', { className: 'text-lg font-bold tabular-nums' }, latest.toFixed(1)),
          React.createElement('span', { className: 'text-xs text-muted-foreground' }, 'kg'),
          data.length > 1 && React.createElement('span', {
            className: 'text-[10px] tabular-nums flex items-center gap-0.5',
            style: { color: trendColor },
          },
            React.createElement(TrendIcon, { className: 'h-2.5 w-2.5' }),
            `${trend > 0 ? '+' : ''}${trend.toFixed(1)}`,
          ),
        ),
      ),
      data.length >= 2 && React.createElement('div', { style: { width: '80px', height: '32px', flexShrink: 0 } },
        React.createElement(ResponsiveContainer, { width: '100%', height: '100%' },
          React.createElement(LineChart, { data: sparklineData, margin: { top: 2, right: 2, bottom: 2, left: 2 } },
            React.createElement(Line, {
              type: 'monotone', dataKey: 'value',
              stroke: 'hsl(var(--primary))', strokeWidth: 1.5,
              dot: false, animationDuration: 600,
            }),
          ),
        ),
      ),
    );
  }

  // =========================================================================
  // Streak Widget — consecutive days with logging
  // =========================================================================
  function StreakWidget() {
    const [streak, setStreak] = React.useState<number | null>(null);

    React.useEffect(() => {
      (async () => {
        const s = getStorage();
        const keys = await (window as any).electronAPI?.pluginsStorageKeys?.('knosys-fitness') ?? [];
        // Collect all dates with any activity (food log, exercise, weight, water)
        const dates = new Set<string>();
        for (const key of keys as string[]) {
          const m = key.match(/^(?:log|exercise|weight|water):(\d{4}-\d{2}-\d{2})/);
          if (m) dates.add(m[1]);
        }
        // Count consecutive days ending today
        let count = 0;
        for (let i = 0; ; i++) {
          const d = toDateKey(dateFns.subDays(new Date(), i));
          if (dates.has(d)) count++;
          else break;
        }
        setStreak(count);
      })();
    }, []);

    if (streak === null) return null;

    return React.createElement('div', { className: 'flex items-center justify-between' },
      React.createElement('div', { className: 'flex items-center gap-1.5' },
        React.createElement(Flame, { className: 'h-3.5 w-3.5 text-orange-500' }),
        React.createElement('span', { className: 'text-xs font-semibold' }, 'Streak'),
      ),
      React.createElement('div', { className: 'flex items-baseline gap-1' },
        React.createElement('span', { className: 'text-lg font-bold tabular-nums' }, streak),
        React.createElement('span', { className: 'text-xs text-muted-foreground' },
          streak === 1 ? 'day' : 'days',
        ),
      ),
    );
  }

  return { NutritionWidget, WaterWidget, WeightWidget, StreakWidget };
}
