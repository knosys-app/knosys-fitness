import type { SharedDependencies, Exercise, ExerciseEntry, ExerciseSet } from '../types';
import { createUseDiary, getStorage } from '../hooks/use-fitness-store';
import { createExerciseLog } from './exercise-log';
import { createExerciseSearchDialog } from './exercise-search';
import { createExerciseLogger } from './exercise-logger';
import { createExerciseHistory } from './exercise-history';
import { createWorkoutTemplates } from './workout-templates';
import { createCustomExerciseForm } from './custom-exercise-form';
import { createDateNavigator } from './date-navigator';
import { createStatTile } from './stat-tile';
import { toDateKey } from '../utils/date-helpers';
import { formatCal } from '../utils/nutrients';

export function createExercisePage(Shared: SharedDependencies) {
  const {
    React, ScrollArea, Card, CardContent, Button, lucideIcons, dateFns, recharts, cn,
  } = Shared;
  const { Flame, Clock, TrendingUp, Search: SearchIcon, ListPlus } = lucideIcons;
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } = recharts;

  const ExerciseLog = createExerciseLog(Shared);
  const ExerciseSearchDialog = createExerciseSearchDialog(Shared);
  const ExerciseLogger = createExerciseLogger(Shared);
  const ExerciseHistory = createExerciseHistory(Shared);
  const WorkoutTemplatesDialog = createWorkoutTemplates(Shared);
  const CustomExerciseForm = createCustomExerciseForm(Shared);
  const DateNavigator = createDateNavigator(Shared);
  const StatTile = createStatTile(Shared);
  const useDiary = createUseDiary(Shared);

  return function ExercisePage() {
    const [date, setDate] = React.useState(new Date());
    const dateKey = toDateKey(date);
    const diary = useDiary(dateKey);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [loggerOpen, setLoggerOpen] = React.useState(false);
    const [loggerExercise, setLoggerExercise] = React.useState<Exercise | undefined>();
    const [loggerEntry, setLoggerEntry] = React.useState<ExerciseEntry | undefined>();
    const [historyOpen, setHistoryOpen] = React.useState(false);
    const [historyExercise, setHistoryExercise] = React.useState<{ id: string; name: string } | null>(null);
    const [templatesOpen, setTemplatesOpen] = React.useState(false);
    const [customFormOpen, setCustomFormOpen] = React.useState(false);
    const [customFormHint, setCustomFormHint] = React.useState<string | undefined>();

    const [weekData, setWeekData] = React.useState<{ label: string; cal: number }[]>([]);
    const [weekTotal, setWeekTotal] = React.useState(0);

    const openLoggerForExercise = React.useCallback((exercise: Exercise) => {
      setLoggerExercise(exercise);
      setLoggerEntry(undefined);
      setLoggerOpen(true);
    }, []);

    const openLoggerForEntry = React.useCallback((entry: ExerciseEntry) => {
      setLoggerEntry(entry);
      setLoggerExercise(undefined);
      setLoggerOpen(true);
    }, []);

    const openLoggerBlank = React.useCallback(() => {
      setLoggerExercise(undefined);
      setLoggerEntry(undefined);
      setSearchOpen(true);
    }, []);

    const handleLoggerSubmit = React.useCallback(
      async (patch: Partial<ExerciseEntry>, entryId?: string) => {
        if (entryId) {
          await diary.updateExerciseEntry(entryId, patch);
        } else {
          const kind = (patch.kind ?? 'cardio') as 'strength' | 'cardio';
          await diary.addExerciseEntry({
            name: patch.name ?? '',
            kind,
            exercise_id: patch.exercise_id,
            primaryMuscles: patch.primaryMuscles,
            sets: patch.sets,
            duration_min: patch.duration_min,
            distance: patch.distance,
            distance_unit: patch.distance_unit,
            calories_burned: patch.calories_burned,
            notes: patch.notes,
          });
        }
      },
      [diary],
    );

    const applyTemplate = React.useCallback(async (template: import('../types').WorkoutTemplate) => {
      for (const ex of template.exercises) {
        const isCustom = ex.exercise_id.startsWith('custom:');
        await diary.addExerciseEntry({
          exercise_id: isCustom ? undefined : ex.exercise_id,
          name: ex.name,
          kind: ex.kind,
          sets: ex.kind === 'strength' && ex.target_sets
            ? Array.from({ length: ex.target_sets }, () => ({
                reps: ex.target_reps ?? 8,
                weight: ex.target_weight,
              }))
            : undefined,
          duration_min: ex.kind === 'cardio' ? ex.target_duration_min : undefined,
        });
      }
    }, [diary]);

    const fetchPreviousSets = React.useCallback(async (exerciseId: string): Promise<ExerciseSet[] | null> => {
      const s = getStorage();
      const history = await s.getExerciseHistory(exerciseId);
      if (!history.length) return null;
      // Most recent history entry
      const sorted = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));
      for (const h of sorted) {
        if (h.date === dateKey) continue; // skip today's own entries
        const log = await s.getExercise(h.date);
        const entry = log.entries.find(e => e.id === h.entry_id);
        if (entry?.sets?.length) return entry.sets;
      }
      return null;
    }, [dateKey]);

    React.useEffect(() => {
      (async () => {
        const s = getStorage();
        const week: { label: string; cal: number }[] = [];
        let total = 0;
        for (let i = 6; i >= 0; i--) {
          const d = dateFns.subDays(new Date(), i);
          const log = await s.getExercise(toDateKey(d));
          const cal = log.entries.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0);
          total += cal;
          week.push({ label: dateFns.format(d, 'EEE'), cal });
        }
        setWeekData(week);
        setWeekTotal(total);
      })();
    }, [diary.exercise.entries.length]);

    const totalCal = diary.exercise.entries.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0);
    const totalMin = diary.exercise.entries.reduce((sum, e) => sum + (e.duration_min ?? 0), 0);
    const avgWeekCal = weekData.length > 0 ? Math.round(weekTotal / 7) : 0;

    return React.createElement('div', { className: 'flex flex-col h-full' },
      // Header with date navigator + browse button
      React.createElement('div', { className: 'flex items-center justify-between px-4 lg:px-6 py-3 border-b' },
        React.createElement(DateNavigator, { date, onDateChange: setDate }),
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement(Button, {
            variant: 'outline', size: 'sm',
            onClick: () => setTemplatesOpen(true),
          },
            React.createElement(ListPlus, { className: 'h-4 w-4 mr-1.5' }),
            'Templates',
          ),
          React.createElement(Button, {
            variant: 'outline', size: 'sm',
            onClick: () => setSearchOpen(true),
          },
            React.createElement(SearchIcon, { className: 'h-4 w-4 mr-1.5' }),
            'Browse exercises',
          ),
        ),
      ),

      React.createElement(ExerciseSearchDialog, {
        open: searchOpen,
        onOpenChange: setSearchOpen,
        onSelect: openLoggerForExercise,
        onCreateCustom: (hint?: string) => {
          setCustomFormHint(hint);
          setCustomFormOpen(true);
        },
      }),

      React.createElement(CustomExerciseForm, {
        open: customFormOpen,
        onOpenChange: setCustomFormOpen,
        initialName: customFormHint,
        onCreated: (exercise: Exercise) => {
          openLoggerForExercise(exercise);
        },
      }),

      React.createElement(ExerciseLogger, {
        open: loggerOpen,
        onOpenChange: setLoggerOpen,
        mode: loggerEntry ? 'edit' : 'create',
        exercise: loggerExercise,
        entry: loggerEntry,
        onSubmit: handleLoggerSubmit,
        onPreviousSetsRequest: fetchPreviousSets,
      }),

      historyExercise && React.createElement(ExerciseHistory, {
        open: historyOpen,
        onOpenChange: setHistoryOpen,
        exerciseId: historyExercise.id,
        exerciseName: historyExercise.name,
      }),

      React.createElement(WorkoutTemplatesDialog, {
        open: templatesOpen,
        onOpenChange: setTemplatesOpen,
        todayEntries: diary.exercise.entries,
        onApply: applyTemplate,
      }),

      React.createElement(ScrollArea, { className: 'flex-1' },
        React.createElement('div', { className: 'p-4 md:p-5 space-y-4' },
          // KPI row
          React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
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
          React.createElement('div', { className: 'grid gap-4 md:grid-cols-[1fr_1fr]' },
            // Left: today's exercise log
            React.createElement('div', null,
              React.createElement('h3', {
                className: 'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2',
              }, 'Today'),
              React.createElement(ExerciseLog, {
                exercise: diary.exercise,
                onAdd: openLoggerBlank,
                onEdit: openLoggerForEntry,
                onRemove: diary.removeExercise,
                onOpenHistory: (entry) => {
                  if (!entry.exercise_id) return;
                  setHistoryExercise({ id: entry.exercise_id, name: entry.name });
                  setHistoryOpen(true);
                },
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
