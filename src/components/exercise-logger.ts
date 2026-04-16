import type { SharedDependencies, Exercise, ExerciseEntry, ExerciseSet } from '../types';

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

export function createExerciseLogger(Shared: SharedDependencies) {
  const {
    React, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    Button, Input, Label, Tabs, TabsList, TabsTrigger, Textarea, Separator, lucideIcons, cn,
  } = Shared;
  const { Plus, Trash2, Copy } = lucideIcons;

  function SetRow({ index, set, unit, onChange, onRemove }: {
    index: number; set: ExerciseSet; unit: WeightUnit;
    onChange: (patch: Partial<ExerciseSet>) => void;
    onRemove: () => void;
  }) {
    return React.createElement('div', { className: 'flex items-center gap-2' },
      React.createElement('div', {
        className: 'w-6 text-xs font-semibold text-muted-foreground tabular-nums text-center',
      }, index + 1),
      React.createElement(Input, {
        type: 'number', min: 0, placeholder: 'reps',
        value: set.reps,
        onChange: (e: any) => onChange({ reps: parseInt(e.target.value) || 0 }),
        className: 'h-8 text-center tabular-nums',
      }),
      React.createElement('div', { className: 'relative flex-1' },
        React.createElement(Input, {
          type: 'number', min: 0, step: 0.5, placeholder: 'weight',
          value: set.weight ?? '',
          onChange: (e: any) => {
            const v = parseFloat(e.target.value);
            onChange({ weight: isFinite(v) ? v : undefined, weight_unit: unit });
          },
          className: 'h-8 text-center tabular-nums pr-9',
        }),
        React.createElement('span', {
          className: 'absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground',
        }, unit),
      ),
      React.createElement(Input, {
        type: 'number', min: 1, max: 10, step: 0.5, placeholder: 'RPE',
        value: set.rpe ?? '',
        onChange: (e: any) => {
          const v = parseFloat(e.target.value);
          onChange({ rpe: isFinite(v) ? v : undefined });
        },
        className: 'h-8 w-14 text-center tabular-nums',
      }),
      React.createElement(Button, {
        variant: 'ghost', size: 'icon', className: 'h-7 w-7',
        onClick: onRemove, 'aria-label': 'Remove set',
      }, React.createElement(Trash2, { className: 'h-3.5 w-3.5 text-destructive' })),
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
    /** Optional: called when "Copy previous" is clicked; should return last-session sets. */
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

    // Reset when dialog re-opens with new input.
    React.useEffect(() => {
      if (open) {
        setDraft(initial);
        setUnit((initial.sets[0]?.weight_unit as WeightUnit) ?? 'lb');
      }
    }, [open, initial]);

    const updateSet = (i: number, patch: Partial<ExerciseSet>) => {
      setDraft(d => ({
        ...d,
        sets: d.sets.map((s, idx) => idx === i ? { ...s, ...patch } : s),
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

    const titleText = mode === 'edit' ? 'Edit Exercise' : 'Log Exercise';

    return React.createElement(Dialog, { open, onOpenChange },
      React.createElement(DialogContent, { className: 'max-w-md', style: { maxHeight: '85vh', overflowY: 'auto' } },
        React.createElement(DialogHeader, null,
          React.createElement(DialogTitle, null, titleText),
        ),

        React.createElement('div', { className: 'space-y-3' },
          // Name (read-only when catalog-backed)
          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Exercise'),
            React.createElement(Input, {
              value: draft.name,
              onChange: (e: any) => setDraft(d => ({ ...d, name: e.target.value })),
              placeholder: 'e.g. Bench Press',
              className: 'h-8',
              disabled: !!draft.exercise_id,
              autoFocus: !draft.exercise_id,
            }),
            draft.primaryMuscles && draft.primaryMuscles.length > 0 && React.createElement('div', {
              className: 'text-[11px] text-muted-foreground',
            }, draft.primaryMuscles.join(', ')),
          ),

          // Kind toggle
          React.createElement(Tabs, {
            value: draft.kind,
            onValueChange: (v: string) => setDraft(d => ({ ...d, kind: v as 'strength' | 'cardio' })),
          },
            React.createElement(TabsList, { className: 'w-full' },
              React.createElement(TabsTrigger, { value: 'strength', className: 'flex-1 text-xs' }, 'Strength'),
              React.createElement(TabsTrigger, { value: 'cardio', className: 'flex-1 text-xs' }, 'Cardio'),
            ),
          ),

          // Strength: sets grid
          draft.kind === 'strength' && React.createElement('div', { className: 'space-y-2' },
            React.createElement('div', { className: 'flex items-center justify-between' },
              React.createElement(Label, { className: 'text-xs' }, 'Sets'),
              React.createElement('div', { className: 'flex items-center gap-1' },
                ...(['lb', 'kg'] as WeightUnit[]).map(u =>
                  React.createElement('button', {
                    key: u,
                    onClick: () => setUnit(u),
                    className: cn(
                      'text-[10px] px-2 py-0.5 rounded border transition-colors',
                      unit === u ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted',
                    ),
                  }, u),
                ),
              ),
            ),
            React.createElement('div', { className: 'grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 text-[10px] text-muted-foreground px-1' },
              React.createElement('span', { className: 'w-6 text-center' }, '#'),
              React.createElement('span', { className: 'text-center' }, 'Reps'),
              React.createElement('span', { className: 'text-center' }, 'Weight'),
              React.createElement('span', { className: 'w-14 text-center' }, 'RPE'),
              React.createElement('span', { className: 'w-7' }, ''),
            ),
            ...draft.sets.map((set, i) =>
              React.createElement(SetRow, {
                key: i, index: i, set, unit,
                onChange: (patch) => updateSet(i, patch),
                onRemove: () => removeSet(i),
              }),
            ),
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement(Button, {
                variant: 'outline', size: 'sm', onClick: addSet, className: 'flex-1',
              },
                React.createElement(Plus, { className: 'h-3.5 w-3.5 mr-1' }),
                'Add Set',
              ),
              draft.exercise_id && onPreviousSetsRequest && React.createElement(Button, {
                variant: 'ghost', size: 'sm', onClick: copyPrevious,
              },
                React.createElement(Copy, { className: 'h-3.5 w-3.5 mr-1' }),
                'Copy previous',
              ),
            ),
          ),

          // Cardio: duration/distance/calories
          draft.kind === 'cardio' && React.createElement('div', { className: 'space-y-2' },
            React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
              React.createElement('div', { className: 'space-y-1' },
                React.createElement(Label, { className: 'text-xs' }, 'Duration (min)'),
                React.createElement(Input, {
                  type: 'number', min: 0, value: draft.duration_min,
                  onChange: (e: any) => setDraft(d => ({ ...d, duration_min: e.target.value })),
                  className: 'h-8 tabular-nums',
                }),
              ),
              React.createElement('div', { className: 'space-y-1' },
                React.createElement(Label, { className: 'text-xs' }, 'Distance'),
                React.createElement('div', { className: 'flex items-center gap-1' },
                  React.createElement(Input, {
                    type: 'number', min: 0, step: 0.1, value: draft.distance,
                    onChange: (e: any) => setDraft(d => ({ ...d, distance: e.target.value })),
                    className: 'h-8 tabular-nums',
                  }),
                  React.createElement('div', { className: 'flex items-center gap-0.5' },
                    ...(['km', 'mi'] as const).map(u =>
                      React.createElement('button', {
                        key: u,
                        onClick: () => setDraft(d => ({ ...d, distance_unit: u })),
                        className: cn(
                          'text-[10px] px-1.5 py-0.5 rounded border transition-colors',
                          draft.distance_unit === u ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted',
                        ),
                      }, u),
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Calories (both kinds)
          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Calories burned (optional)'),
            React.createElement(Input, {
              type: 'number', min: 0, value: draft.calories_burned,
              onChange: (e: any) => setDraft(d => ({ ...d, calories_burned: e.target.value })),
              className: 'h-8 tabular-nums',
              placeholder: '0',
            }),
          ),

          // Notes
          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Notes (optional)'),
            React.createElement(Textarea, {
              value: draft.notes,
              onChange: (e: any) => setDraft(d => ({ ...d, notes: e.target.value })),
              rows: 2,
              className: 'text-sm resize-none',
              placeholder: 'How did it feel? PRs?',
            }),
          ),
        ),

        React.createElement(DialogFooter, { className: 'gap-2' },
          React.createElement(Button, { variant: 'outline', onClick: () => onOpenChange(false) }, 'Cancel'),
          React.createElement(Button, { onClick: handleSubmit, disabled: !draft.name.trim() }, mode === 'edit' ? 'Save' : 'Log Exercise'),
        ),
      ),
    );
  };
}
