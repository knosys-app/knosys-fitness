import type { SharedDependencies, Exercise, ExerciseEntry, ExerciseSet } from '../types';
import { createScopedShadcn } from '../design-system/scoped-shadcn';
import { createSegmentedControl } from '../design-system/primitives/segmented-control';

type WeightUnit = 'kg' | 'lb';

interface DraftEntry {
  exercise_id?: string;
  name: string;
  primaryMuscles?: string[];
  kind: 'strength' | 'cardio';
  sets: ExerciseSet[];
  duration_min: string;
  distance: string;
  distance_unit: 'km' | 'mi';
  calories_burned: string;
  notes: string;
}

function draftFromEntry(entry: ExerciseEntry): DraftEntry {
  return {
    exercise_id: entry.exercise_id,
    name: entry.name,
    primaryMuscles: entry.primaryMuscles,
    kind: entry.kind,
    sets: entry.sets?.length ? entry.sets.map(s => ({ ...s })) : [{ reps: 8 }],
    duration_min: entry.duration_min != null ? String(entry.duration_min) : '',
    distance: entry.distance != null ? String(entry.distance) : '',
    distance_unit: entry.distance_unit ?? 'km',
    calories_burned: entry.calories_burned != null ? String(entry.calories_burned) : '',
    notes: entry.notes ?? '',
  };
}

function draftFromExercise(exercise: Exercise): DraftEntry {
  const kind: 'strength' | 'cardio' = exercise.category === 'cardio' ? 'cardio' : 'strength';
  return {
    exercise_id: exercise.id,
    name: exercise.name,
    primaryMuscles: exercise.primaryMuscles,
    kind,
    sets: [{ reps: 8 }],
    duration_min: kind === 'cardio' ? '30' : '',
    distance: '',
    distance_unit: 'km',
    calories_burned: '',
    notes: '',
  };
}

function draftFromScratch(name = ''): DraftEntry {
  return {
    name,
    kind: 'cardio',
    sets: [{ reps: 8 }],
    duration_min: '30',
    distance: '',
    distance_unit: 'km',
    calories_burned: '',
    notes: '',
  };
}

function draftToEntryPatch(draft: DraftEntry): Partial<ExerciseEntry> {
  const patch: Partial<ExerciseEntry> = {
    exercise_id: draft.exercise_id,
    name: draft.name.trim(),
    primaryMuscles: draft.primaryMuscles,
    kind: draft.kind,
    notes: draft.notes.trim() || undefined,
  };
  if (draft.kind === 'strength') {
    patch.sets = draft.sets.map(s => ({ ...s }));
    patch.duration_min = undefined;
    patch.distance = undefined;
    patch.distance_unit = undefined;
  } else {
    patch.sets = undefined;
    const dur = parseFloat(draft.duration_min);
    patch.duration_min = isFinite(dur) ? dur : undefined;
    const dist = parseFloat(draft.distance);
    patch.distance = isFinite(dist) && dist > 0 ? dist : undefined;
    patch.distance_unit = patch.distance != null ? draft.distance_unit : undefined;
  }
  const cal = parseFloat(draft.calories_burned);
  patch.calories_burned = isFinite(cal) && cal > 0 ? cal : undefined;
  return patch;
}

const INPUT_STYLE = {
  background: 'var(--knf-surface)',
  border: '1px solid var(--knf-hairline)',
  borderRadius: 'var(--knf-radius-sm)',
  color: 'var(--knf-ink)',
  fontFamily: 'var(--knf-font-mono)',
  fontVariantNumeric: 'tabular-nums' as const,
};

const EYEBROW_STYLE = {
  fontFamily: 'var(--knf-font-mono)',
  fontSize: 10,
  color: 'var(--knf-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  fontWeight: 500,
};

export function createExerciseLogger(Shared: SharedDependencies) {
  const { React, Button, Input, Textarea, lucideIcons } = Shared;
  const { Plus, Trash2, Copy } = lucideIcons;

  const Scoped = createScopedShadcn(Shared);
  const SegmentedControl = createSegmentedControl(Shared);

  function ChipToggle({
    options, value, onChange,
  }: {
    options: readonly string[];
    value: string;
    onChange: (v: string) => void;
  }) {
    return React.createElement('div', { style: { display: 'inline-flex', gap: 4 } },
      ...options.map(o =>
        React.createElement('button', {
          key: o,
          onClick: () => onChange(o),
          style: {
            fontSize: 11,
            fontFamily: 'var(--knf-font-mono)',
            padding: '3px 8px',
            borderRadius: 'var(--knf-radius-sm)',
            border: `1px solid ${value === o ? 'var(--knf-hero-edge)' : 'var(--knf-hairline)'}`,
            background: value === o ? 'var(--knf-hero-wash)' : 'var(--knf-surface)',
            color: value === o ? 'var(--knf-hero-ink)' : 'var(--knf-muted)',
            cursor: value === o ? 'default' : 'pointer',
            fontWeight: value === o ? 600 : 500,
            transition: 'all var(--knf-duration-1) var(--knf-ease)',
          },
        }, o),
      ),
    );
  }

  function SetRow({ index, set, unit, onChange, onRemove }: {
    index: number; set: ExerciseSet; unit: WeightUnit;
    onChange: (patch: Partial<ExerciseSet>) => void;
    onRemove: () => void;
  }) {
    return React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '24px minmax(0,1fr) minmax(0,1fr) 56px 28px',
        gap: 8,
        alignItems: 'center',
      },
    },
      React.createElement('div', {
        style: {
          fontFamily: 'var(--knf-font-mono)',
          fontSize: 11,
          color: 'var(--knf-muted)',
          textAlign: 'center',
          fontWeight: 500,
        },
      }, index + 1),
      React.createElement(Input, {
        type: 'number', min: 0, placeholder: 'reps',
        value: set.reps,
        onChange: (e: any) => onChange({ reps: parseInt(e.target.value) || 0 }),
        className: 'h-8 text-center',
        style: INPUT_STYLE,
      }),
      React.createElement('div', { style: { position: 'relative' } },
        React.createElement(Input, {
          type: 'number', min: 0, step: 0.5, placeholder: 'weight',
          value: set.weight ?? '',
          onChange: (e: any) => {
            const v = parseFloat(e.target.value);
            onChange({ weight: isFinite(v) ? v : undefined, weight_unit: unit });
          },
          className: 'h-8 text-center',
          style: { ...INPUT_STYLE, paddingRight: 28 },
        }),
        React.createElement('span', {
          style: {
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: 'var(--knf-muted)', fontFamily: 'var(--knf-font-mono)',
            pointerEvents: 'none',
          },
        }, unit),
      ),
      React.createElement(Input, {
        type: 'number', min: 1, max: 10, step: 0.5, placeholder: 'RPE',
        value: set.rpe ?? '',
        onChange: (e: any) => {
          const v = parseFloat(e.target.value);
          onChange({ rpe: isFinite(v) ? v : undefined });
        },
        className: 'h-8 text-center',
        style: INPUT_STYLE,
      }),
      React.createElement(Button, {
        variant: 'ghost', size: 'icon', className: 'h-7 w-7',
        onClick: onRemove, 'aria-label': 'Remove set',
      }, React.createElement(Trash2, {
        className: 'h-3.5 w-3.5', style: { color: 'var(--knf-alert)' },
      })),
    );
  }

  return function ExerciseLogger({
    open, onOpenChange, mode, exercise, entry, onSubmit, onPreviousSetsRequest,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'edit';
    exercise?: Exercise;
    entry?: ExerciseEntry;
    onSubmit: (patch: Partial<ExerciseEntry>, entryId?: string) => void | Promise<void>;
    onPreviousSetsRequest?: (exerciseId: string) => Promise<ExerciseSet[] | null>;
  }) {
    const initial = React.useMemo<DraftEntry>(() => {
      if (mode === 'edit' && entry) return draftFromEntry(entry);
      if (exercise) return draftFromExercise(exercise);
      return draftFromScratch();
    }, [mode, entry, exercise, open]);

    const [draft, setDraft] = React.useState<DraftEntry>(initial);
    const [unit, setUnit] = React.useState<WeightUnit>(
      (entry?.sets?.[0]?.weight_unit as WeightUnit) ?? 'lb'
    );

    React.useEffect(() => {
      if (open) {
        setDraft(initial);
        setUnit((initial.sets[0]?.weight_unit as WeightUnit) ?? 'lb');
      }
    }, [open, initial]);

    const updateSet = (i: number, patch: Partial<ExerciseSet>) => {
      setDraft(d => ({
        ...d, sets: d.sets.map((s, idx) => idx === i ? { ...s, ...patch } : s),
      }));
    };

    const addSet = () => {
      setDraft(d => {
        const last = d.sets[d.sets.length - 1];
        return { ...d, sets: [...d.sets, { reps: last?.reps ?? 8, weight: last?.weight, weight_unit: unit }] };
      });
    };

    const removeSet = (i: number) => {
      setDraft(d => ({ ...d, sets: d.sets.filter((_, idx) => idx !== i) }));
    };

    const copyPrevious = async () => {
      if (!draft.exercise_id || !onPreviousSetsRequest) return;
      const prev = await onPreviousSetsRequest(draft.exercise_id);
      if (prev && prev.length) {
        setDraft(d => ({ ...d, sets: prev.map(s => ({ ...s })) }));
        if (prev[0]?.weight_unit) setUnit(prev[0].weight_unit);
      }
    };

    const handleSubmit = async () => {
      if (!draft.name.trim()) return;
      const patch = draftToEntryPatch(draft);
      await onSubmit(patch, entry?.id);
      onOpenChange(false);
    };

    const titleText = mode === 'edit' ? 'Edit exercise' : 'Log exercise';

    return React.createElement(Scoped.Dialog, { open, onOpenChange },
      React.createElement(Scoped.DialogContent, {
        className: 'max-w-md',
        style: { maxHeight: '85vh', overflowY: 'auto' },
      },
        React.createElement(Scoped.DialogHeader, null,
          React.createElement('div', { className: 'knf-eyebrow', style: EYEBROW_STYLE },
            mode === 'edit' ? 'Edit' : 'Log'),
          React.createElement(Scoped.DialogTitle, {
            style: { fontFamily: 'var(--knf-font-display)', letterSpacing: '-0.01em' },
          }, titleText),
        ),

        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          // Exercise name
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            React.createElement('span', { style: EYEBROW_STYLE }, 'Exercise'),
            React.createElement(Input, {
              value: draft.name,
              onChange: (e: any) => setDraft(d => ({ ...d, name: e.target.value })),
              placeholder: 'e.g. Bench Press',
              className: 'h-9',
              style: { ...INPUT_STYLE, fontFamily: 'var(--knf-font-body)' },
              disabled: !!draft.exercise_id,
              autoFocus: !draft.exercise_id,
            }),
            draft.primaryMuscles && draft.primaryMuscles.length > 0 && React.createElement('div', {
              style: { fontSize: 11, color: 'var(--knf-muted)', fontFamily: 'var(--knf-font-mono)' },
            }, draft.primaryMuscles.join(' · ')),
          ),

          // Kind toggle
          React.createElement(SegmentedControl, {
            value: draft.kind,
            onValueChange: (v: string) => setDraft(d => ({ ...d, kind: v as 'strength' | 'cardio' })),
            options: [
              { value: 'strength', label: 'Strength', icon: 'Dumbbell' },
              { value: 'cardio', label: 'Cardio', icon: 'Activity' },
            ],
            size: 'sm',
            ariaLabel: 'Exercise kind',
          }),

          // Strength: sets grid
          draft.kind === 'strength' && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            React.createElement('div', {
              style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
            },
              React.createElement('span', { style: EYEBROW_STYLE }, 'Sets'),
              React.createElement(ChipToggle, {
                options: ['lb', 'kg'],
                value: unit,
                onChange: (v: string) => setUnit(v as WeightUnit),
              }),
            ),
            // Column headers
            React.createElement('div', {
              style: {
                display: 'grid',
                gridTemplateColumns: '24px minmax(0,1fr) minmax(0,1fr) 56px 28px',
                gap: 8,
                fontSize: 10,
                color: 'var(--knf-muted)',
                fontFamily: 'var(--knf-font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              },
            },
              React.createElement('span', { style: { textAlign: 'center' } }, '#'),
              React.createElement('span', { style: { textAlign: 'center' } }, 'Reps'),
              React.createElement('span', { style: { textAlign: 'center' } }, 'Weight'),
              React.createElement('span', { style: { textAlign: 'center' } }, 'RPE'),
              React.createElement('span', null, ''),
            ),
            ...draft.sets.map((set, i) =>
              React.createElement(SetRow, {
                key: i, index: i, set, unit,
                onChange: (patch) => updateSet(i, patch),
                onRemove: () => removeSet(i),
              }),
            ),
            React.createElement('div', { style: { display: 'flex', gap: 6 } },
              React.createElement(Button, {
                variant: 'outline', size: 'sm', onClick: addSet, className: 'flex-1 h-8',
              },
                React.createElement(Plus, { className: 'h-3.5 w-3.5 mr-1' }),
                'Add set',
              ),
              draft.exercise_id && onPreviousSetsRequest && React.createElement(Button, {
                variant: 'ghost', size: 'sm', onClick: copyPrevious, className: 'h-8',
              },
                React.createElement(Copy, { className: 'h-3.5 w-3.5 mr-1' }),
                'Copy previous',
              ),
            ),
          ),

          // Cardio: duration / distance
          draft.kind === 'cardio' && React.createElement('div', {
            style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
          },
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              React.createElement('span', { style: EYEBROW_STYLE }, 'Duration (min)'),
              React.createElement(Input, {
                type: 'number', min: 0, value: draft.duration_min,
                onChange: (e: any) => setDraft(d => ({ ...d, duration_min: e.target.value })),
                className: 'h-9',
                style: INPUT_STYLE,
              }),
            ),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
              },
                React.createElement('span', { style: EYEBROW_STYLE }, 'Distance'),
                React.createElement(ChipToggle, {
                  options: ['km', 'mi'],
                  value: draft.distance_unit,
                  onChange: (v: string) => setDraft(d => ({ ...d, distance_unit: v as 'km' | 'mi' })),
                }),
              ),
              React.createElement(Input, {
                type: 'number', min: 0, step: 0.1, value: draft.distance,
                onChange: (e: any) => setDraft(d => ({ ...d, distance: e.target.value })),
                className: 'h-9',
                style: INPUT_STYLE,
              }),
            ),
          ),

          // Calories (both kinds)
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            React.createElement('span', { style: EYEBROW_STYLE }, 'Calories burned (optional)'),
            React.createElement(Input, {
              type: 'number', min: 0, value: draft.calories_burned,
              placeholder: '0',
              onChange: (e: any) => setDraft(d => ({ ...d, calories_burned: e.target.value })),
              className: 'h-9',
              style: INPUT_STYLE,
            }),
          ),

          // Notes
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            React.createElement('span', { style: EYEBROW_STYLE }, 'Notes (optional)'),
            React.createElement(Textarea, {
              value: draft.notes,
              onChange: (e: any) => setDraft(d => ({ ...d, notes: e.target.value })),
              rows: 2,
              className: 'text-sm resize-none',
              style: { ...INPUT_STYLE, fontFamily: 'var(--knf-font-body)' },
              placeholder: 'How did it feel? PRs?',
            }),
          ),
        ),

        React.createElement(Scoped.DialogFooter, { className: 'gap-2', style: { marginTop: 10 } },
          React.createElement(Button, {
            variant: 'outline',
            onClick: () => onOpenChange(false),
          }, 'Cancel'),
          React.createElement(Button, {
            onClick: handleSubmit,
            disabled: !draft.name.trim(),
            style: {
              background: 'var(--knf-hero)',
              color: 'var(--knf-hero-ink)',
              border: '1px solid var(--knf-hero-edge)',
            },
          }, mode === 'edit' ? 'Save' : 'Log exercise'),
        ),
      ),
    );
  };
}
