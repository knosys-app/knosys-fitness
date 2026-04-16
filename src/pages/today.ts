import type { SharedDependencies, MealType, MealTemplate, NormalizedFood, Exercise, ExerciseEntry, ExerciseSet } from '../types';
import { MEAL_TYPES, MEAL_LABELS } from '../types';
import { dayTotals, formatCal } from '../utils/nutrients';
import { toDateKey, uuid } from '../utils/date-helpers';
import { createUseDiary, getStorage, getApi } from '../hooks/use-fitness-store';
import { createDateNavigator } from '../components/date-navigator';
import { createMacroProgress } from '../components/macro-progress';
import { createMealSection } from '../components/meal-section';
import { createFoodSearchDialog } from '../components/food-search';
import { createFoodEntryForm } from '../components/food-entry-form';
import { createWaterTracker } from '../components/water-tracker';
import { createExerciseLog } from '../components/exercise-log';
import { createExerciseSearchDialog } from '../components/exercise-search';
import { createExerciseLogger } from '../components/exercise-logger';
import { createWellnessCard } from '../components/wellness-card';
import {
  createSignatureCard,
  createSegmentedControl,
  createNumericReadout,
  createSemanticBadge,
  createPageHeader,
} from '../design-system/primitives';
import { SIG_PALETTE } from '../theme/palette';

type Section = 'food' | 'exercise' | 'wellness';

/**
 * Today page — unifies former Diary + Exercise tabs and adds Wellness.
 *
 * Three sub-sections (URL-synced via `?section=`):
 *   - Food      (default) : macro ring + meal sections + water
 *   - Exercise            : today's burn + log + 7-day bar
 *   - Wellness  (NEW)     : sleep / steps / HR / notes
 *
 * Date navigator persists across all sub-sections.
 */
export function createTodayPage(Shared: SharedDependencies) {
  const {
    React, ScrollArea, Button, lucideIcons, dateFns, recharts, cn,
  } = Shared;
  const { Plus, Utensils, Flame, Moon, Clock, TrendingUp } = lucideIcons;
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } = recharts;

  const DateNavigator = createDateNavigator(Shared);
  const MacroProgress = createMacroProgress(Shared);
  const MealSection = createMealSection(Shared);
  const FoodSearchDialog = createFoodSearchDialog(Shared);
  const FoodEntryForm = createFoodEntryForm(Shared);
  const WaterTracker = createWaterTracker(Shared);
  const ExerciseLog = createExerciseLog(Shared);
  const ExerciseSearchDialog = createExerciseSearchDialog(Shared);
  const ExerciseLogger = createExerciseLogger(Shared);
  const WellnessCard = createWellnessCard(Shared);

  const SignatureCard = createSignatureCard(Shared);
  const SegmentedControl = createSegmentedControl(Shared);
  const NumericReadout = createNumericReadout(Shared);
  const SemanticBadge = createSemanticBadge(Shared);
  const PageHeader = createPageHeader(Shared);

  const useDiary = createUseDiary(Shared);

  // Helpers to read/write the ?section= URL param.
  const readSection = (): Section => {
    if (typeof window === 'undefined') return 'food';
    const p = new URLSearchParams(window.location.search);
    const v = p.get('section');
    if (v === 'exercise' || v === 'wellness' || v === 'food') return v;
    return 'food';
  };

  const writeSection = (section: Section) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('section', section);
    // Preserve any existing tab param; just update section.
    window.history.replaceState(null, '', url.toString());
  };

  // Animate children with a staggered fade.
  const AnimatedBlock: any = function AnimatedBlock({ delay, children }: { delay: number; children?: any }) {
    const [visible, setVisible] = React.useState(false);
    React.useEffect(() => {
      const t = window.setTimeout(() => setVisible(true), delay);
      return () => window.clearTimeout(t);
    }, [delay]);
    return React.createElement('div', {
      style: {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity var(--knf-duration-2) var(--knf-ease-out), transform var(--knf-duration-2) var(--knf-ease-out)',
      },
    }, children);
  };

  // ---- Food Section ----
  function FoodSection(props: {
    dateKey: string;
    diary: ReturnType<ReturnType<typeof createUseDiary>>;
  }) {
    const { dateKey, diary } = props;
    const api = getApi();
    const totals = dayTotals(diary.meals);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [customFoodOpen, setCustomFoodOpen] = React.useState(false);
    const [activeMeal, setActiveMeal] = React.useState<MealType>('breakfast');

    const handleAddFood = (m: MealType) => {
      setActiveMeal(m);
      setSearchOpen(true);
    };

    const handleFoodSelected = async (food: NormalizedFood, servings: number) => {
      await diary.addFoodEntry(activeMeal, food, servings);
    };

    const handleCustomFoodSaved = async (food: NormalizedFood) => {
      await diary.addFoodEntry(activeMeal, food, 1);
      api.ui.showToast(`Added "${food.name}" to ${MEAL_LABELS[activeMeal]}`, 'success');
    };

    const handleSaveAsTemplate = async (mealType: MealType) => {
      const meal = diary.meals[mealType];
      if (meal.entries.length === 0) return;
      const template: MealTemplate = {
        id: uuid(),
        name: `${MEAL_LABELS[mealType]} \u2014 ${dateFns.format(fromKey(dateKey), 'MMM d')}`,
        items: meal.entries.map(e => ({ food: e.food, servings: e.servings })),
      };
      await getStorage().setTemplate(template);
      api.ui.showToast(`Saved "${template.name}" as template`, 'success');
    };

    return React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)',
        gap: 16,
      },
    },
      // LEFT: today's intake (macro ring/bars) + water tracker
      React.createElement('div', {
        style: { display: 'flex', flexDirection: 'column', gap: 12 },
      },
        React.createElement(AnimatedBlock, { delay: 0 },
          React.createElement(SignatureCard, { padding: 'lg', accent: 'hero' },
            React.createElement('div', {
              style: { display: 'flex', flexDirection: 'column', gap: 16 },
            },
              React.createElement('div', null,
                React.createElement('div', {
                  className: 'knf-eyebrow',
                  style: {
                    fontFamily: 'var(--knf-font-mono)',
                    fontSize: 11,
                    color: 'var(--knf-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontWeight: 500,
                    marginBottom: 4,
                  },
                }, 'Macros'),
                React.createElement('div', {
                  style: {
                    fontFamily: 'var(--knf-font-display)',
                    fontSize: 22,
                    fontWeight: 600,
                    color: 'var(--knf-ink)',
                    letterSpacing: '-0.01em',
                  },
                }, 'Today\u2019s intake'),
              ),
              React.createElement(MacroProgress, {
                calories: totals.calories,
                protein_g: totals.protein_g,
                carbs_g: totals.carbs_g,
                fat_g: totals.fat_g,
                goals: diary.goals,
              }),
            ),
          ),
        ),
        React.createElement(AnimatedBlock, { delay: 80 },
          React.createElement(WaterTracker, {
            water: diary.water,
            goals: diary.goals,
            onAddWater: diary.addWater,
            onSetWater: diary.setWaterAmount,
          }),
        ),
      ),

      // RIGHT: meals
      React.createElement('div', {
        style: { display: 'flex', flexDirection: 'column', gap: 12 },
      },
        ...MEAL_TYPES.map((m, i) =>
          React.createElement(AnimatedBlock, { key: m, delay: 150 + i * 70 },
            React.createElement(MealSection, {
              mealType: m,
              meal: diary.meals[m],
              onAddFood: () => handleAddFood(m),
              onRemoveEntry: (id: string) => diary.removeFoodEntry(m, id),
              onUpdateServings: (id: string, s: number) => diary.updateFoodEntry(m, id, s),
              onSaveAsTemplate: () => handleSaveAsTemplate(m),
            }),
          ),
        ),
      ),

      // Dialogs
      React.createElement(FoodSearchDialog, {
        open: searchOpen,
        onOpenChange: setSearchOpen,
        mealType: activeMeal,
        onAddFood: handleFoodSelected,
        onCreateCustom: () => setCustomFoodOpen(true),
      }),
      React.createElement(FoodEntryForm, {
        open: customFoodOpen,
        onOpenChange: setCustomFoodOpen,
        onSave: handleCustomFoodSaved,
      }),
    );
  }

  // ---- Exercise Section ----
  function ExerciseSection(props: {
    dateKey: string;
    diary: ReturnType<ReturnType<typeof createUseDiary>>;
    onOpenTemplates?: () => void;
  }) {
    const { dateKey, diary, onOpenTemplates } = props;

    const [weekData, setWeekData] = React.useState<{ label: string; cal: number }[]>([]);
    const [weekTotal, setWeekTotal] = React.useState(0);

    // Modal state for catalog-driven logging flow.
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [loggerOpen, setLoggerOpen] = React.useState(false);
    const [loggerExercise, setLoggerExercise] = React.useState<Exercise | undefined>();
    const [loggerEntry, setLoggerEntry] = React.useState<ExerciseEntry | undefined>();

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

    const fetchPreviousSets = React.useCallback(async (exerciseId: string): Promise<ExerciseSet[] | null> => {
      const s = getStorage();
      const history = await s.getExerciseHistory(exerciseId);
      if (!history.length) return null;
      const sorted = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));
      for (const h of sorted) {
        if (h.date === dateKey) continue;
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
          const d = dateFns.subDays(fromKey(dateKey), i);
          const log = await s.getExercise(toDateKey(d));
          const cal = log.entries.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0);
          total += cal;
          week.push({ label: dateFns.format(d, 'EEE'), cal });
        }
        setWeekData(week);
        setWeekTotal(total);
      })();
    }, [diary.exercise.entries.length, dateKey]);

    const totalCal = diary.exercise.entries.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0);
    const totalMin = diary.exercise.entries.reduce((sum, e) => sum + (e.duration_min ?? 0), 0);
    const avgWeekCal = weekData.length > 0 ? Math.round(weekTotal / 7) : 0;

    return React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 16 },
    },
      // Hero summary
      React.createElement(AnimatedBlock, { delay: 0 },
        React.createElement(SignatureCard, { padding: 'lg', accent: 'cal-burn' },
          React.createElement('div', {
            style: {
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            },
          },
            React.createElement('div', null,
              React.createElement('div', {
                className: 'knf-eyebrow',
                style: {
                  fontFamily: 'var(--knf-font-mono)',
                  fontSize: 11,
                  color: 'var(--knf-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 500,
                  marginBottom: 4,
                },
              }, 'Today\u2019s burn'),
              React.createElement('div', {
                style: {
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                },
              },
                React.createElement(NumericReadout, {
                  value: totalCal,
                  style: {
                    fontFamily: 'var(--knf-font-display)',
                    fontSize: 56,
                    fontWeight: 700,
                    color: SIG_PALETTE.calBurn,
                    letterSpacing: '-0.02em',
                    lineHeight: 0.95,
                  },
                }),
                React.createElement('span', {
                  style: {
                    fontSize: 14,
                    color: 'var(--knf-muted)',
                    fontFamily: 'var(--knf-font-mono)',
                  },
                }, 'cal'),
                React.createElement(SemanticBadge, { accent: 'cal-burn', variant: 'soft' },
                  `${totalMin} min`,
                ),
              ),
            ),
            React.createElement('div', {
              style: {
                display: 'flex',
                gap: 18,
                fontFamily: 'var(--knf-font-mono)',
              },
            },
              React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                React.createElement('span', {
                  style: {
                    fontSize: 10, color: 'var(--knf-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500,
                  },
                }, '7-day total'),
                React.createElement('span', {
                  style: { fontSize: 18, fontWeight: 600, color: 'var(--knf-ink)' },
                }, formatCal(weekTotal) + ' cal'),
              ),
              React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                React.createElement('span', {
                  style: {
                    fontSize: 10, color: 'var(--knf-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500,
                  },
                }, 'Daily avg'),
                React.createElement('span', {
                  style: { fontSize: 18, fontWeight: 600, color: 'var(--knf-ink)' },
                }, formatCal(avgWeekCal) + ' cal'),
              ),
            ),
          ),
        ),
      ),

      // Log + chart
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 16,
        },
      },
        React.createElement(AnimatedBlock, { delay: 80 },
          React.createElement(ExerciseLog, {
            exercise: diary.exercise,
            onAdd: () => setSearchOpen(true),
            onEdit: openLoggerForEntry,
            onRemove: diary.removeExercise,
            onOpenTemplates,
          }),
        ),
        React.createElement(AnimatedBlock, { delay: 160 },
          React.createElement(SignatureCard, { padding: 'md' },
            React.createElement('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
              },
            },
              React.createElement('span', {
                className: 'knf-eyebrow',
                style: {
                  fontFamily: 'var(--knf-font-mono)',
                  fontSize: 11,
                  color: 'var(--knf-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 500,
                },
              }, 'Last 7 days'),
            ),
            weekData.length > 0
              ? React.createElement('div', { style: { width: '100%', height: 180 } },
                  React.createElement(ResponsiveContainer, { width: '100%', height: '100%' },
                    React.createElement(BarChart, {
                      data: weekData,
                      margin: { top: 4, right: 4, bottom: 4, left: 0 },
                    },
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
                        axisLine: false, tickLine: false, width: 32,
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
                      React.createElement(Bar, {
                        dataKey: 'cal',
                        fill: SIG_PALETTE.calBurn,
                        radius: [3, 3, 0, 0],
                        animationDuration: 600,
                      }),
                    ),
                  ),
                )
              : React.createElement('div', {
                  style: {
                    fontSize: 12,
                    color: 'var(--knf-muted)',
                    textAlign: 'center',
                    padding: '32px 0',
                  },
                }, 'Log your first workout to see trends'),
          ),
        ),
      ),

      // Catalog search dialog
      React.createElement(ExerciseSearchDialog, {
        open: searchOpen,
        onOpenChange: setSearchOpen,
        onSelect: openLoggerForExercise,
      }),

      // Adaptive strength/cardio logger dialog
      React.createElement(ExerciseLogger, {
        open: loggerOpen,
        onOpenChange: setLoggerOpen,
        mode: loggerEntry ? 'edit' : 'create',
        exercise: loggerExercise,
        entry: loggerEntry,
        onSubmit: handleLoggerSubmit,
        onPreviousSetsRequest: fetchPreviousSets,
      }),
    );
  }

  // ---- Wellness Section ----
  function WellnessSection({ dateKey }: { dateKey: string }) {
    return React.createElement(AnimatedBlock, { delay: 0 },
      React.createElement(WellnessCard, { dateKey }),
    );
  }

  // ---- Root component ----
  return function TodayPage() {
    const [dateKey, setDateKey] = React.useState(() => toDateKey(new Date()));
    const diary = useDiary(dateKey);

    const [section, setSectionState] = React.useState<Section>(() => readSection());
    const setSection = React.useCallback((s: Section) => {
      setSectionState(s);
      writeSection(s);
    }, []);

    // Listen for popstate in case something else pushes URL state
    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      const handler = () => setSectionState(readSection());
      window.addEventListener('popstate', handler);
      return () => window.removeEventListener('popstate', handler);
    }, []);

    const sectionOptions = React.useMemo(() => [
      { value: 'food', label: 'Food', icon: 'Utensils' },
      { value: 'exercise', label: 'Exercise', icon: 'Flame' },
      { value: 'wellness', label: 'Wellness', icon: 'Moon' },
    ], []);

    return React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      },
    },
      // Top bar: date navigator (left) + segmented sub-nav (right)
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 20px',
          borderBottom: '1px solid var(--knf-hairline)',
          flexWrap: 'wrap',
        },
      },
        React.createElement(DateNavigator, { dateKey, onChange: setDateKey }),
        React.createElement(SegmentedControl, {
          value: section,
          onValueChange: (v: string) => setSection(v as Section),
          options: sectionOptions,
          size: 'md',
          ariaLabel: 'Today section',
        }),
      ),

      // Scrollable content area
      React.createElement(ScrollArea, { className: 'flex-1' },
        React.createElement('div', {
          style: { padding: 20, display: 'flex', flexDirection: 'column', gap: 16 },
        },
          diary.loading
            ? React.createElement('div', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 0',
                  color: 'var(--knf-muted)',
                  fontFamily: 'var(--knf-font-mono)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                },
              }, 'Loading\u2026')
            : section === 'food'
              ? React.createElement(FoodSection, { dateKey, diary })
              : section === 'exercise'
                ? React.createElement(ExerciseSection, { dateKey, diary })
                : React.createElement(WellnessSection, { dateKey }),
        ),
      ),
    );
  };
}

function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
