import type {
  SharedDependencies,
  DailySummary,
  WellnessEntry,
} from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey, fromDateKey } from '../utils/date-helpers';
import { SIG_PALETTE } from '../theme';
import {
  createPageHeader,
  createSegmentedControl,
  createSignatureCard,
  createStatTile,
  createNumericReadout,
} from '../design-system/primitives';
import { createEmptyState } from '../components/empty-state';
import { createChartSkeleton, createTileSkeleton } from '../components/skeleton';

type RangeKey = '7d' | '30d' | '90d' | '1y';

const RANGE_DAYS: Record<RangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

// Recharts color constants we reference from SIG_PALETTE
// (documented in the report):
//   hero, calBurn, protein, carbs, fat, hydration,
//   sleep, steps, heart, weightDown, muted, hairline, ink

export function createTrendsPage(Shared: SharedDependencies) {
  const {
    React,
    recharts,
    cn,
    lucideIcons,
    dateFns,
  } = Shared;

  const {
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    ReferenceLine,
    Tooltip,
    ResponsiveContainer,
  } = recharts;

  const PageHeader = createPageHeader(Shared);
  const SegmentedControl = createSegmentedControl(Shared);
  const SignatureCard = createSignatureCard(Shared);
  const StatTile = createStatTile(Shared);
  const NumericReadout = createNumericReadout(Shared);
  const EmptyState = createEmptyState(Shared);
  const ChartSkeleton = createChartSkeleton(Shared);
  const TileSkeleton = createTileSkeleton(Shared);

  interface TrendDay {
    date: string;
    label: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
    exercise_calories: number;
    weight_kg?: number;
    sleep_minutes?: number;
    steps?: number;
    resting_hr_bpm?: number;
  }

  // ---------------------------------------------------------------
  // Sub-component: range pill group (custom — we need chartreuse wash)
  // ---------------------------------------------------------------
  function RangePills({
    value,
    onChange,
  }: {
    value: RangeKey;
    onChange: (v: RangeKey) => void;
  }) {
    const options: { value: RangeKey; label: string }[] = [
      { value: '7d', label: '7D' },
      { value: '30d', label: '30D' },
      { value: '90d', label: '90D' },
      { value: '1y', label: '1Y' },
    ];
    return React.createElement(SegmentedControl, {
      value,
      onValueChange: (v: string) => onChange(v as RangeKey),
      options,
      size: 'sm',
      ariaLabel: 'Time range',
    });
  }

  // ---------------------------------------------------------------
  // Tooltip — signature styling
  // ---------------------------------------------------------------
  function tooltipContentStyle() {
    return {
      background: 'var(--knf-surface)',
      border: '1px solid var(--knf-hairline)',
      borderRadius: 'var(--knf-radius-md)',
      boxShadow: 'var(--knf-shadow-md)',
      padding: '8px 10px',
      fontSize: 12,
      fontFamily: 'var(--knf-font-mono)',
    };
  }

  // Small empty placeholder rendered INSIDE a chart card when the range
  // has no data for a metric.
  function ChartEmpty({ message, height = 200 }: { message: string; height?: number }) {
    return React.createElement(
      'div',
      {
        style: {
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--knf-muted)',
          fontSize: 12,
          fontFamily: 'var(--knf-font-mono)',
          letterSpacing: '0.04em',
          background: 'var(--knf-surface-2)',
          borderRadius: 'var(--knf-radius-md)',
          border: '1px dashed var(--knf-hairline)',
        },
      },
      message,
    );
  }

  // Card title row — eyebrow + heading + right-side accessory
  function ChartHead({
    eyebrow,
    title,
    right,
  }: {
    eyebrow: string;
    title: string;
    right?: any;
  }) {
    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 10,
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
        React.createElement(
          'div',
          {
            className: 'knf-eyebrow',
            style: { fontSize: 10 },
          },
          eyebrow,
        ),
        React.createElement(
          'div',
          {
            className: 'knf-display',
            style: {
              fontSize: 'var(--knf-text-h5)',
              fontWeight: 600,
              color: 'var(--knf-ink)',
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
            },
          },
          title,
        ),
      ),
      right ?? null,
    );
  }

  // =========================================================================
  // MAIN PAGE
  // =========================================================================
  return function TrendsPage() {
    const [range, setRange] = React.useState<RangeKey>(() => {
      if (typeof window === 'undefined') return '30d';
      const sp = new URLSearchParams(window.location.search);
      const r = sp.get('range') as RangeKey | null;
      if (r && r in RANGE_DAYS) return r;
      return '30d';
    });

    const [data, setData] = React.useState<TrendDay[]>([]);
    const [weightAllTime, setWeightAllTime] = React.useState<
      { date: string; weight_kg: number }[]
    >([]);
    const [goalWeight, setGoalWeight] = React.useState<number | null>(null);
    const [loading, setLoading] = React.useState(true);

    // Sync URL
    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      const sp = new URLSearchParams(window.location.search);
      sp.set('tab', 'trends');
      sp.set('range', range);
      const next = `${window.location.pathname}?${sp.toString()}`;
      if (next !== window.location.pathname + window.location.search) {
        window.history.replaceState(null, '', next);
      }
    }, [range]);

    const load = React.useCallback(async () => {
      setLoading(true);
      const s = getStorage();
      const days = RANGE_DAYS[range];
      const endDate = new Date();
      const endKey = toDateKey(endDate);
      const startKey = toDateKey(dateFns.subDays(endDate, days - 1));

      // Parallel fetches for the window
      const [weightRange, wellnessRange, profile] = await Promise.all([
        s.getWeightRange(startKey, endKey),
        s.getWellnessRange(startKey, endKey),
        s.getProfile(),
      ]);

      const weightMap = new Map(
        weightRange.map((w) => [w.date, w.weight_kg]),
      );
      const wellnessMap = new Map(wellnessRange.map((w) => [w.date, w]));

      // Daily summaries in parallel
      const dateKeys: string[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = dateFns.subDays(endDate, i);
        dateKeys.push(toDateKey(d));
      }

      const summaries = await Promise.all(
        dateKeys.map((k) => s.getDailySummary(k)),
      );

      const dense: TrendDay[] = dateKeys.map((key, i) => {
        const d = fromDateKey(key);
        const sum = summaries[i] as DailySummary;
        const well = wellnessMap.get(key);
        const weight = weightMap.get(key);
        const label =
          days <= 7
            ? dateFns.format(d, 'EEE')
            : days <= 30
              ? dateFns.format(d, 'M/d')
              : dateFns.format(d, 'MMM d');
        return {
          date: key,
          label,
          calories: sum.calories ?? 0,
          protein_g: sum.protein_g ?? 0,
          carbs_g: sum.carbs_g ?? 0,
          fat_g: sum.fat_g ?? 0,
          water_ml: sum.water_ml ?? 0,
          exercise_calories: sum.exercise_calories ?? 0,
          weight_kg: weight,
          sleep_minutes: well?.sleep_minutes,
          steps: well?.steps,
          resting_hr_bpm: well?.resting_hr_bpm,
        };
      });

      setData(dense);
      setGoalWeight(profile.goal_weight_kg ?? null);

      // All-time weight for goal projection regression.
      const allKeys = await getStorage()['getWeightRange']
        ? await s.getWeightRange('0000-00-00', '9999-99-99')
        : [];
      setWeightAllTime(allKeys);

      setLoading(false);
    }, [range, dateFns]);

    React.useEffect(() => {
      load();
    }, [load]);

    // ---------------------------------------------------------------
    // Derived summaries
    // ---------------------------------------------------------------
    const summary = React.useMemo(() => {
      if (data.length === 0) {
        return {
          avgCal: 0,
          avgProtein: 0,
          weightDelta: 0,
          hasWeight: false,
          avgSteps: 0,
          hasSteps: false,
          calSpark: [] as number[],
          proteinSpark: [] as number[],
          stepsSpark: [] as number[],
          weightSpark: [] as number[],
        };
      }
      const nonZeroCal = data.filter((d) => d.calories > 0);
      const nonZeroProtein = data.filter((d) => d.protein_g > 0);
      const weightPoints = data
        .filter((d) => d.weight_kg !== undefined)
        .map((d) => d.weight_kg as number);
      const stepsPoints = data
        .filter((d) => d.steps !== undefined)
        .map((d) => d.steps as number);

      const avgCal = nonZeroCal.length
        ? Math.round(
            nonZeroCal.reduce((s, d) => s + d.calories, 0) / nonZeroCal.length,
          )
        : 0;
      const avgProtein = nonZeroProtein.length
        ? Math.round(
            nonZeroProtein.reduce((s, d) => s + d.protein_g, 0) /
              nonZeroProtein.length,
          )
        : 0;
      const weightDelta =
        weightPoints.length >= 2
          ? weightPoints[weightPoints.length - 1] - weightPoints[0]
          : 0;
      const avgSteps = stepsPoints.length
        ? Math.round(
            stepsPoints.reduce((s, v) => s + v, 0) / stepsPoints.length,
          )
        : 0;

      return {
        avgCal,
        avgProtein,
        weightDelta,
        hasWeight: weightPoints.length >= 1,
        avgSteps,
        hasSteps: stepsPoints.length >= 1,
        calSpark: data.map((d) => d.calories),
        proteinSpark: data.map((d) => d.protein_g),
        stepsSpark: data.map((d) => d.steps ?? 0),
        weightSpark: weightPoints,
      };
    }, [data]);

    // Weight data prepared for chart (only rows that have weight)
    const weightChartData = React.useMemo(
      () =>
        data
          .filter((d) => d.weight_kg !== undefined)
          .map((d) => ({ label: d.label, weight: d.weight_kg })),
      [data],
    );

    // Days-to-goal projection using simple linear regression on weight
    const daysToGoal = React.useMemo(() => {
      if (goalWeight === null) return null;
      if (weightChartData.length < 3) return null;
      const xs = weightChartData.map((_, i) => i);
      const ys = weightChartData.map((d) => d.weight as number);
      const n = xs.length;
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
      const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
      const denom = n * sumX2 - sumX * sumX;
      if (denom === 0) return null;
      const slope = (n * sumXY - sumX * sumY) / denom;
      const intercept = (sumY - slope * sumX) / n;
      // solve: goal = slope*x + intercept → x = (goal - intercept)/slope
      if (Math.abs(slope) < 0.0001) return null;
      const last = n - 1;
      const target = (goalWeight - intercept) / slope;
      const daysRemaining = Math.round(target - last);
      if (!isFinite(daysRemaining) || daysRemaining <= 0) return null;
      return daysRemaining;
    }, [goalWeight, weightChartData]);

    const currentWeight = weightChartData.length
      ? (weightChartData[weightChartData.length - 1].weight as number)
      : null;
    const weightDelta = summary.weightDelta;

    // Calorie in/out data
    const calInOutData = data.map((d) => ({
      label: d.label,
      consumed: d.calories,
      burned: d.exercise_calories,
    }));

    const macroData = data.map((d) => ({
      label: d.label,
      protein: d.protein_g,
      carbs: d.carbs_g,
      fat: d.fat_g,
    }));

    const waterData = data.map((d) => ({
      label: d.label,
      water: d.water_ml,
    }));

    const exerciseData = data.map((d) => ({
      label: d.label,
      burned: d.exercise_calories,
    }));

    const hasCalories = data.some((d) => d.calories > 0);
    const hasMacros = data.some(
      (d) => d.protein_g > 0 || d.carbs_g > 0 || d.fat_g > 0,
    );
    const hasWater = data.some((d) => d.water_ml > 0);
    const hasExercise = data.some((d) => d.exercise_calories > 0);
    const hasWeightData = weightChartData.length >= 1;

    const wellnessRangeData = data.map((d) => ({
      label: d.label,
      sleep: d.sleep_minutes ?? null,
      steps: d.steps ?? null,
      hr: d.resting_hr_bpm ?? null,
    }));
    const hasAnyWellness = wellnessRangeData.some(
      (d) => d.sleep !== null || d.steps !== null || d.hr !== null,
    );

    // ---------------------------------------------------------------
    // Loading skeleton
    // ---------------------------------------------------------------
    if (loading) {
      return React.createElement(
        'div',
        {
          style: {
            padding: '32px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            maxWidth: 1360,
            margin: '0 auto',
          },
        },
        React.createElement(PageHeader, {
          eyebrow: 'ANALYTICS',
          title: 'Trends',
          trailing: React.createElement(RangePills, {
            value: range,
            onChange: setRange,
          }),
        }),
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
            },
          },
          ...[0, 1, 2, 3].map((i) =>
            React.createElement(TileSkeleton, { key: i }),
          ),
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              gap: 16,
            },
          },
          React.createElement(
            'div',
            { style: { gridColumn: 'span 8' } },
            React.createElement(ChartSkeleton, { height: 280 }),
          ),
          React.createElement(
            'div',
            { style: { gridColumn: 'span 4' } },
            React.createElement(ChartSkeleton, { height: 280 }),
          ),
          React.createElement(
            'div',
            { style: { gridColumn: 'span 6' } },
            React.createElement(ChartSkeleton, { height: 220 }),
          ),
          React.createElement(
            'div',
            { style: { gridColumn: 'span 6' } },
            React.createElement(ChartSkeleton, { height: 220 }),
          ),
        ),
      );
    }

    // ---------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------
    return React.createElement(
      'div',
      {
        style: {
          padding: '32px 40px 64px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          maxWidth: 1360,
          margin: '0 auto',
        },
      },

      // Page header
      React.createElement(PageHeader, {
        eyebrow: 'ANALYTICS',
        title: 'Trends',
        subtitle: `Past ${RANGE_DAYS[range]} days — ${data.length} day${data.length === 1 ? '' : 's'}`,
        trailing: React.createElement(RangePills, {
          value: range,
          onChange: setRange,
        }),
      }),

      // Summary tiles row
      React.createElement(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
          },
        },
        React.createElement(StatTile, {
          icon: 'Flame',
          label: 'Avg Calories',
          value: summary.avgCal || '—',
          unit: summary.avgCal ? 'kcal' : undefined,
          hint: `${data.length} days`,
          accent: 'hero',
          sparkline: summary.calSpark,
        }),
        React.createElement(StatTile, {
          icon: 'Beef',
          label: 'Avg Protein',
          value: summary.avgProtein || '—',
          unit: summary.avgProtein ? 'g' : undefined,
          hint: 'per day',
          accent: 'protein',
          sparkline: summary.proteinSpark,
        }),
        React.createElement(StatTile, {
          icon: 'Scale',
          label: 'Weight Δ',
          value:
            summary.hasWeight && weightChartData.length >= 2
              ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}`
              : '—',
          unit:
            summary.hasWeight && weightChartData.length >= 2 ? 'kg' : undefined,
          hint: 'across range',
          accent:
            weightDelta < 0
              ? 'weight-down'
              : weightDelta > 0
                ? 'weight-up'
                : 'muted',
          trend:
            weightDelta < -0.05
              ? 'down'
              : weightDelta > 0.05
                ? 'up'
                : 'flat',
          sparkline: summary.weightSpark,
        }),
        React.createElement(StatTile, {
          icon: 'Footprints',
          label: 'Avg Steps',
          value: summary.hasSteps ? summary.avgSteps.toLocaleString() : '—',
          unit: summary.hasSteps ? 'steps' : undefined,
          hint: 'per logged day',
          accent: 'steps',
          sparkline: summary.stepsSpark,
        }),
      ),

      // 12-col chart grid
      React.createElement(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            gap: 16,
          },
        },

        // ===== Weight (col 8) =====
        React.createElement(
          'div',
          { style: { gridColumn: 'span 8' } },
          React.createElement(
            SignatureCard,
            { padding: 'lg', accent: 'weight-down' },
            React.createElement(ChartHead, {
              eyebrow: 'WEIGHT',
              title: 'Trend',
              right: currentWeight !== null
                ? React.createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 4,
                        fontFamily: 'var(--knf-font-mono)',
                        color: 'var(--knf-ink)',
                        fontVariantNumeric: 'tabular-nums',
                      },
                    },
                    React.createElement(NumericReadout, {
                      value: currentWeight,
                      decimals: 1,
                      style: { fontSize: 20, fontWeight: 700 },
                    }),
                    React.createElement(
                      'span',
                      { style: { fontSize: 11, color: 'var(--knf-muted)' } },
                      'kg',
                    ),
                  )
                : null,
            }),
            hasWeightData
              ? React.createElement(
                  'div',
                  { style: { height: 280 } },
                  React.createElement(
                    ResponsiveContainer,
                    { width: '100%', height: '100%' },
                    React.createElement(
                      LineChart,
                      {
                        data: weightChartData,
                        margin: { top: 8, right: 12, bottom: 4, left: -8 },
                      },
                      React.createElement(CartesianGrid, {
                        stroke: SIG_PALETTE.hairline,
                        strokeDasharray: '3 3',
                        vertical: false,
                      }),
                      React.createElement(XAxis, {
                        dataKey: 'label',
                        tick: {
                          fontSize: 10,
                          fill: SIG_PALETTE.muted,
                          fontFamily: 'var(--knf-font-mono)',
                        },
                        axisLine: { stroke: SIG_PALETTE.hairline },
                        tickLine: false,
                        interval: 'preserveStartEnd',
                      }),
                      React.createElement(YAxis, {
                        tick: {
                          fontSize: 10,
                          fill: SIG_PALETTE.muted,
                          fontFamily: 'var(--knf-font-mono)',
                        },
                        axisLine: false,
                        tickLine: false,
                        width: 38,
                        domain: ['dataMin - 0.5', 'dataMax + 0.5'],
                      }),
                      React.createElement(Tooltip, {
                        contentStyle: tooltipContentStyle(),
                        cursor: { stroke: SIG_PALETTE.hairline },
                      }),
                      goalWeight !== null
                        ? React.createElement(ReferenceLine, {
                            y: goalWeight,
                            stroke: SIG_PALETTE.hero,
                            strokeDasharray: '4 4',
                            strokeWidth: 1.5,
                            label: {
                              value: `goal ${goalWeight}kg`,
                              fill: SIG_PALETTE.heroInk,
                              fontSize: 10,
                              position: 'right',
                              fontFamily: 'var(--knf-font-mono)',
                            },
                          })
                        : null,
                      React.createElement(Line, {
                        type: 'monotone',
                        dataKey: 'weight',
                        stroke:
                          weightDelta <= 0
                            ? SIG_PALETTE.weightDown
                            : SIG_PALETTE.weightUp,
                        strokeWidth: 2,
                        dot: {
                          r: 2,
                          fill:
                            weightDelta <= 0
                              ? SIG_PALETTE.weightDown
                              : SIG_PALETTE.weightUp,
                        },
                        activeDot: { r: 4 },
                        animationDuration: 620,
                      }),
                    ),
                  ),
                )
              : React.createElement(ChartEmpty, {
                  message: 'No weight logged in this range',
                  height: 280,
                }),
            hasWeightData
              ? React.createElement(
                  'div',
                  {
                    style: {
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                      gap: 16,
                      marginTop: 16,
                      padding: 12,
                      background: 'var(--knf-surface-2)',
                      borderRadius: 'var(--knf-radius-md)',
                    },
                  },
                  [
                    {
                      label: 'Current',
                      value:
                        currentWeight !== null
                          ? `${currentWeight.toFixed(1)} kg`
                          : '—',
                    },
                    {
                      label: 'Change',
                      value:
                        weightChartData.length >= 2
                          ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`
                          : '—',
                    },
                    {
                      label: 'Goal',
                      value:
                        goalWeight !== null
                          ? `${goalWeight.toFixed(1)} kg`
                          : 'not set',
                    },
                    {
                      label: 'Days to Goal',
                      value: daysToGoal !== null ? `~${daysToGoal}d` : '—',
                    },
                  ].map((m) =>
                    React.createElement(
                      'div',
                      {
                        key: m.label,
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        },
                      },
                      React.createElement(
                        'span',
                        {
                          className: 'knf-eyebrow',
                          style: { fontSize: 9 },
                        },
                        m.label,
                      ),
                      React.createElement(
                        'span',
                        {
                          style: {
                            fontFamily: 'var(--knf-font-mono)',
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--knf-ink)',
                            fontVariantNumeric: 'tabular-nums',
                          },
                        },
                        m.value,
                      ),
                    ),
                  ),
                )
              : null,
          ),
        ),

        // ===== Calories in/out (col 4) =====
        React.createElement(
          'div',
          { style: { gridColumn: 'span 4' } },
          React.createElement(
            SignatureCard,
            { padding: 'lg', accent: 'cal-burn' },
            React.createElement(ChartHead, {
              eyebrow: 'CALORIES',
              title: 'In / Out',
            }),
            hasCalories
              ? React.createElement(
                  'div',
                  { style: { height: 280 } },
                  React.createElement(
                    ResponsiveContainer,
                    { width: '100%', height: '100%' },
                    React.createElement(
                      BarChart,
                      {
                        data: calInOutData,
                        margin: { top: 8, right: 4, bottom: 4, left: -8 },
                        barCategoryGap: 4,
                      },
                      React.createElement(CartesianGrid, {
                        stroke: SIG_PALETTE.hairline,
                        strokeDasharray: '3 3',
                        vertical: false,
                      }),
                      React.createElement(XAxis, {
                        dataKey: 'label',
                        tick: {
                          fontSize: 10,
                          fill: SIG_PALETTE.muted,
                          fontFamily: 'var(--knf-font-mono)',
                        },
                        axisLine: { stroke: SIG_PALETTE.hairline },
                        tickLine: false,
                        interval: 'preserveStartEnd',
                      }),
                      React.createElement(YAxis, {
                        tick: {
                          fontSize: 10,
                          fill: SIG_PALETTE.muted,
                          fontFamily: 'var(--knf-font-mono)',
                        },
                        axisLine: false,
                        tickLine: false,
                        width: 38,
                      }),
                      React.createElement(Tooltip, {
                        contentStyle: tooltipContentStyle(),
                        cursor: { fill: SIG_PALETTE.heroWash, opacity: 0.5 },
                      }),
                      React.createElement(Bar, {
                        dataKey: 'consumed',
                        fill: SIG_PALETTE.hero,
                        radius: [3, 3, 0, 0],
                        animationDuration: 620,
                      }),
                      React.createElement(Bar, {
                        dataKey: 'burned',
                        fill: SIG_PALETTE.calBurn,
                        radius: [3, 3, 0, 0],
                        animationDuration: 620,
                      }),
                    ),
                  ),
                )
              : React.createElement(ChartEmpty, {
                  message: 'No calorie data',
                  height: 280,
                }),
          ),
        ),

        // ===== Macros (col 6) =====
        React.createElement(
          'div',
          { style: { gridColumn: 'span 6' } },
          React.createElement(
            SignatureCard,
            { padding: 'lg', accent: 'protein' },
            React.createElement(ChartHead, {
              eyebrow: 'MACROS',
              title: 'Distribution',
            }),
            hasMacros
              ? React.createElement(
                  'div',
                  { style: { height: 240 } },
                  React.createElement(
                    ResponsiveContainer,
                    { width: '100%', height: '100%' },
                    React.createElement(
                      AreaChart,
                      {
                        data: macroData,
                        margin: { top: 8, right: 12, bottom: 4, left: -8 },
                      },
                      React.createElement(CartesianGrid, {
                        stroke: SIG_PALETTE.hairline,
                        strokeDasharray: '3 3',
                        vertical: false,
                      }),
                      React.createElement(XAxis, {
                        dataKey: 'label',
                        tick: {
                          fontSize: 10,
                          fill: SIG_PALETTE.muted,
                          fontFamily: 'var(--knf-font-mono)',
                        },
                        axisLine: { stroke: SIG_PALETTE.hairline },
                        tickLine: false,
                        interval: 'preserveStartEnd',
                      }),
                      React.createElement(YAxis, {
                        tick: {
                          fontSize: 10,
                          fill: SIG_PALETTE.muted,
                          fontFamily: 'var(--knf-font-mono)',
                        },
                        axisLine: false,
                        tickLine: false,
                        width: 38,
                      }),
                      React.createElement(Tooltip, {
                        contentStyle: tooltipContentStyle(),
                        cursor: { stroke: SIG_PALETTE.hairline },
                      }),
                      React.createElement(Area, {
                        type: 'monotone',
                        dataKey: 'protein',
                        stackId: '1',
                        stroke: SIG_PALETTE.protein,
                        fill: SIG_PALETTE.protein,
                        fillOpacity: 0.35,
                        strokeWidth: 1.5,
                        animationDuration: 620,
                      }),
                      React.createElement(Area, {
                        type: 'monotone',
                        dataKey: 'carbs',
                        stackId: '1',
                        stroke: SIG_PALETTE.carbs,
                        fill: SIG_PALETTE.carbs,
                        fillOpacity: 0.35,
                        strokeWidth: 1.5,
                        animationDuration: 620,
                      }),
                      React.createElement(Area, {
                        type: 'monotone',
                        dataKey: 'fat',
                        stackId: '1',
                        stroke: SIG_PALETTE.fat,
                        fill: SIG_PALETTE.fat,
                        fillOpacity: 0.35,
                        strokeWidth: 1.5,
                        animationDuration: 620,
                      }),
                    ),
                  ),
                )
              : React.createElement(ChartEmpty, {
                  message: 'No macro data',
                  height: 240,
                }),
          ),
        ),

        // ===== Water (col 6) =====
        React.createElement(
          'div',
          { style: { gridColumn: 'span 6' } },
          React.createElement(
            SignatureCard,
            { padding: 'lg', accent: 'hydration' },
            React.createElement(ChartHead, {
              eyebrow: 'HYDRATION',
              title: 'Water',
            }),
            hasWater
              ? React.createElement(
                  'div',
                  { style: { height: 240 } },
                  React.createElement(
                    ResponsiveContainer,
                    { width: '100%', height: '100%' },
                    React.createElement(
                      AreaChart,
                      {
                        data: waterData,
                        margin: { top: 8, right: 12, bottom: 4, left: -8 },
                      },
                      React.createElement(CartesianGrid, {
                        stroke: SIG_PALETTE.hairline,
                        strokeDasharray: '3 3',
                        vertical: false,
                      }),
                      React.createElement(XAxis, {
                        dataKey: 'label',
                        tick: {
                          fontSize: 10,
                          fill: SIG_PALETTE.muted,
                          fontFamily: 'var(--knf-font-mono)',
                        },
                        axisLine: { stroke: SIG_PALETTE.hairline },
                        tickLine: false,
                        interval: 'preserveStartEnd',
                      }),
                      React.createElement(YAxis, {
                        tick: {
                          fontSize: 10,
                          fill: SIG_PALETTE.muted,
                          fontFamily: 'var(--knf-font-mono)',
                        },
                        axisLine: false,
                        tickLine: false,
                        width: 44,
                      }),
                      React.createElement(Tooltip, {
                        contentStyle: tooltipContentStyle(),
                        cursor: { stroke: SIG_PALETTE.hairline },
                      }),
                      React.createElement(Area, {
                        type: 'monotone',
                        dataKey: 'water',
                        stroke: SIG_PALETTE.hydration,
                        fill: SIG_PALETTE.hydration,
                        fillOpacity: 0.2,
                        strokeWidth: 2,
                        animationDuration: 620,
                      }),
                    ),
                  ),
                )
              : React.createElement(ChartEmpty, {
                  message: 'No water logged',
                  height: 240,
                }),
          ),
        ),

        // ===== Exercise calories (col 6) =====
        React.createElement(
          'div',
          { style: { gridColumn: 'span 6' } },
          React.createElement(
            SignatureCard,
            { padding: 'lg', accent: 'cal-burn' },
            React.createElement(ChartHead, {
              eyebrow: 'EXERCISE',
              title: 'Calories Burned',
            }),
            hasExercise
              ? React.createElement(
                  'div',
                  { style: { height: 240 } },
                  React.createElement(
                    ResponsiveContainer,
                    { width: '100%', height: '100%' },
                    React.createElement(
                      BarChart,
                      {
                        data: exerciseData,
                        margin: { top: 8, right: 12, bottom: 4, left: -8 },
                      },
                      React.createElement(CartesianGrid, {
                        stroke: SIG_PALETTE.hairline,
                        strokeDasharray: '3 3',
                        vertical: false,
                      }),
                      React.createElement(XAxis, {
                        dataKey: 'label',
                        tick: {
                          fontSize: 10,
                          fill: SIG_PALETTE.muted,
                          fontFamily: 'var(--knf-font-mono)',
                        },
                        axisLine: { stroke: SIG_PALETTE.hairline },
                        tickLine: false,
                        interval: 'preserveStartEnd',
                      }),
                      React.createElement(YAxis, {
                        tick: {
                          fontSize: 10,
                          fill: SIG_PALETTE.muted,
                          fontFamily: 'var(--knf-font-mono)',
                        },
                        axisLine: false,
                        tickLine: false,
                        width: 40,
                      }),
                      React.createElement(Tooltip, {
                        contentStyle: tooltipContentStyle(),
                        cursor: { fill: SIG_PALETTE.heroWash, opacity: 0.5 },
                      }),
                      React.createElement(Bar, {
                        dataKey: 'burned',
                        fill: SIG_PALETTE.calBurn,
                        radius: [3, 3, 0, 0],
                        animationDuration: 620,
                      }),
                    ),
                  ),
                )
              : React.createElement(ChartEmpty, {
                  message: 'No exercise logged',
                  height: 240,
                }),
          ),
        ),

        // ===== Wellness trio (col 12) =====
        React.createElement(
          'div',
          { style: { gridColumn: 'span 12' } },
          React.createElement(
            SignatureCard,
            { padding: 'lg' },
            React.createElement(ChartHead, {
              eyebrow: 'WELLNESS',
              title: 'Sleep · Steps · Heart rate',
            }),
            hasAnyWellness
              ? React.createElement(
                  'div',
                  {
                    style: {
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 12,
                    },
                  },
                  [
                    {
                      key: 'sleep',
                      label: 'SLEEP',
                      accent: SIG_PALETTE.sleep,
                      extract: (d: (typeof wellnessRangeData)[number]) =>
                        d.sleep !== null ? d.sleep / 60 : null,
                      unit: 'h',
                      fmt: (v: number) => v.toFixed(1),
                    },
                    {
                      key: 'steps',
                      label: 'STEPS',
                      accent: SIG_PALETTE.steps,
                      extract: (d: (typeof wellnessRangeData)[number]) =>
                        d.steps,
                      unit: '',
                      fmt: (v: number) => Math.round(v).toLocaleString(),
                    },
                    {
                      key: 'hr',
                      label: 'RESTING HR',
                      accent: SIG_PALETTE.heart,
                      extract: (d: (typeof wellnessRangeData)[number]) =>
                        d.hr,
                      unit: 'bpm',
                      fmt: (v: number) => Math.round(v).toString(),
                    },
                  ].map((m) => {
                    const rows = wellnessRangeData.map((d) => ({
                      label: d.label,
                      value: m.extract(d),
                    }));
                    const filtered = rows.filter((r) => r.value !== null && r.value !== undefined);
                    const last = filtered.length
                      ? (filtered[filtered.length - 1].value as number)
                      : null;
                    return React.createElement(
                      'div',
                      {
                        key: m.key,
                        style: {
                          padding: 12,
                          background: 'var(--knf-surface-2)',
                          borderRadius: 'var(--knf-radius-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        },
                      },
                      React.createElement(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            gap: 8,
                          },
                        },
                        React.createElement(
                          'span',
                          {
                            className: 'knf-eyebrow',
                            style: { fontSize: 10, color: m.accent },
                          },
                          m.label,
                        ),
                        last !== null
                          ? React.createElement(
                              'span',
                              {
                                style: {
                                  fontFamily: 'var(--knf-font-mono)',
                                  fontVariantNumeric: 'tabular-nums',
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: 'var(--knf-ink)',
                                },
                              },
                              `${m.fmt(last)}${m.unit}`,
                            )
                          : React.createElement(
                              'span',
                              {
                                style: {
                                  fontFamily: 'var(--knf-font-mono)',
                                  fontSize: 12,
                                  color: 'var(--knf-muted)',
                                },
                              },
                              '—',
                            ),
                      ),
                      filtered.length >= 2
                        ? React.createElement(
                            'div',
                            { style: { height: 96 } },
                            React.createElement(
                              ResponsiveContainer,
                              { width: '100%', height: '100%' },
                              React.createElement(
                                LineChart,
                                {
                                  data: rows,
                                  margin: { top: 4, right: 4, bottom: 0, left: 0 },
                                },
                                React.createElement(XAxis, {
                                  dataKey: 'label',
                                  hide: true,
                                }),
                                React.createElement(YAxis, { hide: true }),
                                React.createElement(Tooltip, {
                                  contentStyle: tooltipContentStyle(),
                                  cursor: { stroke: SIG_PALETTE.hairline },
                                }),
                                React.createElement(Line, {
                                  type: 'monotone',
                                  dataKey: 'value',
                                  stroke: m.accent,
                                  strokeWidth: 1.75,
                                  dot: false,
                                  activeDot: { r: 3, fill: m.accent },
                                  animationDuration: 620,
                                  connectNulls: true,
                                }),
                              ),
                            ),
                          )
                        : React.createElement(ChartEmpty, {
                            message: 'Not enough data yet',
                            height: 96,
                          }),
                    );
                  }),
                )
              : React.createElement(EmptyState, {
                  icon: 'Moon',
                  title: 'No wellness data yet',
                  description:
                    'Log sleep, steps, or resting HR on the Today page to see trends.',
                  compact: true,
                }),
          ),
        ),
      ),
    );
  };
}
