import type { SharedDependencies, DailySummary } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey, fromDateKey } from '../utils/date-helpers';
import { formatCal } from '../utils/nutrients';

export function createProgressCharts(Shared: SharedDependencies) {
  const {
    React, Card, CardContent, CardHeader, CardTitle,
    Button, Tabs, TabsContent, TabsList, TabsTrigger,
    lucideIcons, cn, dateFns,
    recharts, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  } = Shared;
  const { BarChart3 } = lucideIcons;
  const { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart } = recharts;

  return function ProgressCharts() {
    const [range, setRange] = React.useState<'7d' | '30d' | '90d'>('7d');
    const [data, setData] = React.useState<{ date: string; label: string; summary: DailySummary }[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      let cancelled = false;
      async function load() {
        setLoading(true);
        const s = getStorage();
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        const results: { date: string; label: string; summary: DailySummary }[] = [];

        for (let i = days - 1; i >= 0; i--) {
          const d = dateFns.subDays(new Date(), i);
          const dateKey = toDateKey(d);
          const summary = await s.getDailySummary(dateKey);
          results.push({
            date: dateKey,
            label: dateFns.format(d, range === '7d' ? 'EEE' : 'M/d'),
            summary,
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

    const calorieData = data.map(d => ({
      label: d.label,
      calories: d.summary.calories,
      exercise: d.summary.exercise_calories,
    }));

    const macroData = data.map(d => ({
      label: d.label,
      protein: d.summary.protein_g,
      carbs: d.summary.carbs_g,
      fat: d.summary.fat_g,
    }));

    const waterData = data.map(d => ({
      label: d.label,
      water: d.summary.water_ml,
    }));

    const calorieConfig = {
      calories: { label: 'Food', color: 'hsl(var(--primary))' },
      exercise: { label: 'Exercise', color: '#f97316' },
    };
    const macroConfig = {
      protein: { label: 'Protein', color: '#3b82f6' },
      carbs: { label: 'Carbs', color: '#f59e0b' },
      fat: { label: 'Fat', color: '#ef4444' },
    };
    const waterConfig = {
      water: { label: 'Water (ml)', color: '#3b82f6' },
    };

    return React.createElement('div', { className: 'space-y-4' },
      React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement('h2', { className: 'text-lg font-semibold flex items-center gap-2' },
          React.createElement(BarChart3, { className: 'h-5 w-5' }),
          'Progress',
        ),
        React.createElement('div', { className: 'flex gap-1' },
          ...(['7d', '30d', '90d'] as const).map(r =>
            React.createElement(Button, {
              key: r, variant: range === r ? 'default' : 'ghost',
              size: 'sm', className: 'h-7 text-xs',
              onClick: () => setRange(r),
            }, r),
          ),
        ),
      ),

      loading
        ? React.createElement('div', { className: 'text-sm text-muted-foreground text-center py-12' }, 'Loading...')
        : React.createElement(Tabs, { defaultValue: 'calories' },
            React.createElement(TabsList, { className: 'w-full' },
              React.createElement(TabsTrigger, { value: 'calories', className: 'flex-1' }, 'Calories'),
              React.createElement(TabsTrigger, { value: 'macros', className: 'flex-1' }, 'Macros'),
              React.createElement(TabsTrigger, { value: 'water', className: 'flex-1' }, 'Water'),
            ),

            // Calories chart
            React.createElement(TabsContent, { value: 'calories' },
              React.createElement(Card, null,
                React.createElement(CardContent, { className: 'pt-4' },
                  React.createElement(ChartContainer, { config: calorieConfig, className: 'h-[250px] w-full' },
                    React.createElement(BarChart, { data: calorieData },
                      React.createElement(CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-muted' }),
                      React.createElement(XAxis, { dataKey: 'label', tick: { fontSize: 10 } }),
                      React.createElement(YAxis, { tick: { fontSize: 10 }, width: 40 }),
                      React.createElement(ChartTooltip, { content: React.createElement(ChartTooltipContent, null) }),
                      React.createElement(ChartLegend, { content: React.createElement(ChartLegendContent, null) }),
                      React.createElement(Bar, { dataKey: 'calories', fill: 'var(--color-calories)', radius: [4, 4, 0, 0] }),
                      React.createElement(Bar, { dataKey: 'exercise', fill: 'var(--color-exercise)', radius: [4, 4, 0, 0] }),
                    ),
                  ),
                ),
              ),
            ),

            // Macros chart
            React.createElement(TabsContent, { value: 'macros' },
              React.createElement(Card, null,
                React.createElement(CardContent, { className: 'pt-4' },
                  React.createElement(ChartContainer, { config: macroConfig, className: 'h-[250px] w-full' },
                    React.createElement(AreaChart, { data: macroData },
                      React.createElement(CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-muted' }),
                      React.createElement(XAxis, { dataKey: 'label', tick: { fontSize: 10 } }),
                      React.createElement(YAxis, { tick: { fontSize: 10 }, width: 35 }),
                      React.createElement(ChartTooltip, { content: React.createElement(ChartTooltipContent, null) }),
                      React.createElement(ChartLegend, { content: React.createElement(ChartLegendContent, null) }),
                      React.createElement(Area, { type: 'monotone', dataKey: 'protein', stroke: 'var(--color-protein)', fill: 'var(--color-protein)', fillOpacity: 0.2 }),
                      React.createElement(Area, { type: 'monotone', dataKey: 'carbs', stroke: 'var(--color-carbs)', fill: 'var(--color-carbs)', fillOpacity: 0.2 }),
                      React.createElement(Area, { type: 'monotone', dataKey: 'fat', stroke: 'var(--color-fat)', fill: 'var(--color-fat)', fillOpacity: 0.2 }),
                    ),
                  ),
                ),
              ),
            ),

            // Water chart
            React.createElement(TabsContent, { value: 'water' },
              React.createElement(Card, null,
                React.createElement(CardContent, { className: 'pt-4' },
                  React.createElement(ChartContainer, { config: waterConfig, className: 'h-[250px] w-full' },
                    React.createElement(BarChart, { data: waterData },
                      React.createElement(CartesianGrid, { strokeDasharray: '3 3', className: 'stroke-muted' }),
                      React.createElement(XAxis, { dataKey: 'label', tick: { fontSize: 10 } }),
                      React.createElement(YAxis, { tick: { fontSize: 10 }, width: 40 }),
                      React.createElement(ChartTooltip, { content: React.createElement(ChartTooltipContent, null) }),
                      React.createElement(Bar, { dataKey: 'water', fill: 'var(--color-water)', radius: [4, 4, 0, 0] }),
                    ),
                  ),
                ),
              ),
            ),
          ),
    );
  };
}
