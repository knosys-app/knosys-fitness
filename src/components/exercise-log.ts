import type { SharedDependencies, ExerciseLog as ExerciseLogType, ExerciseEntry } from '../types';
import { formatCal } from '../utils/nutrients';
import { createEmptyState } from './empty-state';
import {
  createNumericReadout,
  createSemanticBadge,
} from '../design-system/primitives';
import { SIG_PALETTE } from '../theme/palette';

/**
 * ExerciseLog — redesigned signature variant. Renders the today's list
 * with an inline add form at the bottom (no dialog for the common case).
 */
export function createExerciseLog(Shared: SharedDependencies) {
  const { React, Button, Input, Label, lucideIcons } = Shared;
  const { Flame, Plus, Trash2, X: XIcon } = lucideIcons;

  const NumericReadout = createNumericReadout(Shared);
  const SemanticBadge = createSemanticBadge(Shared);
  const EmptyState = createEmptyState(Shared);

  function ExerciseRow({ entry, onRemove }: {
    entry: ExerciseEntry; onRemove: () => void;
  }) {
    const [hovered, setHovered] = React.useState(false);
    return React.createElement('div', {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 4px',
        borderBottom: '1px solid var(--knf-hairline)',
        borderRadius: 6,
        transition: 'background var(--knf-duration-1) var(--knf-ease)',
        background: hovered ? 'var(--knf-hero-wash)' : 'transparent',
      },
    },
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', {
          style: {
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--knf-ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        }, entry.name),
        React.createElement('div', {
          style: {
            fontSize: 11,
            color: 'var(--knf-muted)',
            fontFamily: 'var(--knf-font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 2,
          },
        }, `${entry.duration_min} min`),
      ),
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        },
      },
        React.createElement(SemanticBadge, { accent: 'cal-burn', variant: 'soft' },
          `${entry.calories_burned} cal`,
        ),
        React.createElement(Button, {
          variant: 'ghost', size: 'icon',
          className: 'h-7 w-7',
          style: {
            opacity: hovered ? 1 : 0,
            transition: 'opacity var(--knf-duration-1) var(--knf-ease)',
          },
          onClick: onRemove,
        }, React.createElement(Trash2, {
          className: 'h-3.5 w-3.5',
          style: { color: 'var(--knf-alert)' },
        })),
      ),
    );
  }

  function InlineAddForm({ onAdd, onCancel }: {
    onAdd: (name: string, duration: number, calories: number) => void;
    onCancel: () => void;
  }) {
    const [name, setName] = React.useState('');
    const [duration, setDuration] = React.useState('30');
    const [calories, setCalories] = React.useState('');

    const valid = name.trim().length > 0;
    const handleAdd = () => {
      if (!valid) return;
      onAdd(name.trim(), parseInt(duration) || 0, parseInt(calories) || 0);
      setName(''); setDuration('30'); setCalories('');
    };

    return React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        marginTop: 8,
        background: 'var(--knf-surface-2)',
        borderRadius: 'var(--knf-radius-md)',
      },
    },
      React.createElement(Input, {
        placeholder: 'Exercise name (e.g. Running, Cycling)',
        value: name,
        onChange: (e: any) => setName(e.target.value),
        autoFocus: true,
        style: {
          height: 36,
          background: 'var(--knf-surface)',
          fontFamily: 'var(--knf-font-body)',
        },
      }),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
        React.createElement('div', null,
          React.createElement('label', {
            style: {
              fontSize: 10,
              color: 'var(--knf-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'var(--knf-font-mono)',
              fontWeight: 500,
              display: 'block',
              marginBottom: 3,
            },
          }, 'Duration (min)'),
          React.createElement(Input, {
            type: 'number', min: 1, value: duration,
            onChange: (e: any) => setDuration(e.target.value),
            style: { height: 34, fontFamily: 'var(--knf-font-mono)', background: 'var(--knf-surface)' },
          }),
        ),
        React.createElement('div', null,
          React.createElement('label', {
            style: {
              fontSize: 10,
              color: 'var(--knf-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'var(--knf-font-mono)',
              fontWeight: 500,
              display: 'block',
              marginBottom: 3,
            },
          }, 'Calories burned'),
          React.createElement(Input, {
            type: 'number', min: 0, value: calories,
            placeholder: '0',
            onChange: (e: any) => setCalories(e.target.value),
            style: { height: 34, fontFamily: 'var(--knf-font-mono)', background: 'var(--knf-surface)' },
          }),
        ),
      ),
      React.createElement('div', { style: { display: 'flex', gap: 6 } },
        React.createElement(Button, {
          variant: 'ghost', size: 'sm', className: 'flex-1 h-8',
          onClick: onCancel,
        }, 'Cancel'),
        React.createElement(Button, {
          size: 'sm',
          className: 'flex-1 h-8',
          disabled: !valid,
          style: { background: 'var(--knf-hero)', color: 'var(--knf-hero-ink)' },
          onClick: handleAdd,
        }, 'Add'),
      ),
    );
  }

  return function ExerciseLogComponent({ exercise, onAddExercise, onRemoveExercise }: {
    exercise: ExerciseLogType;
    onAddExercise: (name: string, duration: number, calories: number) => void;
    onRemoveExercise: (id: string) => void;
  }) {
    const [formOpen, setFormOpen] = React.useState(false);
    const totalCal = exercise.entries.reduce((sum, e) => sum + e.calories_burned, 0);
    const totalMin = exercise.entries.reduce((sum, e) => sum + e.duration_min, 0);

    const empty = exercise.entries.length === 0;

    return React.createElement('div', {
      style: {
        background: 'var(--knf-surface)',
        border: '1px solid var(--knf-hairline)',
        borderRadius: 'var(--knf-radius-lg)',
        boxShadow: 'var(--knf-shadow-sm)',
        padding: 16,
      },
    },
      // Header
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: empty ? 0 : 10,
        },
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('div', {
            style: {
              width: 26, height: 26, borderRadius: 8,
              background: `rgba(255, 92, 31, 0.12)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            },
          },
            React.createElement(Flame, {
              style: { width: 14, height: 14, color: SIG_PALETTE.calBurn },
            }),
          ),
          React.createElement('span', {
            className: 'knf-eyebrow',
            style: {
              fontFamily: 'var(--knf-font-mono)',
              fontSize: 11,
              color: 'var(--knf-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 500,
            },
          }, 'Today\u2019s exercise'),
        ),
        !empty && React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
            fontFamily: 'var(--knf-font-mono)',
          },
        },
          React.createElement(NumericReadout, {
            value: totalCal,
            style: { fontSize: 20, fontWeight: 700, color: SIG_PALETTE.calBurn },
          }),
          React.createElement('span', {
            style: { fontSize: 11, color: 'var(--knf-muted)' },
          }, `cal \u00B7 ${totalMin} min`),
        ),
      ),

      empty && !formOpen
        ? React.createElement(EmptyState, {
            icon: 'Flame',
            title: 'No workouts logged',
            description: 'Add exercise to subtract burned calories from your daily total.',
            action: { label: 'Add exercise', iconName: 'Plus', onClick: () => setFormOpen(true) },
          })
        : React.createElement(React.Fragment, null,
            !empty && React.createElement('div', {
              style: { display: 'flex', flexDirection: 'column' },
            },
              ...exercise.entries.map(entry =>
                React.createElement(ExerciseRow, {
                  key: entry.id,
                  entry,
                  onRemove: () => onRemoveExercise(entry.id),
                }),
              ),
            ),
            formOpen
              ? React.createElement(InlineAddForm, {
                  onAdd: (n, d, c) => { onAddExercise(n, d, c); setFormOpen(false); },
                  onCancel: () => setFormOpen(false),
                })
              : React.createElement(Button, {
                  variant: 'ghost', size: 'sm',
                  className: 'w-full mt-2',
                  style: {
                    color: 'var(--knf-hero-ink)',
                    fontWeight: 500,
                    justifyContent: 'flex-start',
                  },
                  onClick: () => setFormOpen(true),
                },
                  React.createElement(Plus, { className: 'h-4 w-4 mr-1.5' }),
                  'Add exercise',
                ),
          ),
    );
  };
}
