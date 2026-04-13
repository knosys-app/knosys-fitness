import type { SharedDependencies } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey, toMonthKey, fromDateKey } from '../utils/date-helpers';
import { kgToLbs } from '../utils/nutrients';

export function createWeightTracker(Shared: SharedDependencies) {
  const {
    React, Card, CardContent, CardHeader, CardTitle,
    Button, Input, Label, lucideIcons, cn, dateFns,
    recharts, ChartContainer, ChartTooltip, ChartTooltipContent,
  } = Shared;
  const { Scale, TrendingDown, TrendingUp, Minus: MinusIcon } = lucideIcons;
  const { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } = recharts;

  return function WeightTracker() {
    const [todayWeight, setTodayWeight] = React.useState('');
    const [currentWeight, setCurrentWeight] = React.useState<number | null>(null);
    const [weightData, setWeightData] = React.useState<{ date: string; weight_kg: number }[]>([]);
    const [range, setRange] = React.useState<'30d' | '90d' | '1y'>('30d');

    const loadData = React.useCallback(async () => {
      const s = getStorage();
      const today = toDateKey(new Date());
      const w = await s.getWeight(today);
      if (w) {
        setCurrentWeight(w.weight_kg);
        setTodayWeight(String(w.weight_kg));
      }

      const days = range === '30d' ? 30 : range === '90d' ? 90 : 365;
      const start = toDateKey(dateFns.subDays(new Date(), days));
      const data = await s.getWeightRange(start, today);
      setWeightData(data);
    }, [range]);

    React.useEffect(() => { loadData(); }, [loadData]);

    const saveWeight = async () => {
      const kg = parseFloat(todayWeight);
      if (isNaN(kg) || kg <= 0) return;
      const s = getStorage();
      await s.setWeight(toDateKey(new Date()), { weight_kg: kg });
      setCurrentWeight(kg);
      await loadData();
    };

    const chartData = weightData.map(d => ({
      date: d.date,
      weight: d.weight_kg,
      label: dateFns.format(fromDateKey(d.date), 'MMM d'),
    }));

    const trend = weightData.length >= 2
      ? weightData[weightData.length - 1].weight_kg - weightData[0].weight_kg
      : 0;

    const TrendIcon = trend < 0 ? TrendingDown : trend > 0 ? TrendingUp : MinusIcon;
    const trendColor = trend < 0 ? 'text-green-500' : trend > 0 ? 'text-red-500' : 'text-muted-foreground';

    const chartConfig = {
      weight: { label: 'Weight', color: 'hsl(var(--primary))' },
    };

    return React.createElement(Card, null,
      React.createElement(CardHeader, { className: 'pb-2' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement(CardTitle, { className: 'text-sm flex items-center gap-2' },
            React.createElement(Scale, { className: 'h-4 w-4' }),
            'Weight',
          ),
          React.createElement('div', { className: 'flex gap-1' },
            ...(['30d', '90d', '1y'] as const).map(r =>
              React.createElement(Button, {
                key: r, variant: range === r ? 'default' : 'ghost',
                size: 'sm', className: 'h-6 text-xs px-2',
                onClick: () => setRange(r),
              }, r),
            ),
          ),
        ),
      ),
      React.createElement(CardContent, { className: 'space-y-3' },
        // Today's weight input
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement(Input, {
            type: 'number', min: 0, step: 0.1, value: todayWeight,
            onChange: (e: any) => setTodayWeight(e.target.value),
            placeholder: 'Today\'s weight (kg)', className: 'h-8 flex-1',
          }),
          React.createElement(Button, { size: 'sm', className: 'h-8', onClick: saveWeight }, 'Log'),
        ),

        // Trend
        weightData.length >= 2 && React.createElement('div', { className: 'flex items-center gap-1 text-xs' },
          React.createElement(TrendIcon, { className: cn('h-3.5 w-3.5', trendColor) }),
          React.createElement('span', { className: trendColor },
            `${trend > 0 ? '+' : ''}${trend.toFixed(1)} kg over ${range}`),
        ),

        // Chart
        chartData.length >= 2 && React.createElement(ChartContainer, {
          config: chartConfig,
          className: 'h-[180px] w-full',
        },
          React.createElement(LineChart, { data: chartData, margin: { top: 5, right: 5, bottom: 5, left: 5 } },
            React.createElement(CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-muted' }),
            React.createElement(XAxis, {
              dataKey: 'label', tick: { fontSize: 10 }, interval: 'preserveStartEnd',
            }),
            React.createElement(YAxis, {
              tick: { fontSize: 10 }, domain: ['dataMin - 1', 'dataMax + 1'], width: 35,
            }),
            React.createElement(ChartTooltip, {
              content: React.createElement(ChartTooltipContent, null),
            }),
            React.createElement(Line, {
              type: 'monotone', dataKey: 'weight', stroke: 'var(--color-weight)',
              strokeWidth: 2, dot: false, activeDot: { r: 4 },
            }),
          ),
        ),
      ),
    );
  };
}
