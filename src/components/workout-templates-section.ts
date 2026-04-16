import type { SharedDependencies, ExerciseEntry, WorkoutTemplate } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { uuid } from '../utils/date-helpers';
import {
  createSignatureCard,
  createSemanticBadge,
} from '../design-system/primitives';

function mode<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T = arr[0]; let bestCount = 0;
  for (const [v, c] of counts) if (c > bestCount) { best = v; bestCount = c; }
  return best;
}

export function templateFromEntries(name: string, entries: ExerciseEntry[]): WorkoutTemplate {
  const now = new Date().toISOString();
  const exercises = entries.map((e, idx) => {
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
    exercises,
    created_at: now,
    updated_at: now,
  };
}

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

export function createWorkoutTemplatesSection(Shared: SharedDependencies) {
  const { React, Button, Input, lucideIcons } = Shared;
  const { Play, Trash2, Save, Dumbbell } = lucideIcons;

  const SignatureCard = createSignatureCard(Shared);
  const SemanticBadge = createSemanticBadge(Shared);

  return function WorkoutTemplatesSection({
    todayEntries, saveTick, onApply,
  }: {
    todayEntries: ExerciseEntry[];
    /** Bump to trigger the inline save form (from header action). */
    saveTick: number;
    onApply: (template: WorkoutTemplate) => void | Promise<void>;
  }) {
    const [templates, setTemplates] = React.useState<WorkoutTemplate[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [newName, setNewName] = React.useState('');
    const [savePanelOpen, setSavePanelOpen] = React.useState(false);

    const refresh = React.useCallback(async () => {
      setLoading(true);
      const list = await getStorage().getAllWorkoutTemplates();
      setTemplates(list);
      setLoading(false);
    }, []);

    React.useEffect(() => { refresh(); }, [refresh]);

    // Opening the inline save panel responds to a parent-driven tick signal.
    React.useEffect(() => {
      if (saveTick > 0) setSavePanelOpen(true);
    }, [saveTick]);

    const handleSave = async () => {
      const n = newName.trim();
      if (!n) return;
      if (todayEntries.length === 0) return;
      const template = templateFromEntries(n, todayEntries);
      await getStorage().setWorkoutTemplate(template);
      setNewName('');
      setSavePanelOpen(false);
      await refresh();
    };

    const handleDelete = async (id: string) => {
      await getStorage().deleteWorkoutTemplate(id);
      await refresh();
    };

    const handleApply = async (t: WorkoutTemplate) => {
      await onApply(t);
    };

    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      // Inline "save today as template" panel
      savePanelOpen && React.createElement(SignatureCard, { padding: 'md' },
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            React.createElement(Save, { className: 'h-4 w-4', style: { color: 'var(--knf-muted)' } }),
            React.createElement('span', { style: EYEBROW }, 'Save today as template'),
          ),
          React.createElement('div', { style: { display: 'flex', gap: 6 } },
            React.createElement(Input, {
              value: newName,
              onChange: (e: any) => setNewName(e.target.value),
              placeholder: todayEntries.length
                ? `e.g. Push Day A (${todayEntries.length} exercises)`
                : 'Log exercises first…',
              className: 'h-9 flex-1',
              style: INPUT_STYLE,
              disabled: todayEntries.length === 0,
              autoFocus: true,
            }),
            React.createElement(Button, {
              size: 'sm',
              onClick: handleSave,
              disabled: !newName.trim() || todayEntries.length === 0,
              style: {
                background: 'var(--knf-hero)',
                color: 'var(--knf-hero-ink)',
                border: '1px solid var(--knf-hero-edge)',
              },
            }, 'Save'),
            React.createElement(Button, {
              variant: 'ghost', size: 'sm',
              onClick: () => { setSavePanelOpen(false); setNewName(''); },
            }, 'Cancel'),
          ),
        ),
      ),

      loading
        ? React.createElement('div', {
            style: { ...EYEBROW, textAlign: 'center', padding: '32px 0' },
          }, 'Loading templates…')
        : templates.length === 0
        ? React.createElement(SignatureCard, { padding: 'lg' },
            React.createElement('div', {
              style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 10, padding: '24px 0',
              },
            },
              React.createElement(Dumbbell, {
                className: 'h-8 w-8',
                style: { color: 'var(--knf-muted)', opacity: 0.5 },
              }),
              React.createElement('div', {
                style: {
                  fontSize: 13,
                  color: 'var(--knf-ink)',
                  fontWeight: 500,
                },
              }, 'No templates yet'),
              React.createElement('div', {
                style: {
                  ...EYEBROW,
                  textTransform: 'none' as const,
                  letterSpacing: 0,
                  fontFamily: 'var(--knf-font-body)',
                  fontSize: 12,
                  textAlign: 'center',
                },
              }, 'Log a workout today, then tap "New" above to save it as a reusable template.'),
            ),
          )
        : React.createElement('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 10,
            },
          },
            ...templates.map(t =>
              React.createElement(SignatureCard, { key: t.id, padding: 'md' },
                React.createElement('div', {
                  style: { display: 'flex', flexDirection: 'column', gap: 8 },
                },
                  React.createElement('div', {
                    style: {
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: 6,
                    },
                  },
                    React.createElement('div', {
                      style: {
                        fontFamily: 'var(--knf-font-display)',
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--knf-ink)',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.25,
                      },
                    }, t.name),
                    React.createElement(SemanticBadge, { accent: 'cal-burn', variant: 'soft' },
                      `${t.exercises.length}`),
                  ),
                  React.createElement('div', {
                    style: {
                      fontSize: 11,
                      color: 'var(--knf-muted)',
                      fontFamily: 'var(--knf-font-mono)',
                      lineHeight: 1.4,
                    },
                  },
                    t.exercises.slice(0, 3).map(e => e.name).join(' · ')
                    + (t.exercises.length > 3 ? ' …' : ''),
                  ),
                  React.createElement('div', { style: { display: 'flex', gap: 6, marginTop: 4 } },
                    React.createElement(Button, {
                      variant: 'outline', size: 'sm',
                      className: 'flex-1 h-8',
                      onClick: () => handleApply(t),
                    },
                      React.createElement(Play, { className: 'h-3.5 w-3.5 mr-1' }),
                      'Apply to today',
                    ),
                    React.createElement(Button, {
                      variant: 'ghost', size: 'icon', className: 'h-8 w-8',
                      onClick: () => handleDelete(t.id),
                      'aria-label': 'Delete template',
                    }, React.createElement(Trash2, {
                      className: 'h-3.5 w-3.5',
                      style: { color: 'var(--knf-alert)' },
                    })),
                  ),
                ),
              ),
            ),
          ),
    );
  };
}
