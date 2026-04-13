import type { SharedDependencies, MealType, MealLog, FoodEntry } from '../types';
import { MEAL_LABELS } from '../types';
import { mealTotals, formatCal, formatG, entryNutrients } from '../utils/nutrients';

export function createMealSection(Shared: SharedDependencies) {
  const {
    React, Button, Card, CardContent, Input, Label,
    Popover, PopoverContent, PopoverTrigger,
    lucideIcons, cn,
  } = Shared;
  const { Plus, Minus, Trash2, ChevronDown, ChevronUp, BookmarkPlus, Pencil } = lucideIcons;

  // Servings edit popover
  function ServingsEditor({ entry, onUpdate, onClose }: {
    entry: FoodEntry; onUpdate: (s: number) => void; onClose: () => void;
  }) {
    const [servings, setServings] = React.useState(entry.servings);
    const handleSave = () => {
      if (servings > 0) {
        onUpdate(servings);
        onClose();
      }
    };

    return React.createElement('div', { className: 'p-3 space-y-3 w-[240px]' },
      React.createElement('div', { className: 'text-xs font-medium truncate' }, entry.food.name),
      React.createElement('div', { className: 'text-[10px] text-muted-foreground' },
        `per serving: ${entry.food.serving_label}`),

      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement(Button, {
          variant: 'outline', size: 'icon', className: 'h-7 w-7 shrink-0',
          onClick: () => setServings(Math.max(0.25, Math.round((servings - 0.25) * 4) / 4)),
        }, React.createElement(Minus, { className: 'h-3 w-3' })),
        React.createElement(Input, {
          type: 'number', min: 0.25, step: 0.25, value: servings,
          onChange: (e: any) => setServings(Math.max(0.25, parseFloat(e.target.value) || 0.25)),
          className: 'h-7 text-center tabular-nums',
        }),
        React.createElement(Button, {
          variant: 'outline', size: 'icon', className: 'h-7 w-7 shrink-0',
          onClick: () => setServings(Math.round((servings + 0.25) * 4) / 4),
        }, React.createElement(Plus, { className: 'h-3 w-3' })),
      ),

      React.createElement('div', { className: 'text-[11px] text-center tabular-nums' },
        `= ${Math.round(entry.food.calories * servings)} cal`),

      React.createElement('div', { className: 'flex gap-2' },
        React.createElement(Button, {
          variant: 'ghost', size: 'sm', className: 'flex-1 h-7 text-xs',
          onClick: onClose,
        }, 'Cancel'),
        React.createElement(Button, {
          size: 'sm', className: 'flex-1 h-7 text-xs',
          onClick: handleSave,
        }, 'Update'),
      ),
    );
  }

  function FoodEntryRow({ entry, onRemove, onUpdateServings }: {
    entry: FoodEntry; onRemove: () => void; onUpdateServings: (s: number) => void;
  }) {
    const [editOpen, setEditOpen] = React.useState(false);
    const n = entryNutrients(entry);

    return React.createElement('div', {
      className: 'flex items-center justify-between py-2 group',
    },
      React.createElement('div', { className: 'flex-1 min-w-0' },
        React.createElement('div', { className: 'text-sm font-medium truncate' }, entry.food.name),
        React.createElement('div', { className: 'text-xs text-muted-foreground tabular-nums' },
          `${entry.servings} × ${entry.food.serving_label}`,
          entry.food.brand ? ` · ${entry.food.brand}` : '',
        ),
      ),
      React.createElement('div', { className: 'flex items-center gap-1 ml-2' },
        React.createElement('div', { className: 'text-right' },
          React.createElement('div', { className: 'text-sm font-medium tabular-nums' }, `${n.calories}`),
          React.createElement('div', {
            className: 'text-[10px] text-muted-foreground tabular-nums',
          }, `P${formatG(n.protein_g)} C${formatG(n.carbs_g)} F${formatG(n.fat_g)}`),
        ),
        React.createElement(Popover, { open: editOpen, onOpenChange: setEditOpen },
          React.createElement(PopoverTrigger, { asChild: true },
            React.createElement(Button, {
              variant: 'ghost', size: 'icon',
              className: 'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
              onClick: (e: any) => e.stopPropagation(),
            }, React.createElement(Pencil, { className: 'h-3.5 w-3.5 text-muted-foreground' })),
          ),
          React.createElement(PopoverContent, { className: 'p-0', align: 'end', side: 'left' },
            React.createElement(ServingsEditor, {
              entry, onUpdate: onUpdateServings, onClose: () => setEditOpen(false),
            }),
          ),
        ),
        React.createElement(Button, {
          variant: 'ghost', size: 'icon',
          className: 'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
          onClick: (e: any) => { e.stopPropagation(); onRemove(); },
        }, React.createElement(Trash2, { className: 'h-3.5 w-3.5 text-destructive' })),
      ),
    );
  }

  return function MealSection({ mealType, meal, onAddFood, onRemoveEntry, onUpdateServings, onSaveAsTemplate }: {
    mealType: MealType;
    meal: MealLog;
    onAddFood: () => void;
    onRemoveEntry: (id: string) => void;
    onUpdateServings: (id: string, servings: number) => void;
    onSaveAsTemplate?: () => void;
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
            className: 'text-xs text-muted-foreground tabular-nums',
          }, `${meal.entries.length} item${meal.entries.length === 1 ? '' : 's'}`),
        ),
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('span', { className: 'text-sm font-medium tabular-nums' },
            `${formatCal(totals.calories)} cal`),
          React.createElement(expanded ? ChevronUp : ChevronDown, { className: 'h-4 w-4 text-muted-foreground' }),
        ),
      ),

      expanded && React.createElement(CardContent, { className: 'px-4 py-0 pb-3' },
        meal.entries.length > 0 && React.createElement('div', { className: 'divide-y' },
          ...meal.entries.map(entry =>
            React.createElement(FoodEntryRow, {
              key: entry.id, entry,
              onRemove: () => onRemoveEntry(entry.id),
              onUpdateServings: (s: number) => onUpdateServings(entry.id, s),
            }),
          ),
        ),

        React.createElement('div', { className: 'flex gap-1 mt-1' },
          React.createElement(Button, {
            variant: 'ghost', size: 'sm',
            className: 'flex-1 text-muted-foreground hover:text-primary',
            onClick: onAddFood,
          },
            React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
            'Add Food',
          ),
          onSaveAsTemplate && meal.entries.length > 0 && React.createElement(Button, {
            variant: 'ghost', size: 'sm',
            className: 'text-muted-foreground hover:text-primary',
            onClick: onSaveAsTemplate,
          },
            React.createElement(BookmarkPlus, { className: 'h-4 w-4 mr-1' }),
            'Save as Template',
          ),
        ),
      ),
    );
  };
}
