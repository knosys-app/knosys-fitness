import type { SharedDependencies, NormalizedFood, MealType } from '../types';
import { MEAL_LABELS } from '../types';
import { formatCal, formatG } from '../utils/nutrients';
import { createUseFoodSearch } from '../hooks/use-fitness-store';
import { createNutritionLabel } from './nutrition-label';

export function createFoodSearchDialog(Shared: SharedDependencies) {
  const {
    React, Dialog, DialogContent, DialogHeader, DialogTitle,
    Input, Button, Tabs, TabsContent, TabsList, TabsTrigger,
    ScrollArea, Badge, Separator, Label, lucideIcons, cn,
  } = Shared;
  const { Search, Plus, Minus, X } = lucideIcons;

  const useFoodSearch = createUseFoodSearch(Shared);
  const NutritionLabel = createNutritionLabel(Shared);

  function FoodItem({ food, onSelect }: { food: NormalizedFood; onSelect: (f: NormalizedFood) => void }) {
    return React.createElement('button', {
      onClick: () => onSelect(food),
      className: 'w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-md transition-colors text-left',
    },
      React.createElement('div', { className: 'flex-1 min-w-0 mr-3' },
        React.createElement('div', { className: 'text-sm font-medium truncate' }, food.name),
        React.createElement('div', { className: 'text-xs text-muted-foreground truncate' },
          [food.brand, food.serving_label].filter(Boolean).join(' · '),
        ),
      ),
      React.createElement('div', { className: 'text-right shrink-0' },
        React.createElement('div', { className: 'text-sm font-medium' }, `${food.calories} cal`),
        React.createElement('div', { className: 'text-[10px] text-muted-foreground' },
          `P${formatG(food.protein_g)} C${formatG(food.carbs_g)} F${formatG(food.fat_g)}`),
      ),
    );
  }

  const QUICK_SERVINGS = [0.5, 1, 1.5, 2, 3];

  function ServingsSelector({ food, mealType, onAdd, onCancel }: {
    food: NormalizedFood; mealType: MealType; onAdd: (servings: number) => void; onCancel: () => void;
  }) {
    const [servings, setServings] = React.useState(1);
    const [nutritionOpen, setNutritionOpen] = React.useState(false);
    const cal = Math.round(food.calories * servings);
    const p = Math.round(food.protein_g * servings * 10) / 10;
    const c = Math.round(food.carbs_g * servings * 10) / 10;
    const f = Math.round(food.fat_g * servings * 10) / 10;

    const sourceLabel =
      food.source === 'openfoodfacts' ? 'Open Food Facts' :
      food.source === 'usda' ? 'USDA' :
      food.source === 'custom' ? 'Custom' : 'Recipe';
    const sourceColor =
      food.source === 'openfoodfacts' ? { bg: 'rgba(16, 185, 129, 0.12)', fg: '#059669' } :
      food.source === 'usda' ? { bg: 'rgba(30, 64, 175, 0.12)', fg: '#1e40af' } :
      food.source === 'custom' ? { bg: 'rgba(139, 92, 246, 0.12)', fg: '#7c3aed' } :
      { bg: 'rgba(245, 158, 11, 0.12)', fg: '#d97706' };

    return React.createElement('div', { className: 'space-y-3 p-1' },
      React.createElement('div', null,
        React.createElement('div', { className: 'text-base font-semibold leading-tight' }, food.name),
        food.brand && React.createElement('div', { className: 'text-sm text-muted-foreground' }, food.brand),
        React.createElement('span', {
          className: 'inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full',
          style: { backgroundColor: sourceColor.bg, color: sourceColor.fg },
        }, sourceLabel),
      ),

      React.createElement(Separator, null),

      // Nutrition for selected servings — prominent display
      React.createElement('div', { className: 'grid grid-cols-4 gap-2 text-center' },
        ...([
          { label: 'cal', value: formatCal(cal), color: '' },
          { label: 'protein', value: formatG(p), color: 'text-blue-500' },
          { label: 'carbs', value: formatG(c), color: 'text-amber-500' },
          { label: 'fat', value: formatG(f), color: 'text-red-500' },
        ]).map(({ label, value, color }) =>
          React.createElement('div', { key: label },
            React.createElement('div', { className: cn('text-xl font-bold tabular-nums', color) }, value),
            React.createElement('div', {
              style: { fontSize: '9px', color: 'hsl(var(--muted-foreground))', letterSpacing: '0.05em', textTransform: 'uppercase' },
            }, label),
          )
        ),
      ),

      // Servings control — input + quick-select chips
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement(Label, { className: 'text-xs' }, 'Servings'),
          React.createElement('div', { className: 'flex items-center gap-1.5' },
            React.createElement(Input, {
              type: 'number', min: 0.25, step: 0.25, value: servings,
              onChange: (e: any) => {
                const v = parseFloat(e.target.value);
                setServings(isNaN(v) || v <= 0 ? 0.25 : v);
              },
              className: 'w-20 h-8 text-center tabular-nums',
            }),
            React.createElement('div', {
              style: { fontSize: '11px', color: 'hsl(var(--muted-foreground))' },
            }, `× ${food.serving_label}`),
          ),
        ),

        // Quick-select chips
        React.createElement('div', { className: 'flex flex-wrap gap-1' },
          ...QUICK_SERVINGS.map(v =>
            React.createElement('button', {
              key: v,
              onClick: () => setServings(v),
              className: cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors tabular-nums',
                servings === v
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-border',
              ),
            }, v === 0.5 ? '½' : v === 1.5 ? '1½' : String(v)),
          ),
        ),

        React.createElement('div', {
          className: 'text-xs text-muted-foreground tabular-nums',
        }, `Total: ${Math.round(food.serving_size_g * servings)}g`),
      ),

      // Collapsible full nutrition label
      React.createElement('button', {
        onClick: () => setNutritionOpen(!nutritionOpen),
        className: 'text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors',
      },
        React.createElement('span', {
          style: {
            display: 'inline-block',
            transform: nutritionOpen ? 'rotate(90deg)' : 'rotate(0)',
            transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }, '▸'),
        'Full nutrition facts',
      ),
      nutritionOpen && React.createElement(NutritionLabel, { food, servings }),

      React.createElement('div', { className: 'flex gap-2 pt-1' },
        React.createElement(Button, { variant: 'outline', className: 'flex-1', onClick: onCancel }, 'Cancel'),
        React.createElement(Button, {
          className: 'flex-1',
          onClick: () => onAdd(servings),
        }, `Add to ${MEAL_LABELS[mealType]}`),
      ),
    );
  }

  return function FoodSearchDialog({ open, onOpenChange, mealType, onAddFood, onCreateCustom }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mealType: MealType;
    onAddFood: (food: NormalizedFood, servings: number) => void;
    onCreateCustom?: () => void;
  }) {
    const { query, setQuery, results, searching, source, setSource, recentFoods, frequentFoods, customFoods } = useFoodSearch();
    const [selectedFood, setSelectedFood] = React.useState<NormalizedFood | null>(null);

    const handleAdd = (servings: number) => {
      if (selectedFood) {
        onAddFood(selectedFood, servings);
        setSelectedFood(null);
        onOpenChange(false);
      }
    };

    const handleSelect = (food: NormalizedFood) => {
      setSelectedFood(food);
    };

    // Reset state when dialog closes
    React.useEffect(() => {
      if (!open) {
        setSelectedFood(null);
      }
    }, [open]);

    return React.createElement(Dialog, { open, onOpenChange },
      React.createElement(DialogContent, {
        className: 'max-w-lg flex flex-col',
        style: { maxHeight: '85vh' },
      },
        React.createElement(DialogHeader, null,
          React.createElement(DialogTitle, null,
            selectedFood ? 'Add Food' : `Add to ${MEAL_LABELS[mealType]}`),
        ),

        selectedFood
          ? React.createElement(ServingsSelector, {
              food: selectedFood,
              mealType,
              onAdd: handleAdd,
              onCancel: () => setSelectedFood(null),
            })
          : React.createElement(React.Fragment, null,
              // Search input
              React.createElement('div', { className: 'relative' },
                React.createElement(Search, {
                  className: 'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground',
                }),
                React.createElement(Input, {
                  placeholder: 'Search foods...',
                  value: query,
                  onChange: (e: any) => setQuery(e.target.value),
                  className: 'pl-9',
                  autoFocus: true,
                }),
              ),

              // Source tabs
              React.createElement(Tabs, {
                value: source,
                onValueChange: (v: string) => setSource(v as any),
              },
                React.createElement(TabsList, { className: 'w-full' },
                  React.createElement(TabsTrigger, { value: 'all', className: 'flex-1 text-xs' }, 'All'),
                  React.createElement(TabsTrigger, { value: 'openfoodfacts', className: 'flex-1 text-xs' }, 'Open Food'),
                  React.createElement(TabsTrigger, { value: 'usda', className: 'flex-1 text-xs' }, 'USDA'),
                  React.createElement(TabsTrigger, { value: 'custom', className: 'flex-1 text-xs' }, 'Custom'),
                ),
              ),

              // Results
              React.createElement('div', { style: { maxHeight: '50vh', overflowY: 'auto', marginLeft: '-8px', marginRight: '-8px' } },
                searching
                  ? React.createElement('div', { className: 'flex items-center justify-center py-8 text-sm text-muted-foreground' }, 'Searching...')
                  : query && results.length === 0
                  ? React.createElement('div', { className: 'flex flex-col items-center justify-center py-8 px-6 text-center space-y-3' },
                      React.createElement(Search, { className: 'h-8 w-8 text-muted-foreground/40' }),
                      React.createElement('div', null,
                        React.createElement('div', { className: 'text-sm font-medium' }, 'No matches found'),
                        React.createElement('div', { className: 'text-xs text-muted-foreground mt-0.5' },
                          `Nothing matches "${query}"`),
                      ),
                      onCreateCustom && React.createElement(Button, {
                        size: 'sm', variant: 'default',
                        onClick: () => { onOpenChange(false); onCreateCustom(); },
                      },
                        React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
                        `Create "${query}" as custom food`,
                      ),
                    )
                  : query && results.length > 0
                  ? React.createElement('div', { className: 'px-2' },
                      ...results.map(food =>
                        React.createElement(FoodItem, { key: `${food.source}:${food.id}`, food, onSelect: handleSelect })
                      ),
                    )
                  : // Show frequent and recent foods when no query
                    React.createElement('div', { className: 'px-2' },
                      frequentFoods.length > 0 && React.createElement(React.Fragment, null,
                        React.createElement('div', { className: 'text-xs font-medium text-muted-foreground px-3 py-2' }, 'Frequently Used'),
                        ...frequentFoods.slice(0, 8).map(food =>
                          React.createElement(FoodItem, { key: `freq:${food.source}:${food.id}`, food, onSelect: handleSelect })
                        ),
                      ),
                      recentFoods.length > 0 && React.createElement(React.Fragment, null,
                        React.createElement('div', { className: 'text-xs font-medium text-muted-foreground px-3 py-2 mt-1' }, 'Recent'),
                        ...recentFoods.slice(0, 10).map(food =>
                          React.createElement(FoodItem, { key: `recent:${food.source}:${food.id}`, food, onSelect: handleSelect })
                        ),
                      ),
                    ),
              ),

              // Create Custom Food button — always visible
              onCreateCustom && React.createElement(Separator, { className: 'my-2' }),
              onCreateCustom && React.createElement(Button, {
                variant: 'outline',
                className: 'w-full',
                onClick: () => { onOpenChange(false); onCreateCustom(); },
              },
                React.createElement(Plus, { className: 'h-4 w-4 mr-2' }),
                'Create Custom Food',
              ),
            ),
      ),
    );
  };
}
