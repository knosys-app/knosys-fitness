import type { SharedDependencies, Exercise } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { uuid } from '../utils/date-helpers';
import { createScopedShadcn } from '../design-system/scoped-shadcn';
import { createSegmentedControl } from '../design-system/primitives';

const COMMON_MUSCLES = [
  'chest', 'lats', 'traps', 'shoulders', 'biceps', 'triceps', 'forearms',
  'abs', 'obliques', 'quadriceps', 'hamstrings', 'glutes', 'calves',
  'lower back', 'middle back', 'neck',
];

const EYEBROW = {
  fontFamily: 'var(--knf-font-mono)',
  fontSize: 10,
  color: 'var(--knf-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.14em',
  fontWeight: 500,
};

const INPUT_STYLE = {
  background: 'var(--knf-surface)',
  border: '1px solid var(--knf-hairline)',
  borderRadius: 'var(--knf-radius-sm)',
  color: 'var(--knf-ink)',
  fontFamily: 'var(--knf-font-body)',
};

export function createCustomExerciseForm(Shared: SharedDependencies) {
  const { React, Button, Input, Textarea } = Shared;

  const Scoped = createScopedShadcn(Shared);
  const SegmentedControl = createSegmentedControl(Shared);

  return function CustomExerciseForm({ open, onOpenChange, initialName, onCreated }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialName?: string;
    onCreated: (exercise: Exercise) => void;
  }) {
    const [name, setName] = React.useState(initialName ?? '');
    const [kind, setKind] = React.useState<'strength' | 'cardio'>('strength');
    const [muscles, setMuscles] = React.useState<string[]>([]);
    const [equipment, setEquipment] = React.useState('');
    const [notes, setNotes] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
      if (open) {
        setName(initialName ?? '');
        setKind('strength');
        setMuscles([]);
        setEquipment('');
        setNotes('');
      }
    }, [open, initialName]);

    const toggleMuscle = (m: string) => {
      setMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    };

    const handleSave = async () => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setSaving(true);
      try {
        const exercise: Exercise = {
          id: `custom:${uuid()}`,
          source: 'custom',
          name: trimmed,
          primaryMuscles: muscles,
          secondaryMuscles: [],
          equipment: equipment.trim() || undefined,
          category: kind,
          instructions: notes.trim() ? notes.split('\n').map(s => s.trim()).filter(Boolean) : [],
          images: [],
        };
        await getStorage().addCustomExercise(exercise);
        onCreated(exercise);
        onOpenChange(false);
      } finally {
        setSaving(false);
      }
    };

    return React.createElement(Scoped.Dialog, { open, onOpenChange },
      React.createElement(Scoped.DialogContent, {
        className: 'max-w-md',
        style: { maxHeight: '85vh', overflowY: 'auto' },
      },
        React.createElement(Scoped.DialogHeader, null,
          React.createElement('div', { className: 'knf-eyebrow', style: EYEBROW }, 'Custom'),
          React.createElement(Scoped.DialogTitle, {
            style: { fontFamily: 'var(--knf-font-display)', letterSpacing: '-0.01em' },
          }, 'New exercise'),
        ),

        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            React.createElement('span', { style: EYEBROW }, 'Name'),
            React.createElement(Input, {
              value: name,
              onChange: (e: any) => setName(e.target.value),
              placeholder: 'e.g. Pistol Squat',
              className: 'h-9',
              style: INPUT_STYLE,
              autoFocus: true,
            }),
          ),

          React.createElement(SegmentedControl, {
            value: kind,
            onValueChange: (v: string) => setKind(v as 'strength' | 'cardio'),
            options: [
              { value: 'strength', label: 'Strength', icon: 'Dumbbell' },
              { value: 'cardio', label: 'Cardio', icon: 'Activity' },
            ],
            size: 'sm',
            ariaLabel: 'Exercise kind',
          }),

          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            React.createElement('span', { style: EYEBROW }, 'Primary muscles'),
            React.createElement('div', {
              style: { display: 'flex', flexWrap: 'wrap', gap: 4 },
            },
              ...COMMON_MUSCLES.map(m => {
                const active = muscles.includes(m);
                return React.createElement('button', {
                  key: m,
                  onClick: () => toggleMuscle(m),
                  style: {
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 'var(--knf-radius-pill)',
                    border: `1px solid ${active ? 'var(--knf-hero-edge)' : 'var(--knf-hairline)'}`,
                    background: active ? 'var(--knf-hero-wash)' : 'var(--knf-surface)',
                    color: active ? 'var(--knf-hero-ink)' : 'var(--knf-muted)',
                    cursor: 'pointer',
                    fontWeight: active ? 600 : 500,
                    fontFamily: 'var(--knf-font-body)',
                    transition: 'all var(--knf-duration-1) var(--knf-ease)',
                  },
                }, m);
              }),
            ),
          ),

          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            React.createElement('span', { style: EYEBROW }, 'Equipment (optional)'),
            React.createElement(Input, {
              value: equipment,
              onChange: (e: any) => setEquipment(e.target.value),
              placeholder: 'e.g. dumbbell, bodyweight, barbell',
              className: 'h-9',
              style: INPUT_STYLE,
            }),
          ),

          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            React.createElement('span', { style: EYEBROW }, 'Instructions (optional)'),
            React.createElement(Textarea, {
              value: notes,
              onChange: (e: any) => setNotes(e.target.value),
              rows: 3,
              className: 'text-sm resize-none',
              style: INPUT_STYLE,
              placeholder: 'Setup, cue, form notes…',
            }),
          ),
        ),

        React.createElement(Scoped.DialogFooter, { className: 'gap-2', style: { marginTop: 10 } },
          React.createElement(Button, {
            variant: 'outline',
            onClick: () => onOpenChange(false),
          }, 'Cancel'),
          React.createElement(Button, {
            onClick: handleSave,
            disabled: !name.trim() || saving,
            style: {
              background: 'var(--knf-hero)',
              color: 'var(--knf-hero-ink)',
              border: '1px solid var(--knf-hero-edge)',
            },
          }, saving ? 'Saving…' : 'Create'),
        ),
      ),
    );
  };
}
