import type { SharedDependencies, DailySummary } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey } from '../utils/date-helpers';

export function createProgressCharts(Shared: SharedDependencies) {
  const {
    React, Card, CardContent, Button,
    lucideIcons, cn, dateFns,
    recharts, ChartContainer, ChartTooltip, ChartTooltipContent,
  } = Shared;
  const { BarChart3 } = lucideIcons;
  const { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart } = recharts;

  function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: any }) {
    return React.createElement(Card, null,
      React.createElement(CardContent, { className: 'p-4 space-y-2' },
        React.createElement('div', null,
          React.createElement('div', {
            className: 'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
          }, title),
          subtitle && React.createElement('div', {
            className: 'text-xs text-muted-foreground',
          }, subtitle),
        ),
        children,
      ),
    );
  }

  return function ProgressCharts() {
    const [range, setRange] = React.useState<'7d' | '30d' | '90d'>('30d');
    const [data, setData] = React.useState<{ date: string; label: string; summary: DailySummary; weight?: number }[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      let cancelled = false;
      async function load() {
        setLoading(true);
        const s = getStorage();
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        const results: { date: string; label: string; summary: DailySummary; weight?: number }[] = [];

        // Get weight data upfront for the range
        const endKey = toDateKey(new Date());
        const startKey = toDateKey(dateFns.subDays(new Date(), days - 1));
        const weightRange = await s.getWeightRange(startKey, endKey);
        const weightMap = new Map(weightRange.map(w => [w.date, w.weight_kg]));

        for (let i = days - 1; i >= 0; i--) {
          const d = dateFns.subDays(new Date(), i);
          const dateKey = toDateKey(d);
          const summary = await s.getDailySummary(dateKey);
          results.push({
            date: dateKey,
            label: dateFns.format(d, range === '7d' ? 'EEE' : 'M/d'),
            summary,
            weight: weightMap.get(dateKey),
          });
        }

        if (!cancelled) {
          setData(results);
          setLoading(false);
        }
      }
      load();
      return () => { cancelled = true; };
    }, [range]);

    const calorieData = data.map(d => ({ label: d.label, calories: d.summary.calories, exercise: d.summary.exercise_calories }));
    const macroData = data.map(d => ({ label: d.label, protein: d.summary.protein_g, carbs: d.summary.carbs_g, fat: d.summary.fat_g }));
    const waterData = data.map(d => ({ label: d.label, water: d.summary.water_ml }));
    const weightData = data.filter(d => d.weight != null).map(d => ({ label: d.label, weight: d.weight! }));

    const calorieConfig = {
      calories: { label: 'Food', color: 'hsl(var(--primary))' },
      exercise: { label: 'Burned', color: '#f97316' },
    };
    const macroConfig = {
      protein: { label: 'Protein', color: '#3b82f6' },
      carbs: { label: 'Carbs', color: '#f59e0b' },
      fat: { label: 'Fat', color: '#ef4444' },
    };
    const waterConfig = { water: { label: 'Water', color: '#3b82f6' } };
    const weightConfig = { weight: { label: 'Weight', color: 'hsl(var(--primary))' } };

    // Averages
    const avgCal = data.length ? Math.round(data.reduce((s, d) => s + d.summary.calories, 0) / data.length) : 0;
    const avgProtein = data.length ? Math.round(data.reduce((s, d) => s + d.summary.protein_g, 0) / data.length) : 0;
    const avgWater = data.length ? Math.round(data.reduce((s, d) => s + d.summary.water_ml, 0) / data.length) : 0;
    const weightChange = weightData.length >= 2
      ? weightData[weightData.length - 1].weight - weightData[0].weight
      : 0;

    return React.createElement('div', { className: 'space-y-4' },
      // Header with range selector
      React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement('h2', { className: 'text-lg font-semibold flex items-center gap-2' },
          React.createElement(BarChart3, { className: 'h-5 w-5' }),
          'Progress',
        ),
        React.createElement('div', { className: 'flex gap-1' },
          ...(['7d', '30d', '90d'] as const).map(r =>
            React.createElement(Button, {
              key: r, variant: range === r ? 'default' : 'ghost',
              size: 'sm', className: 'h-7 text-xs px-3',
              onClick: () => setRange(r),
            }, r),
          ),
        ),
      ),

      loading
        ? React.createElement('div', { className: 'text-sm text-muted-foreground text-center py-12' }, 'Loading...')
        : React.createElement('div', { className: 'grid gap-4 lg:grid-cols-2' },
            // Calories
            React.createElement(ChartCard, {
              title: 'Calories',
              subtitle: `avg ${avgCal} cal/day`,
            },
              React.createElement(ChartContainer, { config: calorieConfig, className: 'h-[220px] w-full' },
                React.createElement(BarChart, { data: calorieData, margin: { top: 4, right: 4, bottom: 4, left: 0 } },
                  React.createElement(CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-muted', vertical: false }),
                  React.createElement(XAxis, { dataKey: 'label', tick: { fontSize: 10 }, axisLine: false, tickLine: false }),
                  React.createElement(YAxis, { tick: { fontSize: 10 }, width: 36, axisLine: false, tickLine: false }),
                  React.createElement(ChartTooltip, { content: React.createElement(ChartTooltipContent, null) }),
                  React.createElement(Bar, { dataKey: 'calories', fill: 'var(--color-calories)', radius: [3, 3, 0, 0], animationDuration: 600 }),
                  React.createElement(Bar, { dataKey: 'exercise', fill: 'var(--color-exercise)', radius: [3, 3, 0, 0], animationDuration: 600 }),
                ),
              ),
            ),

            // Macros
            React.createElement(ChartCard, {
              title: 'Macros',
              subtitle: `avg ${avgProtein}g protein/day`,
            },
              React.createElement(ChartContainer, { config: macroConfig, className: 'h-[220px] w-full' },
                React.createElement(AreaChart, { data: macroData, margin: { top: 4, right: 4, bottom: 4, left: 0 } },
                  React.createElement(CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-muted', vertical: false }),
                  React.createElement(XAxis, { dataKey: 'label', tick: { fontSize: 10 }, axisLine: false, tickLine: false }),
                  React.createElement(YAxis, { tick: { fontSize: 10 }, width: 32, axisLine: false, tickLine: false }),
                  React.createElement(ChartTooltip, { content: React.createElement(ChartTooltipContent, null) }),
                  React.createElement(Area, { type: 'monotone', dataKey: 'protein', stroke: 'var(--color-protein)', fill: 'var(--color-protein)', fillOpacity: 0.2, animationDuration: 600 }),
                  React.createElement(Area, { type: 'monotone', dataKey: 'carbs', stroke: 'var(--color-carbs)', fill: 'var(--color-carbs)', fillOpacity: 0.2, animationDuration: 600 }),
                  React.createElement(Area, { type: 'monotone', dataKey: 'fat', stroke: 'var(--color-fat)', fill: 'var(--color-fat)', fillOpacity: 0.2, animationDuration: 600 }),
                ),
              ),
            ),

            // Weight
            React.createElement(ChartCard, {
              title: 'Weight',
              subtitle: weightData.length >= 2
                ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`
                : 'log weight to see trend',
            },
              weightData.length >= 2
                ? React.createElement(ChartContainer, { config: weightConfig, className: 'h-[220px] w-full' },
                    React.createElement(LineChart, { data: weightData, margin: { top: 4, right: 4, bottom: 4, left: 0 } },
                      React.createElement(CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-muted', vertical: false }),
                      React.createElement(XAxis, { dataKey: 'label', tick: { fontSize: 10 }, axisLine: false, tickLine: false }),
                      React.createElement(YAxis, { tick: { fontSize: 10 }, domain: ['dataMin - 1', 'dataMax + 1'], width: 36, axisLine: false, tickLine: false }),
                      React.createElement(ChartTooltip, { content: React.createElement(ChartTooltipContent, null) }),
                      React.createElement(Line, { type: 'monotone', dataKey: 'weight', stroke: 'var(--color-weight)', strokeWidth: 2, dot: false, animationDuration: 600 }),
                    ),
                  )
                : React.createElement('div', {
                    className: 'flex items-center justify-center h-[220px] text-xs text-muted-foreground',
                  }, 'No weight data in this range'),
            ),

            // Water
            React.createElement(ChartCard, {
              title: 'Water',
              subtitle: `avg ${avgWater} ml/day`,
            },
              React.createElement(ChartContainer, { config: waterConfig, className: 'h-[220px] w-full' },
                React.createElement(BarChart, { data: waterData, margin: { top: 4, right: 4, bottom: 4, left: 0 } },
                  React.createElement(CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-muted', vertical: false }),
                  React.createElement(XAxis, { dataKey: 'label', tick: { fontSize: 10 }, axisLine: false, tickLine: false }),
                  React.createElement(YAxis, { tick: { fontSize: 10 }, width: 40, axisLine: false, tickLine: false }),
                  React.createElement(ChartTooltip, { content: React.createElement(ChartTooltipContent, null) }),
                  React.createElement(Bar, { dataKey: 'water', fill: 'var(--color-water)', radius: [3, 3, 0, 0], animationDuration: 600 }),
                ),
              ),
            ),
          ),
    );
  };
}
