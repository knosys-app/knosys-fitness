import type { SharedDependencies, MealTemplate, NormalizedFood } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { uuid } from '../utils/date-helpers';
import { formatCal } from '../utils/nutrients';

export function createMealTemplates(Shared: SharedDependencies) {
  const {
    React, Card, CardContent, Button, Input, Label,
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    lucideIcons, cn,
  } = Shared;
  const { BookmarkPlus, Trash2, Copy, Plus } = lucideIcons;

  return function MealTemplatesPage() {
    const [templates, setTemplates] = React.useState<MealTemplate[]>([]);
    const [loading, setLoading] = React.useState(true);
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
      await load();
    };

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
