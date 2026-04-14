import type { SharedDependencies, ExerciseLog as ExerciseLogType } from '../types';
import { formatCal } from '../utils/nutrients';
import { createEmptyState } from './empty-state';

export function createExerciseLog(Shared: SharedDependencies) {
  const {
    React, Card, CardContent, Button, Input, Label,
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    lucideIcons, cn,
  } = Shared;
  const { Flame, Plus, Trash2 } = lucideIcons;

  const EmptyState = createEmptyState(Shared);

  function AddExerciseDialog({ open, onOpenChange, onAdd }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (name: string, duration: number, calories: number) => void;
  }) {
    const [name, setName] = React.useState('');
    const [duration, setDuration] = React.useState('30');
    const [calories, setCalories] = React.useState('');

    const handleAdd = () => {
      onAdd(name.trim(), parseInt(duration) || 0, parseInt(calories) || 0);
      setName(''); setDuration('30'); setCalories('');
      onOpenChange(false);
    };

    return React.createElement(Dialog, { open, onOpenChange },
      React.createElement(DialogContent, { className: 'max-w-sm' },
        React.createElement(DialogHeader, null,
          React.createElement(DialogTitle, null, 'Add Exercise'),
        ),
        React.createElement('div', { className: 'space-y-3' },
          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Exercise Name'),
            React.createElement(Input, {
              value: name, onChange: (e: any) => setName(e.target.value),
              placeholder: 'e.g. Running, Cycling', className: 'h-8', autoFocus: true,
            }),
          ),
          React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
            React.createElement('div', { className: 'space-y-1' },
              React.createElement(Label, { className: 'text-xs' }, 'Duration (min)'),
              React.createElement(Input, {
                type: 'number', min: 1, value: duration,
                onChange: (e: any) => setDuration(e.target.value), className: 'h-8',
              }),
            ),
            React.createElement('div', { className: 'space-y-1' },
              React.createElement(Label, { className: 'text-xs' }, 'Calories Burned'),
              React.createElement(Input, {
                type: 'number', min: 0, value: calories,
                onChange: (e: any) => setCalories(e.target.value), className: 'h-8',
              }),
            ),
          ),
        ),
        React.createElement(DialogFooter, null,
          React.createElement(Button, { variant: 'outline', onClick: () => onOpenChange(false) }, 'Cancel'),
          React.createElement(Button, { onClick: handleAdd, disabled: !name.trim() }, 'Add'),
        ),
      ),
    );
  }

  return function ExerciseLogComponent({ exercise, onAddExercise, onRemoveExercise }: {
    exercise: ExerciseLogType;
    onAddExercise: (name: string, duration: number, calories: number) => void;
    onRemoveExercise: (id: string) => void;
  }) {
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const totalCal = exercise.entries.reduce((sum, e) => sum + e.calories_burned, 0);

    return React.createElement(React.Fragment, null,
      exercise.entries.length === 0
        ? React.createElement(Card, null,
            React.createElement(CardContent, { className: 'p-0' },
              React.createElement(EmptyState, {
                icon: 'Flame',
                title: 'No workouts logged',
                description: 'Add exercise to subtract burned calories from your daily total.',
                action: { label: 'Add Exercise', iconName: 'Plus', onClick: () => setDialogOpen(true) },
              }),
            ),
          )
        : React.createElement(Card, null,
            React.createElement(CardContent, { className: 'p-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('div', { className: 'flex items-center gap-2' },
                  React.createElement(Flame, { className: 'h-4 w-4 text-orange-500' }),
                  React.createElement('span', { className: 'text-sm font-semibold' }, 'Exercise'),
                ),
                React.createElement('span', { className: 'text-sm text-muted-foreground tabular-nums' },
                  `${formatCal(totalCal)} cal burned`),
              ),
              React.createElement('div', { className: 'divide-y mb-2' },
                ...exercise.entries.map(entry =>
                  React.createElement('div', { key: entry.id, className: 'flex items-center justify-between py-1.5 group' },
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-sm' }, entry.name),
                      React.createElement('div', { className: 'text-xs text-muted-foreground tabular-nums' },
                        `${entry.duration_min} min`),
                    ),
                    React.createElement('div', { className: 'flex items-center gap-2' },
                      React.createElement('span', { className: 'text-sm tabular-nums' }, `${entry.calories_burned} cal`),
                      React.createElement(Button, {
                        variant: 'ghost', size: 'icon',
                        className: 'h-7 w-7 opacity-0 group-hover:opacity-100 hover:scale-110 transition-all',
                        onClick: () => onRemoveExercise(entry.id),
                      }, React.createElement(Trash2, { className: 'h-3.5 w-3.5 text-destructive' })),
                    ),
                  ),
                ),
              ),
              React.createElement(Button, {
                variant: 'ghost', size: 'sm',
                className: 'w-full text-muted-foreground hover:text-primary',
                onClick: () => setDialogOpen(true),
              },
                React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
                'Add Exercise',
              ),
            ),
          ),

      React.createElement(AddExerciseDialog, {
        open: dialogOpen, onOpenChange: setDialogOpen, onAdd: onAddExercise,
      }),
    );
  };
}
