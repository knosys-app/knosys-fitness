import type { SharedDependencies, MealType, MealLog, FoodEntry } from '../types';
import { MEAL_LABELS } from '../types';
import { mealTotals, formatCal, formatG, entryNutrients } from '../utils/nutrients';

export function createMealSection(Shared: SharedDependencies) {
  const { React, Button, Card, CardContent, CardHeader, CardTitle, lucideIcons, cn } = Shared;
  const { Plus, Trash2, ChevronDown, ChevronUp } = lucideIcons;

  return function MealSection({ mealType, meal, onAddFood, onRemoveEntry, onUpdateServings }: {
    mealType: MealType;
    meal: MealLog;
    onAddFood: () => void;
    onRemoveEntry: (id: string) => void;
    onUpdateServings: (id: string, servings: number) => void;
  }) {
    const [expanded, setExpanded] = React.useState(true);
    const totals = mealTotals(meal);

    return React.createElement(Card, { className: 'overflow-hidden' },
      React.createElement('button', {
        onClick: () => setExpanded(!expanded),
        className: 'flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors',
      },
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'font-semibold text-sm' }, MEAL_LABELS[mealType]),
          meal.entries.length > 0 && React.createElement('span', {
            className: 'text-xs text-muted-foreground',
          }, `${meal.entries.length} item${meal.entries.length === 1 ? '' : 's'}`),
        ),
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('span', { className: 'text-sm font-medium' }, `${formatCal(totals.calories)} cal`),
          React.createElement(expanded ? ChevronUp : ChevronDown, { className: 'h-4 w-4 text-muted-foreground' }),
        ),
      ),

      expanded && React.createElement(CardContent, { className: 'px-4 py-0 pb-3' },
        // Food entries
        meal.entries.length > 0 && React.createElement('div', { className: 'divide-y' },
          ...meal.entries.map(entry => {
            const n = entryNutrients(entry);
            return React.createElement('div', {
              key: entry.id,
              className: 'flex items-center justify-between py-2 group',
            },
              React.createElement('div', { className: 'flex-1 min-w-0' },
                React.createElement('div', { className: 'text-sm font-medium truncate' }, entry.food.name),
                React.createElement('div', { className: 'text-xs text-muted-foreground' },
                  `${entry.servings} × ${entry.food.serving_label}`,
                  entry.food.brand ? ` · ${entry.food.brand}` : '',
                ),
              ),
              React.createElement('div', { className: 'flex items-center gap-2 ml-2' },
                React.createElement('div', { className: 'text-right' },
                  React.createElement('div', { className: 'text-sm font-medium' }, `${n.calories}`),
                  React.createElement('div', { className: 'text-[10px] text-muted-foreground' },
                    `P${formatG(n.protein_g)} C${formatG(n.carbs_g)} F${formatG(n.fat_g)}`),
                ),
                React.createElement(Button, {
                  variant: 'ghost',
                  size: 'icon',
                  className: 'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
                  onClick: (e: any) => { e.stopPropagation(); onRemoveEntry(entry.id); },
                }, React.createElement(Trash2, { className: 'h-3.5 w-3.5 text-destructive' })),
              ),
            );
          }),
        ),

        // Add food button
        React.createElement(Button, {
          variant: 'ghost',
          size: 'sm',
          className: 'w-full mt-1 text-muted-foreground hover:text-primary',
          onClick: onAddFood,
        },
          React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
          'Add Food',
        ),
      ),
    );
  };
}
