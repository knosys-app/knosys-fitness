import type { SharedDependencies } from '../types';
import { getStorage, getApi } from '../hooks/use-fitness-store';
import { toDateKey, fromDateKey } from '../utils/date-helpers';
import { createStatTile } from './stat-tile';

export function createWeightTracker(Shared: SharedDependencies) {
  const {
    React, Card, CardContent,
    Button, Input, lucideIcons, cn, dateFns,
    recharts, ChartContainer, ChartTooltip, ChartTooltipContent,
  } = Shared;
  const { TrendingDown, TrendingUp, Minus: MinusIcon } = lucideIcons;
  const { LineChart, Line, XAxis, YAxis, CartesianGrid } = recharts;

  const StatTile = createStatTile(Shared);

  return function WeightTracker() {
    const [todayWeight, setTodayWeight] = React.useState('');
    const [weightData, setWeightData] = React.useState<{ date: string; weight_kg: number }[]>([]);
    const [goalWeight, setGoalWeight] = React.useState<number | null>(null);
    const [range, setRange] = React.useState<'30d' | '90d' | '1y'>('30d');
    const [saving, setSaving] = React.useState(false);

    const loadData = React.useCallback(async () => {
      const s = getStorage();
      const today = toDateKey(new Date());
      const w = await s.getWeight(today);
      if (w) setTodayWeight(String(w.weight_kg));

      const profile = await s.getProfile();
      setGoalWeight(profile.goal_weight_kg ?? null);

      const days = range === '30d' ? 30 : range === '90d' ? 90 : 365;
      const start = toDateKey(dateFns.subDays(new Date(), days));
      const data = await s.getWeightRange(start, today);
      setWeightData(data);
    }, [range]);

    React.useEffect(() => { loadData(); }, [loadData]);

    const saveWeight = async () => {
      const kg = parseFloat(todayWeight);
      if (isNaN(kg) || kg <= 0) return;
      setSaving(true);
      const s = getStorage();
      await s.setWeight(toDateKey(new Date()), { weight_kg: kg });
      await loadData();
      setSaving(false);
      getApi().ui.showToast(`Logged ${kg.toFixed(1)} kg for today`, 'success');
    };

    // KPIs
    const current = weightData.length > 0 ? weightData[weightData.length - 1].weight_kg : null;
    const start = weightData.length > 0 ? weightData[0].weight_kg : null;
    const change = current !== null && start !== null ? current - start : 0;
    const toGoal = current !== null && goalWeight !== null ? current - goalWeight : null;

    const trend = weightData.length >= 2 ? change : 0;
    const TrendIcon = trend < -0.05 ? TrendingDown : trend > 0.05 ? TrendingUp : MinusIcon;
    const trendColor = trend < -0.05 ? '#10b981' : trend > 0.05 ? '#ef4444' : 'hsl(var(--muted-foreground))';

    const chartData = weightData.map(d => ({
      date: d.date,
      weight: d.weight_kg,
      label: dateFns.format(fromDateKey(d.date), 'MMM d'),
    }));

    const chartConfig = { weight: { label: 'Weight', color: 'hsl(var(--primary))' } };

    return React.createElement('div', { className: 'space-y-4' },
      // KPI Row
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
        React.createElement(StatTile, {
          icon: 'Scale',
          label: 'Current',
          value: current !== null ? current.toFixed(1) : '—',
          unit: current !== null ? 'kg' : '',
        }),
        React.createElement(StatTile, {
          icon: 'Flag',
          label: `Start ${range}`,
          value: start !== null ? start.toFixed(1) : '—',
          unit: start !== null ? 'kg' : '',
        }),
        React.createElement(StatTile, {
          icon: trend < -0.05 ? 'TrendingDown' : trend > 0.05 ? 'TrendingUp' : 'Minus',
          label: `Change ${range}`,
          value: trend !== 0 ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)}` : '—',
          unit: trend !== 0 ? 'kg' : '',
          accent: trendColor,
        }),
        React.createElement(StatTile, {
          icon: 'Target',
          label: 'To Goal',
          value: toGoal !== null ? `${toGoal > 0 ? '+' : ''}${toGoal.toFixed(1)}` : '—',
          unit: toGoal !== null ? 'kg' : '',
          hint: goalWeight !== null ? `goal: ${goalWeight} kg` : 'set in settings',
        }),
      ),

      // Main: log + chart side by side on lg
      React.createElement('div', { className: 'grid gap-4 md:grid-cols-[280px_1fr]' },
        // Left: log input
        React.createElement(Card, null,
          React.createElement(CardContent, { className: 'p-4 space-y-3' },
            React.createElement('div', { className: 'space-y-1.5' },
              React.createElement('div', {
                className: 'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
              }, 'Log today'),
              React.createElement('div', { className: 'flex gap-2' },
                React.createElement(Input, {
                  type: 'number', min: 0, step: 0.1, value: todayWeight,
                  onChange: (e: any) => setTodayWeight(e.target.value),
                  placeholder: '80.5', className: 'h-8 tabular-nums',
                }),
                React.createElement(Button, {
                  size: 'sm', className: 'h-8', onClick: saveWeight, disabled: saving,
                }, saving ? '…' : 'Log'),
              ),
              React.createElement('div', { className: 'text-[10px] text-muted-foreground' }, 'kilograms'),
            ),

            // Recent entries list
            weightData.length > 0 && React.createElement('div', { className: 'pt-2 border-t space-y-1' },
              React.createElement('div', {
                className: 'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5',
              }, 'Recent'),
              ...weightData.slice(-5).reverse().map(d =>
                React.createElement('div', {
                  key: d.date, className: 'flex justify-between text-xs tabular-nums',
                },
                  React.createElement('span', { className: 'text-muted-foreground' },
                    dateFns.format(fromDateKey(d.date), 'MMM d')),
                  React.createElement('span', null, `${d.weight_kg.toFixed(1)} kg`),
                ),
              ),
            ),
          ),
        ),

        // Right: chart
        React.createElement(Card, null,
          React.createElement(CardContent, { className: 'p-4 space-y-3' },
            React.createElement('div', { className: 'flex items-center justify-between' },
              React.createElement('div', {
                className: 'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
              }, 'Trend'),
              React.createElement('div', { className: 'flex gap-1' },
                ...(['30d', '90d', '1y'] as const).map(r =>
                  React.createElement(Button, {
                    key: r, variant: range === r ? 'default' : 'ghost',
                    size: 'sm', className: 'h-6 text-[10px] px-2',
                    onClick: () => setRange(r),
                  }, r),
                ),
              ),
            ),

            chartData.length >= 2
              ? React.createElement(ChartContainer, {
                  config: chartConfig,
                  className: 'h-[260px] w-full',
                },
                  React.createElement(LineChart, { data: chartData, margin: { top: 8, right: 8, bottom: 8, left: 0 } },
                    React.createElement(CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-muted', vertical: false }),
                    React.createElement(XAxis, {
                      dataKey: 'label', tick: { fontSize: 10 }, interval: 'preserveStartEnd',
                      axisLine: false, tickLine: false,
                    }),
                    React.createElement(YAxis, {
                      tick: { fontSize: 10 }, domain: ['dataMin - 1', 'dataMax + 1'], width: 40,
                      axisLine: false, tickLine: false,
                    }),
                    React.createElement(ChartTooltip, {
                      content: React.createElement(ChartTooltipContent, null),
                    }),
                    React.createElement(Line, {
                      type: 'monotone', dataKey: 'weight', stroke: 'var(--color-weight)',
                      strokeWidth: 2, dot: false, activeDot: { r: 4 },
                      animationDuration: 600,
                    }),
                  ),
                )
              : React.createElement('div', {
                  className: 'flex items-center justify-center h-[260px] text-xs text-muted-foreground',
                }, 'Log weight for a few days to see your trend'),
          ),
        ),
      ),
    );
  };
}
