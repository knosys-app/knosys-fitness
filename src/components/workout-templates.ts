import type { SharedDependencies, ExerciseEntry, WorkoutTemplate } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { uuid } from '../utils/date-helpers';

function mode<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T = arr[0]; let bestCount = 0;
  for (const [v, c] of counts) if (c > bestCount) { best = v; bestCount = c; }
  return best;
}

/** Build a WorkoutTemplate from today's logged entries. */
export function templateFromEntries(name: string, entries: ExerciseEntry[]): WorkoutTemplate {
  const now = new Date().toISOString();
  const templateExercises = entries.map((e, idx) => {
    const repsList = (e.sets ?? []).map(s => s.reps);
    const weightList = (e.sets ?? []).map(s => s.weight).filter((w): w is number => typeof w === 'number');
    return {
      exercise_id: e.exercise_id ?? `custom:${e.name}`,
      name: e.name,
      kind: e.kind,
      target_sets: e.kind === 'strength' && e.sets ? e.sets.length : undefined,
      target_reps: mode(repsList),
      target_weight: weightList[0],
      target_duration_min: e.duration_min,
      order: idx,
    };
  });
  return {
    id: uuid(),
    name: name.trim(),
    exercises: templateExercises,
    created_at: now,
    updated_at: now,
  };
}

export function createWorkoutTemplates(Shared: SharedDependencies) {
  const {
    React, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    Card, CardContent, Button, Input, Label, Separator, lucideIcons, cn,
  } = Shared;
  const { Plus, Trash2, Play, Save, Dumbbell } = lucideIcons;

  return function WorkoutTemplatesDialog({
    open, onOpenChange, todayEntries, onApply, onSavedFromToday,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    todayEntries: ExerciseEntry[];
    onApply: (template: WorkoutTemplate) => void | Promise<void>;
    /** Fires after a new template is created from today's log. */
    onSavedFromToday?: (template: WorkoutTemplate) => void;
  }) {
    const [templates, setTemplates] = React.useState<WorkoutTemplate[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [newName, setNewName] = React.useState('');

    const refresh = React.useCallback(async () => {
      setLoading(true);
      const list = await getStorage().getWorkoutTemplates();
      setTemplates(list);
      setLoading(false);
    }, []);

    React.useEffect(() => { if (open) refresh(); }, [open, refresh]);

    const handleSaveFromToday = async () => {
      const name = newName.trim();
      if (!name) return;
      if (todayEntries.length === 0) return;
      const template = templateFromEntries(name, todayEntries);
      await getStorage().saveWorkoutTemplate(template);
      setNewName('');
      onSavedFromToday?.(template);
      await refresh();
    };

    const handleDelete = async (id: string) => {
      await getStorage().deleteWorkoutTemplate(id);
      await refresh();
    };

    const handleApply = async (t: WorkoutTemplate) => {
      await onApply(t);
      onOpenChange(false);
    };

    return React.createElement(Dialog, { open, onOpenChange },
      React.createElement(DialogContent, {
        className: 'max-w-lg', style: { maxHeight: '85vh', overflowY: 'auto' },
      },
        React.createElement(DialogHeader, null,
          React.createElement(DialogTitle, null, 'Workout Templates'),
        ),

        // Save today's workout as a template
        React.createElement(Card, null,
          React.createElement(CardContent, { className: 'p-3 space-y-2' },
            React.createElement('div', { className: 'flex items-center gap-2 text-sm font-medium' },
              React.createElement(Save, { className: 'h-4 w-4 text-muted-foreground' }),
              'Save today as template',
            ),
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement(Input, {
                value: newName,
                onChange: (e: any) => setNewName(e.target.value),
                placeholder: todayEntries.length ? `e.g. Push Day A (${todayEntries.length} exercises)` : 'Log exercises first…',
                className: 'h-8 text-sm',
                disabled: todayEntries.length === 0,
              }),
              React.createElement(Button, {
                size: 'sm', onClick: handleSaveFromToday,
                disabled: !newName.trim() || todayEntries.length === 0,
              }, 'Save'),
            ),
          ),
        ),

        React.createElement(Separator, { className: 'my-2' }),

        // Existing templates
        React.createElement('div', { className: 'text-xs font-medium text-muted-foreground mb-2' },
          `Your templates (${templates.length})`),
        loading
          ? React.createElement('div', { className: 'text-sm text-muted-foreground text-center py-6' }, 'Loading…')
          : templates.length === 0
          ? React.createElement('div', {
              className: 'text-sm text-muted-foreground text-center py-6 space-y-2',
            },
              React.createElement(Dumbbell, { className: 'h-6 w-6 text-muted-foreground/40 mx-auto' }),
              React.createElement('div', null, 'No templates yet. Save today\u2019s workout to reuse it.'),
            )
          : React.createElement('div', { className: 'space-y-2' },
              ...templates.map(t =>
                React.createElement(Card, { key: t.id },
                  React.createElement(CardContent, { className: 'p-3 flex items-center gap-3' },
                    React.createElement('div', { className: 'flex-1 min-w-0' },
                      React.createElement('div', { className: 'text-sm font-medium truncate' }, t.name),
                      React.createElement('div', { className: 'text-xs text-muted-foreground truncate' },
                        `${t.exercises.length} exercise${t.exercises.length === 1 ? '' : 's'} · ${t.exercises.slice(0, 3).map(e => e.name).join(', ')}${t.exercises.length > 3 ? '…' : ''}`),
                    ),
                    React.createElement(Button, {
                      variant: 'outline', size: 'sm',
                      onClick: () => handleApply(t),
                    },
                      React.createElement(Play, { className: 'h-3.5 w-3.5 mr-1' }),
                      'Apply',
                    ),
                    React.createElement(Button, {
                      variant: 'ghost', size: 'icon',
                      className: 'h-7 w-7',
                      onClick: () => handleDelete(t.id),
                      'aria-label': 'Delete template',
                    }, React.createElement(Trash2, { className: 'h-3.5 w-3.5 text-destructive' })),
                  ),
                ),
              ),
            ),

        React.createElement(DialogFooter, { className: 'mt-3' },
          React.createElement(Button, { variant: 'outline', onClick: () => onOpenChange(false) }, 'Close'),
        ),
      ),
    );
  };
}
