import type { SharedDependencies, Exercise, ExerciseEntry } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { findCatalogExercise } from '../api/exercise-catalog';
import { createScopedShadcn } from '../design-system/scoped-shadcn';
import {
  createSegmentedControl,
  createStatTile,
} from '../design-system/primitives';
import { SIG_PALETTE } from '../theme/palette';

interface HistoryPoint {
  date: string;
  label: string;
  volume?: number;
  top_weight?: number;
  total_reps?: number;
  duration_min?: number;
  distance?: number;
  calories?: number;
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
    return {
      ...base,
      duration_min: entry.duration_min,
      distance: entry.distance,
      calories: entry.calories_burned,
    };
  }
  return null;
}

const EYEBROW = {
  fontFamily: 'var(--knf-font-mono)',
  fontSize: 10,
  color: 'var(--knf-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.14em',
  fontWeight: 500,
};

export function createExerciseHistory(Shared: SharedDependencies) {
  const { React, dateFns, recharts } = Shared;
  const { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } = recharts;

  const Scoped = createScopedShadcn(Shared);
  const SegmentedControl = createSegmentedControl(Shared);
  const StatTile = createStatTile(Shared);

  type Metric = 'volume' | 'top_weight' | 'total_reps' | 'duration' | 'distance';

  return function ExerciseHistoryDialog({ open, onOpenChange, exerciseId, exerciseName }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    exerciseId: string;
    exerciseName?: string;
  }) {
    const [points, setPoints] = React.useState<HistoryPoint[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [metric, setMetric] = React.useState<Metric>('volume');

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

    const chartColor = isCardio ? SIG_PALETTE.steps : SIG_PALETTE.calBurn;

    const metricOptions = isCardio
      ? [
          { value: 'duration', label: 'Duration' },
          { value: 'distance', label: 'Distance' },
        ]
      : [
          { value: 'volume', label: 'Volume' },
          { value: 'top_weight', label: 'Top weight' },
          { value: 'total_reps', label: 'Reps' },
        ];

    return React.createElement(Scoped.Dialog, { open, onOpenChange },
      React.createElement(Scoped.DialogContent, {
        className: 'max-w-xl',
        style: { maxHeight: '85vh', overflowY: 'auto' },
      },
        React.createElement(Scoped.DialogHeader, null,
          React.createElement('div', { className: 'knf-eyebrow', style: EYEBROW }, 'History'),
          React.createElement(Scoped.DialogTitle, {
            style: { fontFamily: 'var(--knf-font-display)', letterSpacing: '-0.01em' },
          }, displayName),
        ),

        loading
          ? React.createElement('div', {
              style: { ...EYEBROW, textAlign: 'center', padding: '32px 0' },
            }, 'Loading history…')
          : points.length === 0
          ? React.createElement('div', {
              style: { ...EYEBROW, textAlign: 'center', padding: '32px 0' },
            }, 'No history yet. Log this exercise to start tracking progress.')
          : React.createElement(React.Fragment, null,
              // KPI row
              React.createElement('div', {
                style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 },
              },
                React.createElement(StatTile, {
                  icon: 'Calendar',
                  label: 'Sessions',
                  value: totalSessions,
                  unit: '',
                  accent: 'hero',
                }),
                !isCardio && React.createElement(StatTile, {
                  icon: 'TrendingUp',
                  label: 'Latest top',
                  value: latestTopWeight != null ? latestTopWeight : 0,
                  unit: latestTopWeight != null ? 'lb' : '—',
                  accent: 'cal-burn',
                }),
                !isCardio && React.createElement(StatTile, {
                  icon: 'Activity',
                  label: 'Latest volume',
                  value: latestVolume != null ? Math.round(latestVolume) : 0,
                  unit: '',
                  accent: 'cal-burn',
                }),
                isCardio && React.createElement(StatTile, {
                  icon: 'Clock',
                  label: 'Total min',
                  value: points.reduce((s, p) => s + (p.duration_min ?? 0), 0),
                  unit: 'min',
                  accent: 'steps',
                }),
                isCardio && React.createElement(StatTile, {
                  icon: 'MapPin',
                  label: 'Total dist',
                  value: points.reduce((s, p) => s + (p.distance ?? 0), 0).toFixed(1),
                  unit: 'km',
                  accent: 'steps',
                }),
              ),

              // Metric tabs
              React.createElement('div', { style: { marginBottom: 10 } },
                React.createElement(SegmentedControl, {
                  value: metric,
                  onValueChange: (v: string) => setMetric(v as Metric),
                  options: metricOptions,
                  size: 'sm',
                  ariaLabel: 'History metric',
                }),
              ),

              // Chart
              React.createElement('div', { style: { width: '100%', height: 220 } },
                React.createElement(ResponsiveContainer, { width: '100%', height: '100%' },
                  React.createElement(
                    metric === 'top_weight' ? LineChart : BarChart,
                    { data: chartData, margin: { top: 8, right: 8, bottom: 4, left: 0 } },
                    React.createElement(CartesianGrid, {
                      strokeDasharray: '3 3',
                      stroke: SIG_PALETTE.hairline,
                      vertical: false,
                    }),
                    React.createElement(XAxis, {
                      dataKey: 'label',
                      tick: { fontSize: 10, fill: SIG_PALETTE.muted, fontFamily: 'var(--knf-font-mono)' },
                      axisLine: false, tickLine: false,
                    }),
                    React.createElement(YAxis, {
                      tick: { fontSize: 10, fill: SIG_PALETTE.muted, fontFamily: 'var(--knf-font-mono)' },
                      axisLine: false, tickLine: false, width: 40,
                    }),
                    React.createElement(Tooltip, {
                      cursor: { fill: SIG_PALETTE.heroWash },
                      contentStyle: {
                        fontSize: 11,
                        backgroundColor: SIG_PALETTE.surface,
                        border: `1px solid ${SIG_PALETTE.hairline}`,
                        borderRadius: 8,
                        fontFamily: 'var(--knf-font-mono)',
                      },
                    }),
                    metric === 'top_weight'
                      ? React.createElement(Line, {
                          type: 'monotone', dataKey: 'value',
                          stroke: chartColor, strokeWidth: 2, dot: { r: 3 },
                        })
                      : React.createElement(Bar, {
                          dataKey: 'value',
                          fill: chartColor,
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
