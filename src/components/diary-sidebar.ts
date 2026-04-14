import type { SharedDependencies, Goals, WaterEntry, ExerciseLog as ExerciseLogType } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey } from '../utils/date-helpers';
import { formatCal } from '../utils/nutrients';
import { createMacroProgress } from './macro-progress';
import { createStatTile } from './stat-tile';

export function createDiarySidebar(Shared: SharedDependencies) {
  const { React, Card, CardContent, lucideIcons, dateFns, recharts, cn } = Shared;
  const { Droplets, Flame, Scale, Activity, TrendingDown, TrendingUp, Minus: MinusIcon } = lucideIcons;
  const { LineChart, Line, ResponsiveContainer } = recharts;

  const MacroProgress = createMacroProgress(Shared);
  const StatTile = createStatTile(Shared);

  return function DiarySidebar({ calories, protein_g, carbs_g, fat_g, goals, water, exercise }: {
    calories: number; protein_g: number; carbs_g: number; fat_g: number;
    goals: Goals; water: WaterEntry; exercise: ExerciseLogType;
  }) {
    const [weightLatest, setWeightLatest] = React.useState<number | null>(null);
    const [weightTrend, setWeightTrend] = React.useState<number>(0);
    const [weightSparkline, setWeightSparkline] = React.useState<{ value: number }[]>([]);
    const [streak, setStreak] = React.useState<number>(0);

    React.useEffect(() => {
      (async () => {
        const s = getStorage();
        const end = toDateKey(new Date());
        const start = toDateKey(dateFns.subDays(new Date(), 14));
        const range = await s.getWeightRange(start, end);
        if (range.length > 0) {
          setWeightLatest(range[range.length - 1].weight_kg);
          setWeightTrend(range.length >= 2 ? range[range.length - 1].weight_kg - range[0].weight_kg : 0);
          setWeightSparkline(range.map(r => ({ value: r.weight_kg })));
        }

        // Compute streak
        const keys = await (window as any).electronAPI?.pluginsStorageKeys?.('knosys-fitness') ?? [];
        const dates = new Set<string>();
        for (const key of keys as string[]) {
          const m = key.match(/^(?:log|exercise|weight|water):(\d{4}-\d{2}-\d{2})/);
          if (m) dates.add(m[1]);
        }
        let count = 0;
        for (let i = 0; ; i++) {
          const d = toDateKey(dateFns.subDays(new Date(), i));
          if (dates.has(d)) count++;
          else break;
          if (count > 365) break;
        }
        setStreak(count);
      })();
    }, [calories, water.ml, exercise.entries.length]);

    const burnedCal = exercise.entries.reduce((sum, e) => sum + e.calories_burned, 0);
    const trendDir = weightTrend < -0.05 ? 'down' : weightTrend > 0.05 ? 'up' : 'flat';

    return React.createElement('div', { className: 'space-y-4' },
      // Macro summary
      React.createElement(Card, null,
        React.createElement(CardContent, { className: 'p-4' },
          React.createElement(MacroProgress, {
            calories, protein_g, carbs_g, fat_g, goals,
          }),
        ),
      ),

      // KPI tiles 2x2
      React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
        React.createElement(StatTile, {
          icon: 'Droplets',
          label: 'Water',
          value: water.ml,
          unit: `/ ${goals.water_ml} ml`,
          accent: 'hsl(217, 91%, 60%)',
        }),
        React.createElement(StatTile, {
          icon: 'Flame',
          label: 'Burned',
          value: formatCal(burnedCal),
          unit: burnedCal === 0 ? '' : 'cal',
          accent: '#f97316',
        }),
        React.createElement(StatTile, {
          icon: 'Scale',
          label: 'Weight',
          value: weightLatest !== null ? weightLatest.toFixed(1) : '—',
          unit: weightLatest !== null ? 'kg' : '',
          hint: weightLatest !== null && weightSparkline.length >= 2
            ? `${weightTrend > 0 ? '+' : ''}${weightTrend.toFixed(1)} over 14d`
            : undefined,
          accent: trendDir === 'down' ? '#10b981' : trendDir === 'up' ? '#ef4444' : undefined,
        }),
        React.createElement(StatTile, {
          icon: 'Activity',
          label: 'Streak',
          value: streak,
          unit: streak === 1 ? 'day' : 'days',
          accent: streak > 0 ? '#f59e0b' : undefined,
        }),
      ),

      // Weight sparkline (optional, if data)
      weightSparkline.length >= 2 && React.createElement(Card, null,
        React.createElement(CardContent, { className: 'p-3' },
          React.createElement('div', { className: 'flex items-center justify-between mb-1.5' },
            React.createElement('span', {
              className: 'text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
            }, 'Weight · 14 days'),
            React.createElement('span', {
              className: 'text-[10px] tabular-nums',
              style: { color: trendDir === 'down' ? '#10b981' : trendDir === 'up' ? '#ef4444' : undefined },
            }, `${weightTrend > 0 ? '+' : ''}${weightTrend.toFixed(1)} kg`),
          ),
          React.createElement('div', { style: { width: '100%', height: '48px' } },
            React.createElement(ResponsiveContainer, { width: '100%', height: '100%' },
              React.createElement(LineChart, { data: weightSparkline, margin: { top: 4, right: 4, bottom: 4, left: 4 } },
                React.createElement(Line, {
                  type: 'monotone', dataKey: 'value',
                  stroke: 'hsl(var(--primary))', strokeWidth: 1.5,
                  dot: false, animationDuration: 600,
                }),
              ),
            ),
          ),
        ),
      ),
    );
  };
}
