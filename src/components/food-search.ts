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

  function ServingsSelector({ food, mealType, onAdd, onCancel }: {
    food: NormalizedFood; mealType: MealType; onAdd: (servings: number) => void; onCancel: () => void;
  }) {
    const [servings, setServings] = React.useState(1);
    const cal = Math.round(food.calories * servings);
    const p = Math.round(food.protein_g * servings * 10) / 10;
    const c = Math.round(food.carbs_g * servings * 10) / 10;
    const f = Math.round(food.fat_g * servings * 10) / 10;

    return React.createElement('div', { className: 'space-y-4 p-1' },
      React.createElement('div', null,
        React.createElement('div', { className: 'text-base font-semibold' }, food.name),
        food.brand && React.createElement('div', { className: 'text-sm text-muted-foreground' }, food.brand),
        React.createElement(Badge, { variant: 'secondary', className: 'mt-1 text-xs' },
          food.source === 'openfoodfacts' ? 'Open Food Facts' :
          food.source === 'usda' ? 'USDA' :
          food.source === 'custom' ? 'Custom' : 'Recipe',
        ),
      ),

      React.createElement(Separator, null),

      // Nutrition for selected servings
      React.createElement('div', { className: 'grid grid-cols-4 gap-2 text-center' },
        ...([
          { label: 'Calories', value: formatCal(cal), color: '' },
          { label: 'Protein', value: formatG(p), color: 'text-blue-500' },
          { label: 'Carbs', value: formatG(c), color: 'text-amber-500' },
          { label: 'Fat', value: formatG(f), color: 'text-red-500' },
        ]).map(({ label, value, color }) =>
          React.createElement('div', { key: label },
            React.createElement('div', { className: cn('text-lg font-bold', color) }, value),
            React.createElement('div', { className: 'text-[10px] text-muted-foreground' }, label),
          )
        ),
      ),

      // Nutrition label (expandable)
      React.createElement(NutritionLabel, { food, servings }),

      // Servings control
      React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement(Label, null, 'Servings'),
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement(Button, {
            variant: 'outline', size: 'icon', className: 'h-8 w-8',
            onClick: () => setServings(Math.max(0.25, servings - 0.25)),
          }, React.createElement(Minus, { className: 'h-3 w-3' })),
          React.createElement(Input, {
            type: 'number', min: 0.25, step: 0.25, value: servings,
            onChange: (e: any) => setServings(Math.max(0.25, parseFloat(e.target.value) || 0.25)),
            className: 'w-20 text-center h-8',
          }),
          React.createElement(Button, {
            variant: 'outline', size: 'icon', className: 'h-8 w-8',
            onClick: () => setServings(servings + 0.25),
          }, React.createElement(Plus, { className: 'h-3 w-3' })),
        ),
      ),
      React.createElement('div', { className: 'text-xs text-muted-foreground text-center' },
        `${servings} × ${food.serving_label} (${Math.round(food.serving_size_g * servings)}g)`),

      React.createElement('div', { className: 'flex gap-2' },
        React.createElement(Button, { variant: 'outline', className: 'flex-1', onClick: onCancel }, 'Cancel'),
        React.createElement(Button, {
          className: 'flex-1',
          onClick: () => onAdd(servings),
        }, `Add to ${MEAL_LABELS[mealType]}`),
      ),
    );
  }

  return function FoodSearchDialog({ open, onOpenChange, mealType, onAddFood }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mealType: MealType;
    onAddFood: (food: NormalizedFood, servings: number) => void;
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
      React.createElement(DialogContent, { className: 'max-w-md max-h-[85vh] flex flex-col' },
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
              React.createElement(ScrollArea, { className: 'flex-1 -mx-2 min-h-0 max-h-[400px]' },
                searching
                  ? React.createElement('div', { className: 'flex items-center justify-center py-8 text-sm text-muted-foreground' }, 'Searching...')
                  : query && results.length === 0
                  ? React.createElement('div', { className: 'flex items-center justify-center py-8 text-sm text-muted-foreground' }, 'No results found')
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
            ),
      ),
    );
  };
}
