import type { SharedDependencies, Exercise } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { uuid } from '../utils/date-helpers';

const COMMON_MUSCLES = [
  'chest', 'lats', 'traps', 'shoulders', 'biceps', 'triceps', 'forearms',
  'abs', 'obliques', 'quadriceps', 'hamstrings', 'glutes', 'calves',
  'lower back', 'middle back', 'neck',
];

export function createCustomExerciseForm(Shared: SharedDependencies) {
  const {
    React, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    Button, Input, Label, Textarea, Tabs, TabsList, TabsTrigger, lucideIcons, cn,
  } = Shared;
  const { X } = lucideIcons;

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

    return React.createElement(Dialog, { open, onOpenChange },
      React.createElement(DialogContent, { className: 'max-w-md', style: { maxHeight: '85vh', overflowY: 'auto' } },
        React.createElement(DialogHeader, null,
          React.createElement(DialogTitle, null, 'New Custom Exercise'),
        ),

        React.createElement('div', { className: 'space-y-3' },
          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Name'),
            React.createElement(Input, {
              value: name,
              onChange: (e: any) => setName(e.target.value),
              placeholder: 'e.g. Pistol Squat',
              className: 'h-8',
              autoFocus: true,
            }),
          ),

          React.createElement(Tabs, {
            value: kind,
            onValueChange: (v: string) => setKind(v as 'strength' | 'cardio'),
          },
            React.createElement(TabsList, { className: 'w-full' },
              React.createElement(TabsTrigger, { value: 'strength', className: 'flex-1 text-xs' }, 'Strength'),
              React.createElement(TabsTrigger, { value: 'cardio', className: 'flex-1 text-xs' }, 'Cardio'),
            ),
          ),

          React.createElement('div', { className: 'space-y-1.5' },
            React.createElement(Label, { className: 'text-xs' }, 'Primary muscles'),
            React.createElement('div', { className: 'flex flex-wrap gap-1' },
              ...COMMON_MUSCLES.map(m =>
                React.createElement('button', {
                  key: m,
                  onClick: () => toggleMuscle(m),
                  className: cn(
                    'text-[11px] px-2 py-1 rounded-full border transition-colors',
                    muscles.includes(m)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border',
                  ),
                }, m),
              ),
            ),
          ),

          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Equipment (optional)'),
            React.createElement(Input, {
              value: equipment,
              onChange: (e: any) => setEquipment(e.target.value),
              placeholder: 'e.g. dumbbell, bodyweight, barbell',
              className: 'h-8',
            }),
          ),

          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Instructions (optional)'),
            React.createElement(Textarea, {
              value: notes,
              onChange: (e: any) => setNotes(e.target.value),
              rows: 3,
              className: 'text-sm resize-none',
              placeholder: 'Setup, cue, form notes…',
            }),
          ),
        ),

        React.createElement(DialogFooter, { className: 'gap-2' },
          React.createElement(Button, { variant: 'outline', onClick: () => onOpenChange(false) }, 'Cancel'),
          React.createElement(Button, {
            onClick: handleSave, disabled: !name.trim() || saving,
          }, saving ? 'Saving…' : 'Create'),
        ),
      ),
    );
  };
}
