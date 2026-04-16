import type {
  SharedDependencies,
  DailySummary,
  Goals,
  ExerciseEntry,
  MealType,
  WellnessEntry,
} from '../types';
import { MEAL_TYPES, MEAL_LABELS } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey } from '../utils/date-helpers';
import {
  createSignatureCard,
  createStatTile,
  createMetricRing,
  createSparkline,
  createNumericReadout,
  createSemanticBadge,
  createPageHeader,
  createDataBar,
} from '../design-system/primitives';
import { SIG_PALETTE } from '../theme/palette';

interface MealTrailItem {
  name: string;
  time: string;
  mealType: MealType;
  calories: number;
}

interface OverviewData {
  today: DailySummary;
  goals: Goals;
  weeklyCalories: number[];
  weeklyBurn: number[];
  weeklyProtein: number[];
  weeklyCarbs: number[];
  weeklyFat: number[];
  weights: { date: string; weight_kg: number }[];
  todayExercise: ExerciseEntry[];
  recentMeals: MealTrailItem[];
  streak: number;
  streakDays: Set<string>;
  wellnessWeek: WellnessEntry[];
  hasAnyData: boolean;
}

const MONTH_ABBR = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function formatEyebrowDate(d: Date): string {
  return `${MONTH_ABBR[d.getMonth()]} \u00B7 ${d.getDate()} \u00B7 ${d.getFullYear()}`;
}

function formatTime(dateStr: string | number | Date | undefined): string {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'object' ? dateStr : new Date(dateStr);
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  } catch {
    return '';
  }
}

export function createOverviewPage(Shared: SharedDependencies) {
  const { React, lucideIcons, dateFns } = Shared;
  const {
    Flame,
    Moon,
    Footprints,
    Heart,
    Droplets,
    Scale,
    Plus,
    TrendingUp,
    TrendingDown,
    Utensils,
    ArrowRight,
    Dumbbell,
    Activity,
    Minus: MinusIcon,
  } = lucideIcons;

  const SignatureCard = createSignatureCard(Shared);
  const StatTile = createStatTile(Shared);
  const MetricRing = createMetricRing(Shared);
  const Sparkline = createSparkline(Shared);
  const NumericReadout = createNumericReadout(Shared);
  const SemanticBadge = createSemanticBadge(Shared);
  const PageHeader = createPageHeader(Shared);
  const DataBar = createDataBar(Shared);

  return function OverviewPage(props: { onQuickLog?: () => void }) {
    const { onQuickLog } = props ?? {};

    const [data, setData] = React.useState<OverviewData | null>(null);
    const [loading, setLoading] = React.useState(true);

    const now = React.useMemo(() => new Date(), []);
    const todayKey = React.useMemo(() => toDateKey(now), [now]);

    // Load everything needed for Overview
    const loadOverview = React.useCallback(async () => {
      const s = getStorage();

      // 1. Today's summary + goals
      const [todaySummary, goals, todayWeight, todayExerciseLog] =
        await Promise.all([
          s.getDailySummary(todayKey),
          s.getGoals(),
          s.getWeight(todayKey),
          s.getExercise(todayKey),
        ]);

      // 2. Last 7 day summaries (for sparklines + trio)
      const weekDates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        weekDates.push(toDateKey(dateFns.subDays(now, i)));
      }
      const weekSummaries = await Promise.all(
        weekDates.map((d) => s.getDailySummary(d)),
      );

      const weeklyCalories = weekSummaries.map((x) => x.calories);
      const weeklyBurn = weekSummaries.map((x) => x.exercise_calories);
      const weeklyProtein = weekSummaries.map((x) => x.protein_g);
      const weeklyCarbs = weekSummaries.map((x) => x.carbs_g);
      const weeklyFat = weekSummaries.map((x) => x.fat_g);

      // 3. Last 30 days of weights (sparkline on weight card)
      const startWeight = toDateKey(dateFns.subDays(now, 30));
      const weights = await s.getWeightRange(startWeight, todayKey);

      // 3b. Last 7 days of wellness (sleep/steps/HR tiles + sparklines)
      const wellnessStart = weekDates[0];
      const wellnessWeek = await s.getWellnessRange(wellnessStart, todayKey);

      // 4. Recent meals across today — pick last logged 4
      const recentMeals: MealTrailItem[] = [];
      const todayMeals = await s.getAllMeals(todayKey);
      // Walk meal types in natural eating order and pull entries
      for (const mt of MEAL_TYPES) {
        const m = todayMeals[mt];
        for (const entry of m.entries) {
          recentMeals.push({
            name: entry.food.name,
            time: MEAL_LABELS[mt],
            mealType: mt,
            calories: Math.round(entry.food.calories * entry.servings),
          });
        }
      }
      // If today has fewer than 4, backfill from yesterday
      if (recentMeals.length < 4) {
        const yKey = toDateKey(dateFns.subDays(now, 1));
        const yMeals = await s.getAllMeals(yKey);
        for (const mt of MEAL_TYPES) {
          const m = yMeals[mt];
          for (const entry of m.entries) {
            if (recentMeals.length >= 4) break;
            recentMeals.push({
              name: entry.food.name,
              time: `${MEAL_LABELS[mt]} \u00B7 Yesterday`,
              mealType: mt,
              calories: Math.round(entry.food.calories * entry.servings),
            });
          }
        }
      }
      const lastFourMeals = recentMeals.slice(-4).reverse();

      // 5. Compute streak + logged-day set for last 28 days
      const pluginsApi = (window as any).electronAPI?.pluginsStorageKeys;
      let allKeys: string[] = [];
      if (pluginsApi) {
        try {
          allKeys = await pluginsApi('knosys-fitness');
        } catch {
          allKeys = [];
        }
      }
      const loggedDates = new Set<string>();
      for (const key of allKeys) {
        const m = key.match(
          /^(?:log|exercise|weight|water|wellness):(\d{4}-\d{2}-\d{2})/,
        );
        if (m) loggedDates.add(m[1]);
      }
      let streak = 0;
      for (let i = 0; ; i++) {
        const d = toDateKey(dateFns.subDays(now, i));
        if (loggedDates.has(d)) streak++;
        else break;
      }

      const hasAnyWellness = wellnessWeek.some(
        (w) =>
          (w.sleep_minutes ?? 0) > 0 ||
          (w.steps ?? 0) > 0 ||
          (w.resting_hr_bpm ?? 0) > 0,
      );

      const hasAnyData =
        todaySummary.calories > 0 ||
        todaySummary.exercise_calories > 0 ||
        !!todayWeight ||
        lastFourMeals.length > 0 ||
        hasAnyWellness;

      return {
        today: todaySummary,
        goals,
        weeklyCalories,
        weeklyBurn,
        weeklyProtein,
        weeklyCarbs,
        weeklyFat,
        weights,
        todayExercise: todayExerciseLog.entries,
        recentMeals: lastFourMeals,
        streak,
        streakDays: loggedDates,
        wellnessWeek,
        hasAnyData,
      } as OverviewData;
    }, [todayKey, now, dateFns]);

    React.useEffect(() => {
      let alive = true;
      setLoading(true);
      loadOverview()
        .then((d) => {
          if (alive) {
            setData(d);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.warn('Overview load failed', err);
          if (alive) setLoading(false);
        });
      return () => {
        alive = false;
      };
    }, [loadOverview]);

    if (loading || !data) {
      return React.createElement(OverviewSkeleton, { React });
    }

    const goalsMet = countGoalsMet(data.today, data.goals);
    const goalsTotal = 8; // calories, protein, carbs, fat, water, exercise, weight, streak
    const dayName = DAY_NAMES[now.getDay()];
    const eyebrow = formatEyebrowDate(now);

    const caloriesRemaining = Math.max(
      0,
      data.goals.calories - data.today.calories,
    );
    const calorieTrend = computeTrend(data.weeklyCalories);
    const burnTrend = computeTrend(data.weeklyBurn);

    // Cold-start state — no meals, no weight today, no exercise
    if (!data.hasAnyData) {
      return React.createElement(ColdStartHero, {
        React,
        onQuickLog,
        eyebrow,
        dayName,
      });
    }

    // Macro ring segments (protein/carbs/fat)
    const macroSegments = [
      {
        value: data.today.protein_g,
        max: data.goals.protein_g,
        color: 'protein' as const,
        label: 'Protein',
      },
      {
        value: data.today.carbs_g,
        max: data.goals.carbs_g,
        color: 'carbs' as const,
        label: 'Carbs',
      },
      {
        value: data.today.fat_g,
        max: data.goals.fat_g,
        color: 'fat' as const,
        label: 'Fat',
      },
    ];

    const subtitle = `${goalsMet} of ${goalsTotal} goals \u00B7 ${onPaceLabel(data.today, data.goals)}`;

    // Streak dot-calendar (last 28 days)
    const streakCells: { key: string; logged: boolean }[] = [];
    for (let i = 27; i >= 0; i--) {
      const k = toDateKey(dateFns.subDays(now, i));
      streakCells.push({ key: k, logged: data.streakDays.has(k) });
    }

    // Weight delta
    const weightLatest =
      data.weights.length > 0
        ? data.weights[data.weights.length - 1].weight_kg
        : undefined;
    const weightOldest =
      data.weights.length > 0 ? data.weights[0].weight_kg : undefined;
    const weightDelta =
      weightLatest !== undefined && weightOldest !== undefined
        ? weightLatest - weightOldest
        : 0;

    const todayBurn = data.today.exercise_calories;

    return React.createElement(
      'div',
      {
        style: {
          padding: '28px 32px 40px',
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        },
      },
      // ---- Editorial hero ----
      React.createElement(
        'div',
        {
          className: 'knf-reveal',
          style: { animationDelay: '0ms' },
        },
        React.createElement(PageHeader, {
          eyebrow,
          title: dayName,
          subtitle,
          size: 'mega',
          trailing: React.createElement(SemanticBadge, {
            accent: 'hero',
            variant: 'soft',
            style: { padding: '6px 12px', fontSize: 11 },
            children: `${data.streak} day${data.streak === 1 ? '' : 's'} streak`,
          }),
        }),
      ),

      // ---- Hero stat trio ----
      React.createElement(
        'div',
        {
          className: 'knf-reveal',
          style: {
            animationDelay: '80ms',
            display: 'grid',
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            gap: 16,
          },
        },
        heroStatCard(React, {
          label: 'Consumed',
          value: data.today.calories,
          unit: 'kcal',
          accent: 'hero',
          spark: data.weeklyCalories,
          trend: calorieTrend,
          SignatureCard,
          NumericReadout,
          Sparkline,
        }),
        heroStatCard(React, {
          label: 'Remaining',
          value: caloriesRemaining,
          unit: 'kcal',
          accent: 'steps',
          spark: data.weeklyCalories.map((c, i) =>
            Math.max(0, data.goals.calories - c),
          ),
          trend: 'flat',
          SignatureCard,
          NumericReadout,
          Sparkline,
        }),
        heroStatCard(React, {
          label: 'Burned',
          value: todayBurn,
          unit: 'kcal',
          accent: 'cal-burn',
          spark: data.weeklyBurn,
          trend: burnTrend,
          SignatureCard,
          NumericReadout,
          Sparkline,
        }),
      ),

      // ---- Macro ring + Wellness strip row ----
      React.createElement(
        'div',
        {
          className: 'knf-reveal',
          style: {
            animationDelay: '160ms',
            display: 'grid',
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            gap: 16,
          },
        },
        // Macro ring card
        React.createElement(
          'div',
          {
            style: { gridColumn: 'span 5 / span 5' },
          },
          macroRingCard(React, {
            segments: macroSegments,
            calories: data.today.calories,
            goalCalories: data.goals.calories,
            caloriesRemaining,
            today: data.today,
            goals: data.goals,
            SignatureCard,
            MetricRing,
            DataBar,
          }),
        ),
        // Wellness strip
        React.createElement(
          'div',
          {
            style: { gridColumn: 'span 7 / span 7' },
          },
          wellnessStripCard(React, {
            weeklyCalories: data.weeklyCalories,
            goals: data.goals,
            today: data.today,
            wellnessWeek: data.wellnessWeek,
            SignatureCard,
            StatTile,
            onQuickLog,
            dateFns,
            now,
          }),
        ),
      ),

      // ---- Streak / Weight / Exercise row ----
      React.createElement(
        'div',
        {
          className: 'knf-reveal',
          style: {
            animationDelay: '240ms',
            display: 'grid',
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            gap: 16,
          },
        },
        React.createElement(
          'div',
          { style: { gridColumn: 'span 4 / span 4' } },
          streakCard(React, {
            streak: data.streak,
            cells: streakCells,
            SignatureCard,
            NumericReadout,
          }),
        ),
        React.createElement(
          'div',
          { style: { gridColumn: 'span 4 / span 4' } },
          weightCard(React, {
            weights: data.weights,
            latest: weightLatest,
            delta: weightDelta,
            SignatureCard,
            Sparkline,
            NumericReadout,
            onQuickLog,
            TrendingUp,
            TrendingDown,
            MinusIcon,
            Plus,
          }),
        ),
        React.createElement(
          'div',
          { style: { gridColumn: 'span 4 / span 4' } },
          exerciseCard(React, {
            entries: data.todayExercise,
            burn: todayBurn,
            SignatureCard,
            NumericReadout,
            onQuickLog,
            Flame,
            Dumbbell,
            Plus,
          }),
        ),
      ),

      // ---- Recent meals row ----
      React.createElement(
        'div',
        {
          className: 'knf-reveal',
          style: {
            animationDelay: '320ms',
          },
        },
        recentMealsCard(React, {
          meals: data.recentMeals,
          SignatureCard,
          onQuickLog,
          Utensils,
          ArrowRight,
        }),
      ),
    );
  };
}

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------

function countGoalsMet(today: DailySummary, goals: Goals): number {
  let met = 0;
  // within 10% of calorie target
  if (
    today.calories > 0 &&
    today.calories >= goals.calories * 0.9 &&
    today.calories <= goals.calories * 1.1
  )
    met++;
  if (today.protein_g >= goals.protein_g * 0.9) met++;
  if (today.carbs_g >= goals.carbs_g * 0.9) met++;
  if (today.fat_g >= goals.fat_g * 0.9) met++;
  if (today.water_ml >= goals.water_ml) met++;
  if (today.exercise_calories > 0) met++;
  if (today.weight_kg !== undefined) met++;
  // streak counts if any activity today
  if (
    today.calories > 0 ||
    today.exercise_calories > 0 ||
    today.water_ml > 0 ||
    today.weight_kg !== undefined
  )
    met++;
  return met;
}

function onPaceLabel(today: DailySummary, goals: Goals): string {
  const hourOfDay = new Date().getHours();
  if (hourOfDay < 1) return 'starting';
  const paceTarget = (goals.calories * hourOfDay) / 24;
  if (today.calories === 0) return 'no meals yet';
  if (today.calories > paceTarget * 1.15) return 'ahead of pace';
  if (today.calories < paceTarget * 0.75) return 'slow pace';
  return 'on pace';
}

function computeTrend(points: number[]): 'up' | 'down' | 'flat' {
  if (points.length < 2) return 'flat';
  const first = points[0];
  const last = points[points.length - 1];
  if (first === 0 && last === 0) return 'flat';
  if (last > first * 1.1) return 'up';
  if (last < first * 0.9) return 'down';
  return 'flat';
}

// --------------------------------------------------------------------
// Sub-components (plain factories reusing Shared pieces)
// --------------------------------------------------------------------

function OverviewSkeleton({ React }: { React: any }) {
  const block = (w: number | string, h: number, delay: number) =>
    React.createElement('div', {
      className: 'knf-reveal',
      style: {
        background: 'var(--knf-surface-2)',
        borderRadius: 'var(--knf-radius-md)',
        width: w,
        height: h,
        animationDelay: `${delay}ms`,
      },
    });

  return React.createElement(
    'div',
    {
      style: {
        padding: '28px 32px 40px',
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      },
    },
    React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      block(180, 12, 0),
      block(320, 72, 60),
      block(220, 16, 120),
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 16,
        },
      },
      block('100%', 160, 180),
      block('100%', 160, 240),
      block('100%', 160, 300),
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 16,
        },
      },
      block('100%', 280, 360),
      block('100%', 280, 420),
    ),
  );
}

function ColdStartHero({
  React,
  onQuickLog,
  eyebrow,
  dayName,
}: {
  React: any;
  onQuickLog?: () => void;
  eyebrow: string;
  dayName: string;
}) {
  return React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: 32,
      },
    },
    React.createElement(
      'div',
      {
        className: 'knf-reveal',
        style: {
          background: 'var(--knf-hero-wash)',
          border: '1px solid var(--knf-hero-edge)',
          borderRadius: 'var(--knf-radius-lg)',
          padding: '56px 48px',
          maxWidth: 640,
          textAlign: 'center',
          boxShadow: 'var(--knf-shadow-md)',
        },
      },
      React.createElement(
        'div',
        {
          className: 'knf-eyebrow',
          style: { marginBottom: 16 },
        },
        eyebrow,
      ),
      React.createElement(
        'h1',
        {
          className: 'knf-display-mega',
          style: {
            fontFamily: 'var(--knf-font-display)',
            fontSize: 'var(--knf-text-h1)',
            color: 'var(--knf-hero-ink)',
            margin: 0,
            marginBottom: 12,
            lineHeight: 1,
          },
        },
        'Log your first meal',
      ),
      React.createElement(
        'p',
        {
          style: {
            fontSize: 'var(--knf-text-lede)',
            color: 'var(--knf-ink-2)',
            margin: 0,
            marginBottom: 28,
            lineHeight: 1.5,
          },
        },
        `Happy ${dayName}. Start tracking today — your Overview fills in as you log meals, exercise, and weight.`,
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: onQuickLog,
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 28px',
            background: 'var(--knf-hero)',
            color: 'var(--knf-hero-ink)',
            border: '1px solid var(--knf-hero-edge)',
            borderRadius: 'var(--knf-radius-pill)',
            fontFamily: 'var(--knf-font-body)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--knf-shadow-sm)',
            transition:
              'transform var(--knf-duration-1) var(--knf-ease), box-shadow var(--knf-duration-1) var(--knf-ease)',
          },
        },
        'Open diary',
      ),
    ),
  );
}

function heroStatCard(
  React: any,
  opts: {
    label: string;
    value: number;
    unit: string;
    accent: any;
    spark: number[];
    trend: 'up' | 'down' | 'flat';
    SignatureCard: any;
    NumericReadout: any;
    Sparkline: any;
  },
) {
  const { label, value, unit, accent, spark, SignatureCard, NumericReadout, Sparkline } = opts;

  return React.createElement(
    'div',
    { style: { gridColumn: 'span 4 / span 4' } },
    React.createElement(
      SignatureCard,
      {
        accent,
        padding: 'lg',
        interactive: false,
        style: { minHeight: 172 },
      },
      React.createElement(
        'div',
        {
          className: 'knf-eyebrow',
          style: { marginBottom: 8, fontSize: 11 },
        },
        label.toUpperCase(),
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            lineHeight: 1,
            marginBottom: 16,
          },
        },
        React.createElement(NumericReadout, {
          value: value,
          as: 'span',
          className: 'knf-mono',
          style: {
            fontSize: 'var(--knf-text-mega)',
            fontFamily: 'var(--knf-font-display)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--knf-ink)',
            lineHeight: 0.9,
            fontVariationSettings: '"wdth" 92, "GRAD" 120',
          },
        }),
        React.createElement(
          'span',
          {
            style: {
              fontSize: 14,
              color: 'var(--knf-muted)',
              fontFamily: 'var(--knf-font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 500,
            },
          },
          unit,
        ),
      ),
      spark && spark.length >= 2
        ? React.createElement(
            'div',
            {
              style: {
                marginTop: 'auto',
                marginLeft: '-8px',
                marginRight: '-8px',
              },
            },
            React.createElement(Sparkline, {
              values: spark,
              color: accent,
              width: 260,
              height: 36,
              strokeWidth: 2,
              fill: true,
              showLastDot: true,
              style: { width: '100%', height: 36 },
            }),
          )
        : null,
    ),
  );
}

function macroRingCard(
  React: any,
  opts: {
    segments: any[];
    calories: number;
    goalCalories: number;
    caloriesRemaining: number;
    today: DailySummary;
    goals: Goals;
    SignatureCard: any;
    MetricRing: any;
    DataBar: any;
  },
) {
  const {
    segments,
    caloriesRemaining,
    today,
    goals,
    SignatureCard,
    MetricRing,
    DataBar,
  } = opts;

  return React.createElement(
    SignatureCard,
    {
      padding: 'lg',
      style: { height: '100%' },
    },
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          height: '100%',
        },
      },
      // Ring
      React.createElement(
        'div',
        {
          style: { flexShrink: 0 },
        },
        React.createElement(MetricRing, {
          segments,
          size: 168,
          centerValue: String(caloriesRemaining),
          centerLabel: 'CALORIES LEFT',
        }),
      ),
      // Macro bars
      React.createElement(
        'div',
        {
          style: {
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          },
        },
        React.createElement(
          'div',
          {
            className: 'knf-eyebrow',
            style: { marginBottom: 2 },
          },
          'MACROS TODAY',
        ),
        React.createElement(DataBar, {
          value: today.protein_g,
          max: goals.protein_g,
          accent: 'protein',
          label: 'Protein',
          showValue: true,
          formatValue: (v: number) => `${Math.round(v)}g`,
          height: 8,
        }),
        React.createElement(DataBar, {
          value: today.carbs_g,
          max: goals.carbs_g,
          accent: 'carbs',
          label: 'Carbs',
          showValue: true,
          formatValue: (v: number) => `${Math.round(v)}g`,
          height: 8,
        }),
        React.createElement(DataBar, {
          value: today.fat_g,
          max: goals.fat_g,
          accent: 'fat',
          label: 'Fat',
          showValue: true,
          formatValue: (v: number) => `${Math.round(v)}g`,
          height: 8,
        }),
      ),
    ),
  );
}

function wellnessStripCard(
  React: any,
  opts: {
    weeklyCalories: number[];
    goals: Goals;
    today: DailySummary;
    wellnessWeek: WellnessEntry[];
    SignatureCard: any;
    StatTile: any;
    onQuickLog?: () => void;
    dateFns: any;
    now: Date;
  },
) {
  const { goals, today, wellnessWeek, SignatureCard, StatTile, dateFns, now } = opts;

  // Build a 7-day index keyed by date for fast lookup
  const byDate = new Map<string, WellnessEntry>();
  for (const w of wellnessWeek) byDate.set(w.date, w);

  // Today's entry (may be missing — then most-recent falls through)
  const todayKey = toDateKey(now);
  const todayEntry = byDate.get(todayKey);
  const mostRecent = wellnessWeek.length > 0 ? wellnessWeek[wellnessWeek.length - 1] : null;

  // Build sparklines — 7 cells, zero-fill missing days
  const sleepSpark: number[] = [];
  const stepsSpark: number[] = [];
  const hrSpark: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const k = toDateKey(dateFns.subDays(now, i));
    const w = byDate.get(k);
    sleepSpark.push(w?.sleep_minutes ?? 0);
    stepsSpark.push(w?.steps ?? 0);
    hrSpark.push(w?.resting_hr_bpm ?? 0);
  }

  // Pick current values — today if present, else most recent
  const sleepCur = todayEntry?.sleep_minutes ?? mostRecent?.sleep_minutes;
  const stepsCur = todayEntry?.steps ?? mostRecent?.steps;
  const hrCur = todayEntry?.resting_hr_bpm ?? mostRecent?.resting_hr_bpm;

  const sleepHours = sleepCur != null ? Math.round((sleepCur / 60) * 10) / 10 : null;
  const sleepHint = sleepCur != null
    ? (todayEntry?.sleep_minutes != null ? 'today' : `on ${mostRecent?.date}`)
    : 'Tap today to log';
  const stepsHint = stepsCur != null
    ? (todayEntry?.steps != null ? 'today' : `on ${mostRecent?.date}`)
    : 'Tap today to log';
  const hrHint = hrCur != null
    ? (todayEntry?.resting_hr_bpm != null ? 'today' : `on ${mostRecent?.date}`)
    : 'Tap today to log';

  const tiles: any[] = [];

  tiles.push(
    React.createElement(StatTile, {
      key: 'sleep',
      icon: 'Moon',
      label: 'SLEEP',
      value: sleepHours != null ? sleepHours : '\u2014',
      unit: 'h',
      accent: 'sleep',
      hint: sleepHint,
      sparkline: sleepSpark,
    }),
  );
  tiles.push(
    React.createElement(StatTile, {
      key: 'steps',
      icon: 'Footprints',
      label: 'STEPS',
      value: stepsCur != null ? stepsCur.toLocaleString() : '\u2014',
      accent: 'steps',
      hint: stepsHint,
      sparkline: stepsSpark,
    }),
  );
  tiles.push(
    React.createElement(StatTile, {
      key: 'heart',
      icon: 'Heart',
      label: 'RESTING HR',
      value: hrCur != null ? hrCur : '\u2014',
      unit: 'bpm',
      accent: 'heart',
      hint: hrHint,
      sparkline: hrSpark,
    }),
  );
  tiles.push(
    React.createElement(StatTile, {
      key: 'water',
      icon: 'Droplets',
      label: 'HYDRATION',
      value: Math.round(today.water_ml / 100) / 10,
      unit: 'L',
      accent: 'hydration',
      hint: `${Math.round((today.water_ml / goals.water_ml) * 100)}% of goal`,
      sparkline: [today.water_ml],
    }),
  );

  return React.createElement(
    SignatureCard,
    {
      padding: 'lg',
      style: { height: '100%' },
    },
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        },
      },
      React.createElement(
        'div',
        {
          className: 'knf-eyebrow',
        },
        'WELLNESS',
      ),
      React.createElement(
        'span',
        {
          style: {
            fontFamily: 'var(--knf-font-mono)',
            fontSize: 11,
            color: 'var(--knf-muted)',
            letterSpacing: '0.08em',
          },
        },
        'TODAY',
      ),
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 10,
        },
      },
      ...tiles,
    ),
  );
}

function streakCard(
  React: any,
  opts: {
    streak: number;
    cells: { key: string; logged: boolean }[];
    SignatureCard: any;
    NumericReadout: any;
  },
) {
  const { streak, cells, SignatureCard, NumericReadout } = opts;

  // 7 cols × 4 rows = 28 cells
  const rows: any[] = [];
  for (let r = 0; r < 4; r++) {
    const row: any[] = [];
    for (let c = 0; c < 7; c++) {
      const idx = r * 7 + c;
      const cell = cells[idx];
      if (!cell) continue;
      row.push(
        React.createElement('div', {
          key: cell.key,
          'aria-hidden': true,
          style: {
            width: 12,
            height: 12,
            borderRadius: 3,
            background: cell.logged
              ? 'var(--knf-hero)'
              : 'var(--knf-hairline)',
            border: cell.logged
              ? '1px solid var(--knf-hero-edge)'
              : '1px solid transparent',
            transition: 'background-color var(--knf-duration-1) var(--knf-ease)',
          },
        }),
      );
    }
    rows.push(
      React.createElement(
        'div',
        {
          key: `row-${r}`,
          style: { display: 'flex', gap: 5 },
        },
        ...row,
      ),
    );
  }

  return React.createElement(
    SignatureCard,
    {
      padding: 'lg',
      style: { height: '100%' },
    },
    React.createElement(
      'div',
      {
        className: 'knf-eyebrow',
        style: { marginBottom: 10 },
      },
      'STREAK',
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 20,
        },
      },
      React.createElement(NumericReadout, {
        value: streak,
        style: {
          fontFamily: 'var(--knf-font-display)',
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--knf-ink)',
          lineHeight: 0.9,
          fontVariationSettings: '"wdth" 92, "GRAD" 120',
        },
      }),
      React.createElement(
        'span',
        {
          style: {
            fontSize: 13,
            color: 'var(--knf-muted)',
            fontFamily: 'var(--knf-font-mono)',
          },
        },
        streak === 1 ? 'day' : 'days',
      ),
    ),
    React.createElement(
      'div',
      {
        style: { display: 'flex', flexDirection: 'column', gap: 5 },
      },
      ...rows,
    ),
    React.createElement(
      'div',
      {
        style: {
          marginTop: 12,
          fontSize: 11,
          color: 'var(--knf-muted)',
          fontFamily: 'var(--knf-font-mono)',
          letterSpacing: '0.06em',
        },
      },
      'LAST 28 DAYS',
    ),
  );
}

function weightCard(
  React: any,
  opts: {
    weights: { date: string; weight_kg: number }[];
    latest?: number;
    delta: number;
    SignatureCard: any;
    Sparkline: any;
    NumericReadout: any;
    onQuickLog?: () => void;
    TrendingUp: any;
    TrendingDown: any;
    MinusIcon: any;
    Plus: any;
  },
) {
  const {
    weights,
    latest,
    delta,
    SignatureCard,
    Sparkline,
    NumericReadout,
    onQuickLog,
    TrendingUp,
    TrendingDown,
    MinusIcon,
    Plus,
  } = opts;

  const hasData = weights.length > 0 && latest !== undefined;
  const trendColor =
    delta < -0.1
      ? SIG_PALETTE.weightDown
      : delta > 0.1
        ? SIG_PALETTE.weightUp
        : SIG_PALETTE.muted;
  const TrendIcon = delta < -0.1 ? TrendingDown : delta > 0.1 ? TrendingUp : MinusIcon;

  return React.createElement(
    SignatureCard,
    {
      padding: 'lg',
      style: { height: '100%' },
    },
    React.createElement(
      'div',
      {
        className: 'knf-eyebrow',
        style: { marginBottom: 10 },
      },
      'WEIGHT',
    ),
    hasData
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                marginBottom: 8,
              },
            },
            React.createElement(NumericReadout, {
              value: latest!,
              decimals: 1,
              style: {
                fontFamily: 'var(--knf-font-display)',
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--knf-ink)',
                lineHeight: 0.9,
              },
            }),
            React.createElement(
              'span',
              {
                style: {
                  fontSize: 13,
                  color: 'var(--knf-muted)',
                  fontFamily: 'var(--knf-font-mono)',
                },
              },
              'kg',
            ),
          ),
          weights.length >= 2
            ? React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 16,
                    fontSize: 12,
                    color: trendColor,
                    fontFamily: 'var(--knf-font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                  },
                },
                React.createElement(TrendIcon, { style: { width: 14, height: 14 } }),
                `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg \u00B7 ${weights.length} entries`,
              )
            : React.createElement('div', { style: { height: 16, marginBottom: 16 } }),
          weights.length >= 2
            ? React.createElement(
                'div',
                { style: { marginLeft: '-6px', marginRight: '-6px', marginBottom: 12 } },
                React.createElement(Sparkline, {
                  values: weights.map((w) => w.weight_kg),
                  color: delta < 0 ? 'weight-down' : 'weight-up',
                  width: 260,
                  height: 40,
                  strokeWidth: 2,
                  fill: true,
                  showLastDot: true,
                  style: { width: '100%', height: 40 },
                }),
              )
            : null,
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: onQuickLog,
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                background: 'var(--knf-hero)',
                color: 'var(--knf-hero-ink)',
                border: '1px solid var(--knf-hero-edge)',
                borderRadius: 'var(--knf-radius-pill)',
                fontFamily: 'var(--knf-font-body)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                lineHeight: 1,
              },
            },
            React.createElement(Plus, { style: { width: 12, height: 12 } }),
            'Log today',
          ),
        )
      : React.createElement(
          'div',
          {
            style: {
              fontSize: 13,
              color: 'var(--knf-muted)',
              padding: '20px 0 12px',
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontFamily: 'var(--knf-font-display)',
                fontSize: 22,
                color: 'var(--knf-ink)',
                marginBottom: 6,
              },
            },
            'No weigh-ins yet',
          ),
          React.createElement(
            'p',
            {
              style: { margin: '0 0 16px', fontSize: 13, lineHeight: 1.5 },
            },
            'Log a weight to start seeing trends.',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: onQuickLog,
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                background: 'var(--knf-hero)',
                color: 'var(--knf-hero-ink)',
                border: '1px solid var(--knf-hero-edge)',
                borderRadius: 'var(--knf-radius-pill)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              },
            },
            React.createElement(Plus, { style: { width: 12, height: 12 } }),
            'Log weight',
          ),
        ),
  );
}

function exerciseCard(
  React: any,
  opts: {
    entries: ExerciseEntry[];
    burn: number;
    SignatureCard: any;
    NumericReadout: any;
    onQuickLog?: () => void;
    Flame: any;
    Dumbbell: any;
    Plus: any;
  },
) {
  const {
    entries,
    burn,
    SignatureCard,
    NumericReadout,
    onQuickLog,
    Flame,
    Dumbbell,
    Plus,
  } = opts;

  const top = entries.slice(0, 3);

  return React.createElement(
    SignatureCard,
    {
      padding: 'lg',
      style: { height: '100%' },
    },
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        },
      },
      React.createElement(
        'div',
        {
          className: 'knf-eyebrow',
        },
        'EXERCISE',
      ),
      React.createElement(Flame, {
        style: { width: 14, height: 14, color: SIG_PALETTE.calBurn },
      }),
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          marginBottom: 16,
        },
      },
      React.createElement(NumericReadout, {
        value: burn,
        style: {
          fontFamily: 'var(--knf-font-display)',
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--knf-ink)',
          lineHeight: 0.9,
        },
      }),
      React.createElement(
        'span',
        {
          style: {
            fontSize: 13,
            color: 'var(--knf-muted)',
            fontFamily: 'var(--knf-font-mono)',
          },
        },
        'kcal burned',
      ),
    ),
    top.length > 0
      ? React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginBottom: 12,
            },
          },
          ...top.map((e) =>
            React.createElement(
              'div',
              {
                key: e.id,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--knf-hairline)',
                },
              },
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minWidth: 0,
                    flex: 1,
                  },
                },
                React.createElement(Dumbbell, {
                  style: {
                    width: 12,
                    height: 12,
                    color: SIG_PALETTE.calBurn,
                    flexShrink: 0,
                  },
                }),
                React.createElement(
                  'span',
                  {
                    style: {
                      fontSize: 13,
                      color: 'var(--knf-ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  e.name,
                ),
                React.createElement(
                  'span',
                  {
                    style: {
                      fontSize: 11,
                      color: 'var(--knf-muted)',
                      fontFamily: 'var(--knf-font-mono)',
                    },
                  },
                  `${e.duration_min ?? 0}m`,
                ),
              ),
              React.createElement(
                'span',
                {
                  style: {
                    fontFamily: 'var(--knf-font-mono)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--knf-ink)',
                    fontVariantNumeric: 'tabular-nums',
                  },
                },
                `${e.calories_burned ?? 0}`,
              ),
            ),
          ),
        )
      : React.createElement(
          'p',
          {
            style: {
              margin: 0,
              marginBottom: 12,
              fontSize: 13,
              color: 'var(--knf-muted)',
              lineHeight: 1.45,
            },
          },
          'No exercise logged today.',
        ),
    React.createElement(
      'button',
      {
        type: 'button',
        onClick: onQuickLog,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 12px',
          background: 'transparent',
          color: 'var(--knf-ink)',
          border: '1px solid var(--knf-hairline)',
          borderRadius: 'var(--knf-radius-pill)',
          fontFamily: 'var(--knf-font-body)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          lineHeight: 1,
        },
      },
      React.createElement(Plus, { style: { width: 12, height: 12 } }),
      'Add exercise',
    ),
  );
}

function recentMealsCard(
  React: any,
  opts: {
    meals: MealTrailItem[];
    SignatureCard: any;
    onQuickLog?: () => void;
    Utensils: any;
    ArrowRight: any;
  },
) {
  const { meals, SignatureCard, onQuickLog, Utensils, ArrowRight } = opts;

  return React.createElement(
    SignatureCard,
    {
      padding: 'lg',
    },
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        },
      },
      React.createElement(
        'div',
        {
          className: 'knf-eyebrow',
        },
        'RECENT MEALS',
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: onQuickLog,
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            color: 'var(--knf-hero-ink)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          },
        },
        'View diary',
        React.createElement(ArrowRight, { style: { width: 12, height: 12 } }),
      ),
    ),
    meals.length === 0
      ? React.createElement(
          'div',
          {
            style: {
              padding: '20px 0',
              color: 'var(--knf-muted)',
              fontSize: 13,
              textAlign: 'center',
            },
          },
          'No meals logged yet — open the diary to start tracking.',
        )
      : React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.max(1, meals.length)}, minmax(0, 1fr))`,
              gap: 12,
            },
          },
          ...meals.map((meal, i) =>
            React.createElement(
              'div',
              {
                key: `${meal.name}-${i}`,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--knf-surface-2)',
                  borderRadius: 'var(--knf-radius-md)',
                  minWidth: 0,
                },
              },
              React.createElement(
                'div',
                {
                  'aria-hidden': true,
                  style: {
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--knf-hero-wash)',
                    color: 'var(--knf-hero-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--knf-font-display)',
                    fontWeight: 700,
                    fontSize: 16,
                    flexShrink: 0,
                    border: '1px solid var(--knf-hero-edge)',
                  },
                },
                meal.name.trim().charAt(0).toUpperCase() || '?',
              ),
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    minWidth: 0,
                    flex: 1,
                  },
                },
                React.createElement(
                  'div',
                  {
                    style: {
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--knf-ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  meal.name,
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      fontSize: 11,
                      color: 'var(--knf-muted)',
                      fontFamily: 'var(--knf-font-mono)',
                      letterSpacing: '0.04em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  `${meal.time} \u00B7 ${meal.calories} kcal`,
                ),
              ),
            ),
          ),
        ),
  );
}
