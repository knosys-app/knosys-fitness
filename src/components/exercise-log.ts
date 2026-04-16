import type { SharedDependencies, ExerciseLog as ExerciseLogType, ExerciseEntry, ExerciseSet } from '../types';
import { formatCal } from '../utils/nutrients';
import { createEmptyState } from './empty-state';

function summarizeSets(sets: ExerciseSet[]): string {
  if (!sets.length) return '0 sets';
  const weights = sets.map(s => s.weight).filter((w): w is number => typeof w === 'number');
  const unit = sets[0]?.weight_unit ?? 'lb';
  const repsSame = sets.every(s => s.reps === sets[0].reps);
  const weightSame = weights.length === sets.length && weights.every(w => w === weights[0]);
  if (repsSame && weightSame && weights.length) {
    return `${sets.length}×${sets[0].reps} @ ${weights[0]} ${unit}`;
  }
  const topWeight = weights.length ? Math.max(...weights) : undefined;
  return topWeight != null
    ? `${sets.length} sets · top ${topWeight} ${unit}`
    : `${sets.length} sets`;
}

function describeCardio(entry: ExerciseEntry): string {
  const parts: string[] = [];
  if (entry.duration_min != null) parts.push(`${entry.duration_min} min`);
  if (entry.distance != null) parts.push(`${entry.distance} ${entry.distance_unit ?? 'km'}`);
  return parts.join(' · ') || '—';
}

export function createExerciseLog(Shared: SharedDependencies) {
  const { React, Card, CardContent, Button, lucideIcons } = Shared;
  const { Flame, Plus, Trash2, Pencil } = lucideIcons;

  const EmptyState = createEmptyState(Shared);

  return function ExerciseLogComponent({ exercise, onAdd, onEdit, onRemove, onOpenHistory }: {
    exercise: ExerciseLogType;
    onAdd: () => void;
    onEdit: (entry: ExerciseEntry) => void;
    onRemove: (id: string) => void;
    onOpenHistory?: (entry: ExerciseEntry) => void;
  }) {
    const totalCal = exercise.entries.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0);

    if (exercise.entries.length === 0) {
      return React.createElement(Card, null,
        React.createElement(CardContent, { className: 'p-0' },
          React.createElement(EmptyState, {
            icon: 'Flame',
            title: 'No workouts logged',
            description: 'Add an exercise from the catalog to track sets, reps, and calories.',
            action: { label: 'Add Exercise', iconName: 'Plus', onClick: onAdd },
          }),
        ),
      );
    }

    return React.createElement(Card, null,
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
              React.createElement('button', {
                className: 'flex-1 min-w-0 text-left',
                onClick: () => {
                  if (entry.exercise_id && onOpenHistory) onOpenHistory(entry);
                  else onEdit(entry);
                },
              },
                React.createElement('div', { className: 'text-sm flex items-center gap-1.5' },
                  React.createElement('span', { className: 'truncate' }, entry.name),
                  entry.kind === 'strength' && React.createElement('span', {
                    className: 'text-[9px] font-medium uppercase tracking-wide text-muted-foreground',
                  }, 'ST'),
                ),
                React.createElement('div', { className: 'text-xs text-muted-foreground tabular-nums' },
                  entry.kind === 'strength' && entry.sets?.length
                    ? summarizeSets(entry.sets)
                    : describeCardio(entry)),
              ),
              React.createElement('div', { className: 'flex items-center gap-2' },
                React.createElement('span', { className: 'text-sm tabular-nums' }, `${entry.calories_burned ?? 0} cal`),
                React.createElement(Button, {
                  variant: 'ghost', size: 'icon',
                  className: 'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
                  onClick: () => onEdit(entry), 'aria-label': 'Edit',
                }, React.createElement(Pencil, { className: 'h-3.5 w-3.5' })),
                React.createElement(Button, {
                  variant: 'ghost', size: 'icon',
                  className: 'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
                  onClick: () => onRemove(entry.id), 'aria-label': 'Remove',
                }, React.createElement(Trash2, { className: 'h-3.5 w-3.5 text-destructive' })),
              ),
            ),
          ),
        ),
        React.createElement(Button, {
          variant: 'ghost', size: 'sm',
          className: 'w-full text-muted-foreground hover:text-primary',
          onClick: onAdd,
        },
          React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
          'Add Exercise',
        ),
      ),
    );
  };
}
