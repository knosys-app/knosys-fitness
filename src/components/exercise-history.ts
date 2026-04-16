import type { SharedDependencies, Exercise, ExerciseEntry, ExerciseSet } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { findCatalogExercise } from '../api/exercise-catalog';

interface HistoryPoint {
  date: string;
  label: string;
  // strength
  volume?: number;
  top_weight?: number;
  total_reps?: number;
  // cardio
  duration_min?: number;
  distance?: number;
  pace?: number; // min per km/mi
  calories?: number;
  // common
  entry_id: string;
  kind: 'strength' | 'cardio';
}

function pointFromEntry(entry: ExerciseEntry, date: string, label: string): HistoryPoint | null {
  const base = { date, label, entry_id: entry.id, kind: entry.kind };
  if (entry.kind === 'strength' && entry.sets?.length) {
    const volume = entry.sets.reduce((sum, s) => sum + (s.reps * (s.weight ?? 0)), 0);
    const weights = entry.sets.map(s => s.weight).filter((w): w is number => typeof w === 'number');
    const totalReps = entry.sets.reduce((sum, s) => sum + s.reps, 0);
    return {
      ...base,
      volume,
      top_weight: weights.length ? Math.max(...weights) : undefined,
      total_reps: totalReps,
      calories: entry.calories_burned,
    };
  }
  if (entry.kind === 'cardio') {
    const pace = entry.distance && entry.duration_min ? entry.duration_min / entry.distance : undefined;
    return {
      ...base,
      duration_min: entry.duration_min,
      distance: entry.distance,
      pace,
      calories: entry.calories_burned,
    };
  }
  return null;
}

export function createExerciseHistory(Shared: SharedDependencies) {
  const {
    React, Dialog, DialogContent, DialogHeader, DialogTitle,
    Card, CardContent, Button, Tabs, TabsList, TabsTrigger,
    lucideIcons, dateFns, recharts, cn,
  } = Shared;
  const { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } = recharts;
  const { TrendingUp, Calendar, X } = lucideIcons;

  return function ExerciseHistoryDialog({ open, onOpenChange, exerciseId, exerciseName }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    exerciseId: string;
    exerciseName?: string;
  }) {
    const [points, setPoints] = React.useState<HistoryPoint[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [metric, setMetric] = React.useState<'volume' | 'top_weight' | 'total_reps' | 'duration' | 'distance'>('volume');

    const catalogExercise: Exercise | undefined = findCatalogExercise(exerciseId);
    const displayName = exerciseName ?? catalogExercise?.name ?? exerciseId;

    React.useEffect(() => {
      if (!open) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        const s = getStorage();
        const history = await s.getExerciseHistory(exerciseId);
        const sorted = [...history].sort((a, b) => (a.date < b.date ? -1 : 1));
        const collected: HistoryPoint[] = [];
        for (const h of sorted) {
          const log = await s.getExercise(h.date);
          const entry = log.entries.find(e => e.id === h.entry_id);
          if (!entry) continue;
          const p = pointFromEntry(entry, h.date, dateFns.format(dateFns.parseISO(h.date), 'MMM d'));
          if (p) collected.push(p);
        }
        if (!cancelled) {
          setPoints(collected);
          setLoading(false);
          // Pick a sensible default metric based on the first point.
          if (collected[0]?.kind === 'cardio') setMetric('duration');
        }
      })();
      return () => { cancelled = true; };
    }, [open, exerciseId]);

    const kind = points[0]?.kind ?? 'strength';
    const isCardio = kind === 'cardio';

    const totalSessions = points.length;
    const latestTopWeight = [...points].reverse().find(p => p.top_weight != null)?.top_weight;
    const latestVolume = [...points].reverse().find(p => p.volume != null)?.volume;

    const chartData = points.map(p => ({
      label: p.label,
      value: (
        metric === 'volume' ? p.volume :
        metric === 'top_weight' ? p.top_weight :
        metric === 'total_reps' ? p.total_reps :
        metric === 'duration' ? p.duration_min :
        metric === 'distance' ? p.distance :
        undefined
      ) ?? 0,
    }));

    return React.createElement(Dialog, { open, onOpenChange },
      React.createElement(DialogContent, { className: 'max-w-xl', style: { maxHeight: '85vh', overflowY: 'auto' } },
        React.createElement(DialogHeader, null,
          React.createElement(DialogTitle, null, displayName),
        ),

        loading
          ? React.createElement('div', { className: 'text-sm text-muted-foreground text-center py-8' }, 'Loading history…')
          : points.length === 0
          ? React.createElement('div', { className: 'text-sm text-muted-foreground text-center py-8' }, 'No history yet. Log this exercise to start tracking progress.')
          : React.createElement(React.Fragment, null,
              // KPIs
              React.createElement('div', { className: 'grid grid-cols-3 gap-2 mb-3' },
                React.createElement(Card, null,
                  React.createElement(CardContent, { className: 'p-3 text-center' },
                    React.createElement('div', { className: 'text-[10px] uppercase tracking-wide text-muted-foreground' }, 'Sessions'),
                    React.createElement('div', { className: 'text-lg font-semibold tabular-nums' }, totalSessions),
                  ),
                ),
                !isCardio && React.createElement(Card, null,
                  React.createElement(CardContent, { className: 'p-3 text-center' },
                    React.createElement('div', { className: 'text-[10px] uppercase tracking-wide text-muted-foreground' }, 'Latest top'),
                    React.createElement('div', { className: 'text-lg font-semibold tabular-nums' },
                      latestTopWeight != null ? `${latestTopWeight}` : '—'),
                  ),
                ),
                !isCardio && React.createElement(Card, null,
                  React.createElement(CardContent, { className: 'p-3 text-center' },
                    React.createElement('div', { className: 'text-[10px] uppercase tracking-wide text-muted-foreground' }, 'Latest volume'),
                    React.createElement('div', { className: 'text-lg font-semibold tabular-nums' },
                      latestVolume != null ? `${Math.round(latestVolume)}` : '—'),
                  ),
                ),
                isCardio && React.createElement(Card, null,
                  React.createElement(CardContent, { className: 'p-3 text-center' },
                    React.createElement('div', { className: 'text-[10px] uppercase tracking-wide text-muted-foreground' }, 'Total duration'),
                    React.createElement('div', { className: 'text-lg font-semibold tabular-nums' },
                      `${points.reduce((s, p) => s + (p.duration_min ?? 0), 0)} min`),
                  ),
                ),
                isCardio && React.createElement(Card, null,
                  React.createElement(CardContent, { className: 'p-3 text-center' },
                    React.createElement('div', { className: 'text-[10px] uppercase tracking-wide text-muted-foreground' }, 'Total distance'),
                    React.createElement('div', { className: 'text-lg font-semibold tabular-nums' },
                      `${points.reduce((s, p) => s + (p.distance ?? 0), 0).toFixed(1)}`),
                  ),
                ),
              ),

              // Metric tabs
              React.createElement(Tabs, {
                value: metric,
                onValueChange: (v: string) => setMetric(v as any),
              },
                React.createElement(TabsList, { className: 'w-full' },
                  !isCardio && React.createElement(TabsTrigger, { value: 'volume', className: 'flex-1 text-xs' }, 'Volume'),
                  !isCardio && React.createElement(TabsTrigger, { value: 'top_weight', className: 'flex-1 text-xs' }, 'Top weight'),
                  !isCardio && React.createElement(TabsTrigger, { value: 'total_reps', className: 'flex-1 text-xs' }, 'Reps'),
                  isCardio && React.createElement(TabsTrigger, { value: 'duration', className: 'flex-1 text-xs' }, 'Duration'),
                  isCardio && React.createElement(TabsTrigger, { value: 'distance', className: 'flex-1 text-xs' }, 'Distance'),
                ),
              ),

              // Chart
              React.createElement('div', { className: 'mt-3', style: { width: '100%', height: '220px' } },
                React.createElement(ResponsiveContainer, { width: '100%', height: '100%' },
                  React.createElement(
                    metric === 'top_weight' ? LineChart : BarChart,
                    { data: chartData, margin: { top: 8, right: 8, bottom: 4, left: 0 } },
                    React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: 'hsl(var(--border))', vertical: false }),
                    React.createElement(XAxis, {
                      dataKey: 'label',
                      tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
                      axisLine: false, tickLine: false,
                    }),
                    React.createElement(YAxis, {
                      tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
                      axisLine: false, tickLine: false, width: 40,
                    }),
                    React.createElement(Tooltip, {
                      cursor: { fill: 'hsl(var(--muted) / 0.4)' },
                      contentStyle: {
                        fontSize: 11,
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      },
                    }),
                    metric === 'top_weight'
                      ? React.createElement(Line, {
                          type: 'monotone', dataKey: 'value',
                          stroke: '#f97316', strokeWidth: 2, dot: { r: 3 },
                        })
                      : React.createElement(Bar, {
                          dataKey: 'value',
                          fill: isCardio ? '#10b981' : '#f97316',
                          radius: [3, 3, 0, 0],
                          animationDuration: 400,
                        }),
                  ),
                ),
              ),
            ),
      ),
    );
  };
}
