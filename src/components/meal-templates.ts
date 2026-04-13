import type { SharedDependencies, MealTemplate, NormalizedFood } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { uuid } from '../utils/date-helpers';
import { formatCal, formatG } from '../utils/nutrients';
import { createFoodSearchDialog } from './food-search';

export function createMealTemplates(Shared: SharedDependencies) {
  const {
    React, Card, CardContent, Button, Input, Label,
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    Separator, lucideIcons, cn,
  } = Shared;
  const { BookmarkPlus, Trash2, Plus, Pencil, ArrowLeft } = lucideIcons;

  const FoodSearchDialog = createFoodSearchDialog(Shared);

  function TemplateEditor({ template, onSave, onCancel }: {
    template: MealTemplate;
    onSave: (t: MealTemplate) => void;
    onCancel: () => void;
  }) {
    const [name, setName] = React.useState(template.name);
    const [items, setItems] = React.useState(template.items);
    const [searchOpen, setSearchOpen] = React.useState(false);

    const totalCal = items.reduce((sum, item) => sum + item.food.calories * item.servings, 0);

    const handleAddFood = (food: NormalizedFood, servings: number) => {
      setItems([...items, { food, servings }]);
    };

    const handleRemove = (index: number) => {
      setItems(items.filter((_, i) => i !== index));
    };

    const handleSave = () => {
      onSave({ ...template, name: name.trim(), items });
    };

    return React.createElement('div', { className: 'space-y-4' },
      React.createElement(Button, {
        variant: 'ghost', size: 'sm', className: 'gap-1',
        onClick: onCancel,
      }, React.createElement(ArrowLeft, { className: 'h-3.5 w-3.5' }), 'Back'),

      React.createElement('div', { className: 'space-y-1' },
        React.createElement(Label, { className: 'text-xs' }, 'Template Name'),
        React.createElement(Input, {
          value: name, onChange: (e: any) => setName(e.target.value),
          placeholder: 'e.g. My Breakfast', className: 'h-8',
        }),
      ),

      React.createElement(Separator, null),

      React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement(Label, { className: 'text-xs' },
          `Items (${items.length})${totalCal > 0 ? ` · ${formatCal(totalCal)} cal total` : ''}`),
        React.createElement(Button, {
          variant: 'outline', size: 'sm', className: 'h-7 text-xs',
          onClick: () => setSearchOpen(true),
        }, React.createElement(Plus, { className: 'h-3 w-3 mr-1' }), 'Add Food'),
      ),

      items.length > 0
        ? React.createElement('div', { className: 'space-y-1' },
            ...items.map((item, i) =>
              React.createElement('div', {
                key: i,
                className: 'flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 group',
              },
                React.createElement('div', { className: 'flex-1 min-w-0' },
                  React.createElement('div', { className: 'text-sm truncate' }, item.food.name),
                  React.createElement('div', { className: 'text-xs text-muted-foreground' },
                    `${item.servings} × ${item.food.serving_label} · ${Math.round(item.food.calories * item.servings)} cal`),
                ),
                React.createElement(Button, {
                  variant: 'ghost', size: 'icon',
                  className: 'h-7 w-7 opacity-0 group-hover:opacity-100',
                  onClick: () => handleRemove(i),
                }, React.createElement(Trash2, { className: 'h-3.5 w-3.5 text-destructive' })),
              ),
            ),
          )
        : React.createElement('div', { className: 'text-sm text-muted-foreground text-center py-4' },
            'No items yet. Add foods to this template.'),

      React.createElement(Button, {
        className: 'w-full', disabled: !name.trim(),
        onClick: handleSave,
      }, 'Save Template'),

      React.createElement(FoodSearchDialog, {
        open: searchOpen, onOpenChange: setSearchOpen,
        mealType: 'breakfast',
        onAddFood: handleAddFood,
      }),
    );
  }

  return function MealTemplatesPage() {
    const [templates, setTemplates] = React.useState<MealTemplate[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [editing, setEditing] = React.useState<MealTemplate | null>(null);
    const [createOpen, setCreateOpen] = React.useState(false);
    const [newName, setNewName] = React.useState('');

    const load = React.useCallback(async () => {
      setLoading(true);
      const t = await getStorage().getAllTemplates();
      setTemplates(t);
      setLoading(false);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const handleDelete = async (id: string) => {
      await getStorage().deleteTemplate(id);
      await load();
    };

    const handleCreate = async () => {
      if (!newName.trim()) return;
      const template: MealTemplate = {
        id: uuid(),
        name: newName.trim(),
        items: [],
      };
      await getStorage().setTemplate(template);
      setNewName('');
      setCreateOpen(false);
      // Open editor immediately
      setEditing(template);
    };

    const handleSave = async (template: MealTemplate) => {
      await getStorage().setTemplate(template);
      setEditing(null);
      await load();
    };

    if (editing) {
      return React.createElement('div', { className: 'max-w-md mx-auto' },
        React.createElement(TemplateEditor, {
          template: editing,
          onSave: handleSave,
          onCancel: () => { setEditing(null); load(); },
        }),
      );
    }

    return React.createElement('div', { className: 'space-y-4' },
      React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement('h2', { className: 'text-lg font-semibold flex items-center gap-2' },
          React.createElement(BookmarkPlus, { className: 'h-5 w-5' }),
          'Meal Templates',
        ),
        React.createElement(Button, { size: 'sm', onClick: () => setCreateOpen(true) },
          React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
          'New Template',
        ),
      ),

      loading
        ? React.createElement('div', { className: 'text-sm text-muted-foreground text-center py-8' }, 'Loading...')
        : templates.length === 0
        ? React.createElement('div', { className: 'text-sm text-muted-foreground text-center py-8' },
            'No meal templates yet. Save common meals as templates for quick logging.')
        : React.createElement('div', { className: 'space-y-2' },
            ...templates.map(template => {
              const totalCal = template.items.reduce((sum, item) => sum + item.food.calories * item.servings, 0);

              return React.createElement(Card, { key: template.id },
                React.createElement(CardContent, { className: 'p-3 flex items-center justify-between' },
                  React.createElement('div', { className: 'flex-1 min-w-0' },
                    React.createElement('div', { className: 'text-sm font-medium' }, template.name),
                    React.createElement('div', { className: 'text-xs text-muted-foreground' },
                      `${template.items.length} item${template.items.length === 1 ? '' : 's'}${totalCal > 0 ? ` · ${formatCal(totalCal)} cal` : ''}`),
                  ),
                  React.createElement('div', { className: 'flex gap-1 ml-2' },
                    React.createElement(Button, {
                      variant: 'ghost', size: 'icon', className: 'h-7 w-7',
                      onClick: () => setEditing(template),
                    }, React.createElement(Pencil, { className: 'h-3.5 w-3.5' })),
                    React.createElement(Button, {
                      variant: 'ghost', size: 'icon', className: 'h-7 w-7',
                      onClick: () => handleDelete(template.id),
                    }, React.createElement(Trash2, { className: 'h-3.5 w-3.5 text-destructive' })),
                  ),
                ),
              );
            }),
          ),

      // Create template dialog
      React.createElement(Dialog, { open: createOpen, onOpenChange: setCreateOpen },
        React.createElement(DialogContent, { className: 'max-w-sm' },
          React.createElement(DialogHeader, null,
            React.createElement(DialogTitle, null, 'Create Meal Template'),
          ),
          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Template Name'),
            React.createElement(Input, {
              value: newName, onChange: (e: any) => setNewName(e.target.value),
              placeholder: 'e.g. My Breakfast', className: 'h-8', autoFocus: true,
            }),
          ),
          React.createElement(DialogFooter, null,
            React.createElement(Button, { variant: 'outline', onClick: () => setCreateOpen(false) }, 'Cancel'),
            React.createElement(Button, { onClick: handleCreate, disabled: !newName.trim() }, 'Create'),
          ),
        ),
      ),
    );
  };
}
