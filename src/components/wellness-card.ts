import type { SharedDependencies, WellnessEntry, WellnessGoals } from '../types';
import { createUseWellness, createUseWellnessRange } from '../hooks/use-fitness-store';
import {
  createSignatureCard,
  createDataBar,
  createSparkline,
  createSemanticBadge,
  createNumericReadout,
} from '../design-system/primitives';
import { SIG_PALETTE, type SemanticColor } from '../theme/palette';
import { toDateKey } from '../utils/date-helpers';

/**
 * WellnessCard — three editable tiles for sleep / steps / resting HR with
 * progress to goal, 7-day sparkline, and a day-notes textarea.
 *
 * Props: { dateKey: string }
 */
export function createWellnessCard(Shared: SharedDependencies) {
  const { React, Button, Input, Textarea, dateFns, lucideIcons, cn } = Shared;
  const { Moon, Footprints, Activity, Check, X: XIcon, StickyNote } = lucideIcons;

  const SignatureCard = createSignatureCard(Shared);
  const DataBar = createDataBar(Shared);
  const Sparkline = createSparkline(Shared);
  const SemanticBadge = createSemanticBadge(Shared);
  const NumericReadout = createNumericReadout(Shared);

  const useWellness = createUseWellness(Shared);
  const useWellnessRange = createUseWellnessRange(Shared);

  /**
   * Generic wellness tile — owns its own editing state. Parent passes the
   * current value + save callback + metadata (label, accent, goal, unit).
   */
  function WellnessTile(props: {
    icon: any;
    label: string;
    accent: SemanticColor;
    value: number | undefined;
    goal?: number;
    goalLabel?: string;
    unit: string;
    sparkData: number[];
    delay?: number;
    renderValue: (v: number | undefined) => any;
    renderEditor: (
      initial: number | undefined,
      onSave: (v: number | undefined) => void,
      onCancel: () => void,
    ) => any;
    onSave: (v: number | undefined) => Promise<void>;
    subText?: string;
  }) {
    const {
      icon: Icon,
      label,
      accent,
      value,
      goal,
      unit,
      sparkData,
      delay,
      renderValue,
      renderEditor,
      onSave,
      subText,
    } = props;
    const [editing, setEditing] = React.useState(false);

    const handleSave = async (v: number | undefined) => {
      await onSave(v);
      setEditing(false);
    };

    return React.createElement(SignatureCard, { accent, padding: 'md', delay },
      React.createElement('div', {
        style: { display: 'flex', flexDirection: 'column', gap: 12, minHeight: 180 },
      },
        // Header: icon + label
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('div', {
            style: {
              width: 28, height: 28,
              borderRadius: 8,
              background: `rgba(${hexToRgbCsv(SIG_PALETTE[accentKeyToPaletteKey(accent)])}, 0.12)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            },
          },
            React.createElement(Icon, {
              style: { width: 15, height: 15, color: semanticHex(accent) },
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
          }, label),
        ),

        // Big value (click to edit) or editor
        editing
          ? renderEditor(
              value,
              handleSave,
              () => setEditing(false),
            )
          : React.createElement('button', {
              type: 'button',
              onClick: () => setEditing(true),
              style: {
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                width: '100%',
              },
              'aria-label': `Edit ${label.toLowerCase()}`,
            },
              React.createElement('div', {
                style: {
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 6,
                  fontFamily: 'var(--knf-font-display)',
                  fontWeight: 700,
                  fontSize: 34,
                  color: value != null ? 'var(--knf-ink)' : 'var(--knf-muted)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                },
              },
                renderValue(value),
                unit && value != null
                  ? React.createElement('span', {
                      style: {
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--knf-muted)',
                        fontFamily: 'var(--knf-font-mono)',
                      },
                    }, unit)
                  : null,
              ),
              subText
                ? React.createElement('span', {
                    style: {
                      fontSize: 11,
                      color: 'var(--knf-muted)',
                      fontFamily: 'var(--knf-font-mono)',
                    },
                  }, subText)
                : null,
            ),

        // DataBar: progress to goal
        goal != null && goal > 0
          ? React.createElement(DataBar, {
              value: value ?? 0,
              max: goal,
              accent,
              height: 6,
            })
          : React.createElement('div', { style: { height: 6 } }),

        // Sparkline along the bottom
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 'auto',
          },
        },
          React.createElement('span', {
            style: {
              fontSize: 10,
              color: 'var(--knf-muted)',
              fontFamily: 'var(--knf-font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            },
          }, '7 DAYS'),
          React.createElement(Sparkline, {
            values: sparkData,
            width: 96,
            height: 22,
            color: accent,
            fill: true,
            showLastDot: true,
            strokeWidth: 1.5,
          }),
        ),
      ),
    );
  }

  // ---- Sleep editor: hours + minutes combo ----
  function SleepEditor(props: {
    initial: number | undefined;
    onSave: (minutes: number | undefined) => void;
    onCancel: () => void;
  }) {
    const mins = props.initial ?? 0;
    const [h, setH] = React.useState(String(Math.floor(mins / 60)));
    const [m, setM] = React.useState(String(mins % 60));

    const save = () => {
      const total = (parseInt(h) || 0) * 60 + (parseInt(m) || 0);
      props.onSave(total > 0 ? total : undefined);
    };

    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
        React.createElement(Input, {
          type: 'number', min: 0, max: 24, value: h,
          onChange: (e: any) => setH(e.target.value),
          className: 'h-9 w-14 text-center tabular-nums',
          style: { fontFamily: 'var(--knf-font-mono)' },
          autoFocus: true,
        }),
        React.createElement('span', {
          style: { fontSize: 12, color: 'var(--knf-muted)', fontFamily: 'var(--knf-font-mono)' },
        }, 'h'),
        React.createElement(Input, {
          type: 'number', min: 0, max: 59, value: m,
          onChange: (e: any) => setM(e.target.value),
          className: 'h-9 w-14 text-center tabular-nums',
          style: { fontFamily: 'var(--knf-font-mono)' },
        }),
        React.createElement('span', {
          style: { fontSize: 12, color: 'var(--knf-muted)', fontFamily: 'var(--knf-font-mono)' },
        }, 'm'),
      ),
      React.createElement('div', { style: { display: 'flex', gap: 6 } },
        React.createElement(Button, {
          variant: 'ghost', size: 'sm', className: 'h-7 flex-1',
          onClick: props.onCancel,
        }, React.createElement(XIcon, { className: 'h-3 w-3' })),
        React.createElement(Button, {
          size: 'sm', className: 'h-7 flex-1',
          onClick: save,
        }, React.createElement(Check, { className: 'h-3 w-3' })),
      ),
    );
  }

  // ---- Integer editor: steps / HR ----
  function IntEditor(props: {
    initial: number | undefined;
    onSave: (v: number | undefined) => void;
    onCancel: () => void;
    placeholder?: string;
    unit?: string;
  }) {
    const [val, setVal] = React.useState(props.initial != null ? String(props.initial) : '');
    const save = () => {
      const n = parseInt(val);
      props.onSave(!isNaN(n) && n > 0 ? n : undefined);
    };
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
        React.createElement(Input, {
          type: 'number', min: 0, value: val,
          onChange: (e: any) => setVal(e.target.value),
          placeholder: props.placeholder,
          className: 'h-9 flex-1 tabular-nums',
          style: { fontFamily: 'var(--knf-font-mono)' },
          autoFocus: true,
        }),
        props.unit
          ? React.createElement('span', {
              style: { fontSize: 12, color: 'var(--knf-muted)', fontFamily: 'var(--knf-font-mono)' },
            }, props.unit)
          : null,
      ),
      React.createElement('div', { style: { display: 'flex', gap: 6 } },
        React.createElement(Button, {
          variant: 'ghost', size: 'sm', className: 'h-7 flex-1',
          onClick: props.onCancel,
        }, React.createElement(XIcon, { className: 'h-3 w-3' })),
        React.createElement(Button, {
          size: 'sm', className: 'h-7 flex-1',
          onClick: save,
        }, React.createElement(Check, { className: 'h-3 w-3' })),
      ),
    );
  }

  return function WellnessCard({ dateKey }: { dateKey: string }) {
    const wellness = useWellness(dateKey);

    // 7-day range ending at the selected day for sparklines
    const endDateObj = React.useMemo(() => {
      const [y, mo, d] = dateKey.split('-').map(Number);
      return new Date(y, mo - 1, d);
    }, [dateKey]);
    const startKey = React.useMemo(() =>
      toDateKey(dateFns.subDays(endDateObj, 6)),
      [endDateObj, dateFns],
    );

    const range = useWellnessRange(startKey, dateKey);

    // Build per-metric spark arrays, filled with zeros for days without entries.
    const spark = React.useMemo(() => {
      const days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        days.push(toDateKey(dateFns.subDays(endDateObj, i)));
      }
      const byDate = new Map(range.entries.map(e => [e.date, e] as const));
      const sleep: number[] = [];
      const steps: number[] = [];
      const hr: number[] = [];
      for (const d of days) {
        const e = byDate.get(d);
        sleep.push(e?.sleep_minutes ?? 0);
        steps.push(e?.steps ?? 0);
        hr.push(e?.resting_hr_bpm ?? 0);
      }
      return { sleep, steps, hr };
    }, [range.entries, endDateObj, dateFns]);

    const [notesOpen, setNotesOpen] = React.useState(
      wellness.entry.notes ? true : false,
    );
    const [notesValue, setNotesValue] = React.useState(wellness.entry.notes ?? '');
    const notesDirtyRef = React.useRef(false);

    React.useEffect(() => {
      setNotesValue(wellness.entry.notes ?? '');
      setNotesOpen(wellness.entry.notes ? true : false);
      notesDirtyRef.current = false;
    }, [wellness.entry.notes, dateKey]);

    const flushNotes = React.useCallback(async () => {
      if (!notesDirtyRef.current) return;
      notesDirtyRef.current = false;
      await wellness.saveWellness({ notes: notesValue || undefined });
    }, [notesValue, wellness]);

    const sleepHr = wellness.entry.sleep_minutes != null
      ? Math.floor(wellness.entry.sleep_minutes / 60)
      : null;
    const sleepMin = wellness.entry.sleep_minutes != null
      ? wellness.entry.sleep_minutes % 60
      : null;

    // For HR, we don't have a "goal" but we do compare to 7-day avg as hint.
    const hrNonZero = spark.hr.filter(v => v > 0);
    const avgHr = hrNonZero.length
      ? Math.round(hrNonZero.reduce((a, b) => a + b, 0) / hrNonZero.length)
      : null;

    return React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 16 },
    },
      // 3 tiles side by side
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        },
      },
        // ---- Sleep ----
        React.createElement(WellnessTile, {
          icon: Moon,
          label: 'Sleep',
          accent: 'sleep',
          value: wellness.entry.sleep_minutes,
          goal: wellness.goals.sleep_minutes,
          unit: '',
          sparkData: spark.sleep,
          delay: 0,
          renderValue: (v) => v != null
            ? React.createElement(React.Fragment, null,
                React.createElement(NumericReadout, {
                  value: sleepHr ?? 0,
                  style: { fontFamily: 'var(--knf-font-display)' },
                }),
                React.createElement('span', {
                  style: { fontSize: 14, color: 'var(--knf-muted)', marginLeft: 2, marginRight: 2, fontFamily: 'var(--knf-font-mono)' },
                }, 'h'),
                React.createElement(NumericReadout, {
                  value: sleepMin ?? 0,
                  style: { fontFamily: 'var(--knf-font-display)' },
                }),
                React.createElement('span', {
                  style: { fontSize: 14, color: 'var(--knf-muted)', marginLeft: 2, fontFamily: 'var(--knf-font-mono)' },
                }, 'm'),
              )
            : React.createElement('span', null, '—'),
          renderEditor: (initial, onSave, onCancel) =>
            React.createElement(SleepEditor, { initial, onSave, onCancel }),
          onSave: async (v) => { await wellness.saveWellness({ sleep_minutes: v }); },
          subText: goalHintForSleep(wellness.entry.sleep_minutes, wellness.goals.sleep_minutes),
        }),

        // ---- Steps ----
        React.createElement(WellnessTile, {
          icon: Footprints,
          label: 'Steps',
          accent: 'steps',
          value: wellness.entry.steps,
          goal: wellness.goals.steps,
          unit: '',
          sparkData: spark.steps,
          delay: 80,
          renderValue: (v) => v != null
            ? React.createElement(NumericReadout, {
                value: v,
                format: (n) => Math.round(n).toLocaleString(),
              })
            : React.createElement('span', null, '—'),
          renderEditor: (initial, onSave, onCancel) =>
            React.createElement(IntEditor, {
              initial, onSave, onCancel,
              placeholder: 'e.g. 8500',
            }),
          onSave: async (v) => { await wellness.saveWellness({ steps: v }); },
          subText: goalHintForSteps(wellness.entry.steps, wellness.goals.steps),
        }),

        // ---- Resting HR (no hard goal — compare to 7-day avg) ----
        React.createElement(WellnessTile, {
          icon: Activity,
          label: 'Resting HR',
          accent: 'heart',
          value: wellness.entry.resting_hr_bpm,
          goal: undefined,
          unit: 'bpm',
          sparkData: spark.hr,
          delay: 160,
          renderValue: (v) => v != null
            ? React.createElement(NumericReadout, { value: v })
            : React.createElement('span', null, '—'),
          renderEditor: (initial, onSave, onCancel) =>
            React.createElement(IntEditor, {
              initial, onSave, onCancel,
              placeholder: 'e.g. 62',
              unit: 'bpm',
            }),
          onSave: async (v) => { await wellness.saveWellness({ resting_hr_bpm: v }); },
          subText: avgHr != null && wellness.entry.resting_hr_bpm != null
            ? `7-day avg ${avgHr} bpm`
            : avgHr != null
              ? `7-day avg ${avgHr} bpm`
              : 'Log to start tracking',
        }),
      ),

      // Notes section
      React.createElement('div', null,
        !notesOpen
          ? React.createElement('button', {
              type: 'button',
              onClick: () => setNotesOpen(true),
              style: {
                background: 'transparent',
                border: 'none',
                color: 'var(--knf-hero-ink)',
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--knf-font-body)',
              },
            },
              React.createElement(StickyNote, { className: 'h-3 w-3' }),
              'Add notes for this day',
            )
          : React.createElement(SignatureCard, { padding: 'md', accent: 'hero' },
              React.createElement('div', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 8,
                },
              },
                React.createElement(StickyNote, { className: 'h-3 w-3', style: { color: 'var(--knf-hero-ink)' } }),
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
                }, 'Day notes'),
              ),
              React.createElement(Textarea, {
                value: notesValue,
                onChange: (e: any) => {
                  setNotesValue(e.target.value);
                  notesDirtyRef.current = true;
                },
                onBlur: flushNotes,
                placeholder: 'How did today feel? Energy, mood, observations…',
                rows: 3,
                className: 'resize-none',
                style: {
                  fontFamily: 'var(--knf-font-body)',
                  fontSize: 13,
                  background: 'var(--knf-surface-2)',
                  border: '1px solid var(--knf-hairline)',
                  borderRadius: 'var(--knf-radius-md)',
                },
              }),
            ),
      ),
    );
  };
}

// ---- helpers ----

function semanticHex(accent: SemanticColor): string {
  const k = accentKeyToPaletteKey(accent);
  return (SIG_PALETTE as any)[k];
}

function accentKeyToPaletteKey(accent: SemanticColor): keyof typeof SIG_PALETTE {
  const map: Record<SemanticColor, keyof typeof SIG_PALETTE> = {
    'cal-burn': 'calBurn',
    protein: 'protein',
    carbs: 'carbs',
    fat: 'fat',
    hydration: 'hydration',
    steps: 'steps',
    sleep: 'sleep',
    heart: 'heart',
    'weight-down': 'weightDown',
    'weight-up': 'weightUp',
    hero: 'hero',
    success: 'success',
    warning: 'warning',
    alert: 'alert',
    muted: 'muted',
    ink: 'ink',
  };
  return map[accent];
}

function hexToRgbCsv(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function goalHintForSleep(mins: number | undefined, goal: number): string {
  if (mins == null) return `Goal ${Math.floor(goal / 60)}h ${goal % 60 ? (goal % 60) + 'm' : ''}`.trim();
  const delta = mins - goal;
  if (delta >= 0) return 'Goal hit';
  const absMin = Math.abs(delta);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  return `${h ? h + 'h ' : ''}${m}m to goal`.trim();
}

function goalHintForSteps(steps: number | undefined, goal: number): string {
  if (steps == null) return `Goal ${goal.toLocaleString()}`;
  const delta = steps - goal;
  if (delta >= 0) return 'Goal hit';
  return `${Math.abs(delta).toLocaleString()} to goal`;
}
