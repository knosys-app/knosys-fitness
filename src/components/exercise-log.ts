import type { SharedDependencies, ExerciseLog as ExerciseLogType, ExerciseEntry, ExerciseSet } from '../types';
import { createEmptyState } from './empty-state';
import {
  createNumericReadout,
  createSemanticBadge,
} from '../design-system/primitives';
import { SIG_PALETTE } from '../theme/palette';

function summarizeSets(sets: ExerciseSet[]): string {
  if (!sets.length) return '0 sets';
  const weights = sets.map(s => s.weight).filter((w): w is number => typeof w === 'number');
  const unit = sets[0]?.weight_unit ?? 'lb';
  const repsSame = sets.every(s => s.reps === sets[0].reps);
  const weightSame = weights.length === sets.length && weights.every(w => w === weights[0]);
  if (repsSame && weightSame && weights.length) {
    return `${sets.length}×${sets[0].reps} @ ${weights[0]} ${unit}`;
  }
  const top = weights.length ? Math.max(...weights) : undefined;
  return top != null
    ? `${sets.length} sets · top ${top} ${unit}`
    : `${sets.length} sets`;
}

function describeCardio(entry: ExerciseEntry): string {
  const parts: string[] = [];
  if (entry.duration_min != null) parts.push(`${entry.duration_min} min`);
  if (entry.distance != null) parts.push(`${entry.distance} ${entry.distance_unit ?? 'km'}`);
  return parts.join(' · ') || '—';
}

/**
 * ExerciseLog — redesigned signature variant. Post-catalog-port: no
 * inline form. Primary actions open a search dialog / logger dialog
 * owned by the parent (Today page or Workouts tab).
 */
export function createExerciseLog(Shared: SharedDependencies) {
  const { React, Button, lucideIcons } = Shared;
  const { Flame, Plus, Trash2, Pencil, History, ListPlus } = lucideIcons;

  const NumericReadout = createNumericReadout(Shared);
  const SemanticBadge = createSemanticBadge(Shared);
  const EmptyState = createEmptyState(Shared);

  function ExerciseRow({ entry, onEdit, onRemove, onOpenHistory }: {
    entry: ExerciseEntry;
    onEdit: () => void;
    onRemove: () => void;
    onOpenHistory?: () => void;
  }) {
    const [hovered, setHovered] = React.useState(false);
    const isStrength = entry.kind === 'strength' && !!entry.sets?.length;
    const summary = isStrength
      ? summarizeSets(entry.sets!)
      : describeCardio(entry);

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
      React.createElement('button', {
        onClick: () => {
          if (entry.exercise_id && onOpenHistory) onOpenHistory();
          else onEdit();
        },
        style: {
          flex: 1, minWidth: 0, textAlign: 'left',
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
        },
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          React.createElement('span', {
            style: {
              fontSize: 13, fontWeight: 500, color: 'var(--knf-ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            },
          }, entry.name),
          isStrength && React.createElement('span', {
            style: {
              fontSize: 9,
              fontFamily: 'var(--knf-font-mono)',
              color: 'var(--knf-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              flexShrink: 0,
            },
          }, 'ST'),
        ),
        React.createElement('div', {
          style: {
            fontSize: 11,
            color: 'var(--knf-muted)',
            fontFamily: 'var(--knf-font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 2,
          },
        }, summary),
      ),
      React.createElement('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        },
      },
        React.createElement(SemanticBadge, { accent: 'cal-burn', variant: 'soft' },
          `${entry.calories_burned ?? 0} cal`,
        ),
        React.createElement(Button, {
          variant: 'ghost', size: 'icon',
          className: 'h-7 w-7',
          style: {
            opacity: hovered ? 1 : 0,
            transition: 'opacity var(--knf-duration-1) var(--knf-ease)',
          },
          onClick: onEdit,
          'aria-label': 'Edit exercise',
        }, React.createElement(Pencil, {
          className: 'h-3.5 w-3.5',
          style: { color: 'var(--knf-muted)' },
        })),
        React.createElement(Button, {
          variant: 'ghost', size: 'icon',
          className: 'h-7 w-7',
          style: {
            opacity: hovered ? 1 : 0,
            transition: 'opacity var(--knf-duration-1) var(--knf-ease)',
          },
          onClick: onRemove,
          'aria-label': 'Remove exercise',
        }, React.createElement(Trash2, {
          className: 'h-3.5 w-3.5',
          style: { color: 'var(--knf-alert)' },
        })),
      ),
    );
  }

  return function ExerciseLogComponent({
    exercise, onAdd, onEdit, onRemove, onOpenHistory, onOpenTemplates,
  }: {
    exercise: ExerciseLogType;
    onAdd: () => void;
    onEdit: (entry: ExerciseEntry) => void;
    onRemove: (id: string) => void;
    onOpenHistory?: (entry: ExerciseEntry) => void;
    onOpenTemplates?: () => void;
  }) {
    const totalCal = exercise.entries.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0);
    const totalMin = exercise.entries.reduce((sum, e) => sum + (e.duration_min ?? 0), 0);
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: empty ? 0 : 10,
        },
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('div', {
            style: {
              width: 26, height: 26, borderRadius: 8,
              background: 'rgba(255, 92, 31, 0.12)',
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
            display: 'flex', alignItems: 'baseline', gap: 4,
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

      empty
        ? React.createElement(EmptyState, {
            icon: 'Flame',
            title: 'No workouts logged',
            description: 'Pick an exercise from the catalog to log strength sets or cardio blocks.',
            action: { label: 'Log exercise', iconName: 'Plus', onClick: onAdd },
          })
        : React.createElement(React.Fragment, null,
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } },
              ...exercise.entries.map(entry =>
                React.createElement(ExerciseRow, {
                  key: entry.id,
                  entry,
                  onEdit: () => onEdit(entry),
                  onRemove: () => onRemove(entry.id),
                  onOpenHistory: onOpenHistory ? () => onOpenHistory(entry) : undefined,
                }),
              ),
            ),
            React.createElement('div', {
              style: { display: 'flex', gap: 6, marginTop: 10 },
            },
              React.createElement(Button, {
                variant: 'ghost', size: 'sm',
                className: 'flex-1',
                style: {
                  color: 'var(--knf-hero-ink)',
                  fontWeight: 500,
                  justifyContent: 'center',
                },
                onClick: onAdd,
              },
                React.createElement(Plus, { className: 'h-4 w-4 mr-1.5' }),
                'Log exercise',
              ),
              onOpenTemplates && React.createElement(Button, {
                variant: 'ghost', size: 'sm',
                style: {
                  color: 'var(--knf-muted)',
                  justifyContent: 'center',
                },
                onClick: onOpenTemplates,
              },
                React.createElement(ListPlus, { className: 'h-4 w-4 mr-1.5' }),
                'Templates',
              ),
            ),
          ),
    );
  };
}
