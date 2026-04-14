import type { SharedDependencies } from '../types';
import { createUseDiary, getStorage } from '../hooks/use-fitness-store';
import { createExerciseLog } from './exercise-log';
import { createDateNavigator } from './date-navigator';
import { createStatTile } from './stat-tile';
import { toDateKey } from '../utils/date-helpers';
import { formatCal } from '../utils/nutrients';

export function createExercisePage(Shared: SharedDependencies) {
  const {
    React, ScrollArea, Card, CardContent, lucideIcons, dateFns, recharts, cn,
  } = Shared;
  const { Flame, Clock, TrendingUp } = lucideIcons;
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } = recharts;

  const ExerciseLog = createExerciseLog(Shared);
  const DateNavigator = createDateNavigator(Shared);
  const StatTile = createStatTile(Shared);
  const useDiary = createUseDiary(Shared);

  return function ExercisePage() {
    const [date, setDate] = React.useState(new Date());
    const dateKey = toDateKey(date);
    const diary = useDiary(dateKey);

    const [weekData, setWeekData] = React.useState<{ label: string; cal: number }[]>([]);
    const [weekTotal, setWeekTotal] = React.useState(0);

    React.useEffect(() => {
      (async () => {
        const s = getStorage();
        const week: { label: string; cal: number }[] = [];
        let total = 0;
        for (let i = 6; i >= 0; i--) {
          const d = dateFns.subDays(new Date(), i);
          const log = await s.getExercise(toDateKey(d));
          const cal = log.entries.reduce((sum, e) => sum + e.calories_burned, 0);
          total += cal;
          week.push({ label: dateFns.format(d, 'EEE'), cal });
        }
        setWeekData(week);
        setWeekTotal(total);
      })();
    }, [diary.exercise.entries.length]);

    const totalCal = diary.exercise.entries.reduce((sum, e) => sum + e.calories_burned, 0);
    const totalMin = diary.exercise.entries.reduce((sum, e) => sum + e.duration_min, 0);
    const avgWeekCal = weekData.length > 0 ? Math.round(weekTotal / 7) : 0;

    return React.createElement('div', { className: 'flex flex-col h-full' },
      // Header with date navigator
      React.createElement('div', { className: 'flex items-center justify-between px-4 lg:px-6 py-3 border-b' },
        React.createElement(DateNavigator, { date, onDateChange: setDate }),
      ),

      React.createElement(ScrollArea, { className: 'flex-1' },
        React.createElement('div', { className: 'p-4 lg:p-6 space-y-4' },
          // KPI row
          React.createElement('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-3' },
            React.createElement(StatTile, {
              icon: 'Flame',
              label: 'Today',
              value: formatCal(totalCal),
              unit: 'cal',
              accent: '#f97316',
            }),
            React.createElement(StatTile, {
              icon: 'Clock',
              label: 'Duration',
              value: totalMin,
              unit: 'min',
              accent: '#8b5cf6',
            }),
            React.createElement(StatTile, {
              icon: 'TrendingUp',
              label: '7-day total',
              value: formatCal(weekTotal),
              unit: 'cal',
              accent: '#10b981',
            }),
            React.createElement(StatTile, {
              icon: 'Activity',
              label: 'Daily avg',
              value: formatCal(avgWeekCal),
              unit: 'cal',
            }),
          ),

          // Split layout: log + chart
          React.createElement('div', { className: 'grid gap-4 lg:grid-cols-[1fr_1fr]' },
            // Left: today's exercise log
            React.createElement('div', null,
              React.createElement('h3', {
                className: 'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2',
              }, 'Today'),
              React.createElement(ExerciseLog, {
                exercise: diary.exercise,
                onAddExercise: diary.addExercise,
                onRemoveExercise: diary.removeExercise,
              }),
            ),

            // Right: weekly chart
            React.createElement('div', null,
              React.createElement('h3', {
                className: 'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2',
              }, 'Last 7 days'),
              React.createElement(Card, null,
                React.createElement(CardContent, { className: 'p-4' },
                  weekData.length > 0
                    ? React.createElement('div', { style: { width: '100%', height: '180px' } },
                        React.createElement(ResponsiveContainer, { width: '100%', height: '100%' },
                          React.createElement(BarChart, { data: weekData, margin: { top: 4, right: 4, bottom: 4, left: 0 } },
                            React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: 'hsl(var(--border))', vertical: false }),
                            React.createElement(XAxis, {
                              dataKey: 'label',
                              tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
                              axisLine: false, tickLine: false,
                            }),
                            React.createElement(YAxis, {
                              tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
                              axisLine: false, tickLine: false, width: 32,
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
                            React.createElement(Bar, {
                              dataKey: 'cal',
                              fill: '#f97316',
                              radius: [3, 3, 0, 0],
                              animationDuration: 600,
                            }),
                          ),
                        ),
                      )
                    : React.createElement('div', {
                        className: 'text-xs text-muted-foreground text-center py-12',
                      }, 'Log your first workout to see trends'),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  };
}
