import type { SharedDependencies, Goals, WaterEntry } from '../types';
import { createDataBar, createNumericReadout } from '../design-system/primitives';
import { createScopedShadcn } from '../design-system/scoped-shadcn';
import { SIG_PALETTE } from '../theme/palette';

/**
 * WaterTracker — redesigned signature variant.
 *
 * Layout:
 *   [BIG ml count]  / goal_ml   \u2014 hydration blue
 *   [DataBar hydration]
 *   [+250]  [+500]  [+1000]   [+]      [\u2212250]
 *
 * The trailing "+" opens a custom-amount modal.
 */
export function createWaterTracker(Shared: SharedDependencies) {
  const { React, Input, lucideIcons } = Shared;
  const { Droplets, Plus, Minus } = lucideIcons;

  const DataBar = createDataBar(Shared);
  const NumericReadout = createNumericReadout(Shared);
  const Scoped = createScopedShadcn(Shared);
  const { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } = Scoped;

  const QUICK_ADDS = [250, 500, 1000]; // ml
  const MODAL_PRESETS = [100, 200, 350, 500, 750, 1000];

  return function WaterTracker({ water, goals, onAddWater, onSetWater }: {
    water: WaterEntry;
    goals: Goals;
    onAddWater: (ml: number) => void;
    onSetWater: (ml: number) => void;
  }) {
    const [customOpen, setCustomOpen] = React.useState(false);
    const [customValue, setCustomValue] = React.useState<string>('');

    const openCustom = React.useCallback(() => {
      setCustomValue('');
      setCustomOpen(true);
    }, []);

    const submitCustom = React.useCallback(() => {
      const n = parseInt(customValue, 10);
      if (Number.isFinite(n) && n > 0) {
        onAddWater(n);
        setCustomOpen(false);
      }
    }, [customValue, onAddWater]);
    return React.createElement('div', {
      style: {
        background: 'var(--knf-surface)',
        border: '1px solid var(--knf-hairline)',
        borderRadius: 'var(--knf-radius-lg)',
        boxShadow: 'var(--knf-shadow-sm)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      },
    },
      // Header row
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('div', {
            style: {
              width: 26, height: 26, borderRadius: 8,
              background: `rgba(0, 134, 255, 0.12)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            },
          },
            React.createElement(Droplets, {
              style: { width: 14, height: 14, color: SIG_PALETTE.hydration },
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
          }, 'Water'),
        ),
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'baseline',
            gap: 3,
          },
        },
          React.createElement(NumericReadout, {
            value: water.ml,
            format: (n: number) => Math.round(n).toLocaleString(),
            style: {
              fontSize: 26, fontWeight: 700,
              color: SIG_PALETTE.hydration,
              fontFamily: 'var(--knf-font-mono)',
            },
          }),
          React.createElement('span', {
            style: {
              fontSize: 12,
              color: 'var(--knf-muted)',
              fontFamily: 'var(--knf-font-mono)',
            },
          }, `/ ${goals.water_ml.toLocaleString()} ml`),
        ),
      ),

      // Progress bar
      React.createElement(DataBar, {
        value: water.ml,
        max: goals.water_ml,
        accent: 'hydration',
        height: 8,
      }),

      // Quick-add buttons
      React.createElement('div', {
        style: {
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          flexWrap: 'wrap',
        },
      },
        ...QUICK_ADDS.map(ml =>
          React.createElement('button', {
            key: ml, type: 'button',
            onClick: () => onAddWater(ml),
            style: {
              padding: '6px 12px',
              background: 'var(--knf-hero-wash)',
              border: '1px solid var(--knf-hero-edge)',
              borderRadius: 'var(--knf-radius-pill)',
              color: 'var(--knf-hero-ink)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--knf-font-mono)',
              fontVariantNumeric: 'tabular-nums',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              transition: 'transform var(--knf-duration-1) var(--knf-ease), background var(--knf-duration-1) var(--knf-ease)',
            },
            onMouseDown: (e: any) => { e.currentTarget.style.transform = 'scale(0.97)'; },
            onMouseUp: (e: any) => { e.currentTarget.style.transform = 'scale(1)'; },
            onMouseLeave: (e: any) => { e.currentTarget.style.transform = 'scale(1)'; },
          },
            React.createElement(Plus, { className: 'h-3 w-3' }),
            `${ml} ml`,
          ),
        ),
        // Custom amount \u2014 icon-only "+" pops a modal
        React.createElement('button', {
          type: 'button',
          onClick: openCustom,
          'aria-label': 'Log custom amount',
          title: 'Custom amount',
          style: {
            width: 28,
            height: 28,
            padding: 0,
            background: 'var(--knf-surface)',
            border: '1px dashed var(--knf-hero-edge)',
            borderRadius: '9999px',
            color: 'var(--knf-hero-ink)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform var(--knf-duration-1) var(--knf-ease), background var(--knf-duration-1) var(--knf-ease)',
          },
          onMouseEnter: (e: any) => { e.currentTarget.style.background = 'var(--knf-hero-wash)'; },
          onMouseLeave: (e: any) => { e.currentTarget.style.background = 'var(--knf-surface)'; e.currentTarget.style.transform = 'scale(1)'; },
          onMouseDown: (e: any) => { e.currentTarget.style.transform = 'scale(0.94)'; },
          onMouseUp: (e: any) => { e.currentTarget.style.transform = 'scale(1)'; },
        },
          React.createElement(Plus, { style: { width: 14, height: 14 } }),
        ),
        React.createElement('div', { style: { flex: 1 } }),
        React.createElement('button', {
          type: 'button',
          onClick: () => onSetWater(Math.max(0, water.ml - 250)),
          style: {
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--knf-hairline)',
            borderRadius: 'var(--knf-radius-pill)',
            color: 'var(--knf-muted)',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'var(--knf-font-mono)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            transition: 'transform var(--knf-duration-1) var(--knf-ease)',
          },
        },
          React.createElement(Minus, { className: 'h-3 w-3' }),
          '250',
        ),
      ),

      // Custom amount modal
      React.createElement(Dialog, { open: customOpen, onOpenChange: setCustomOpen },
        React.createElement(DialogContent, {
          style: { maxWidth: 380 },
        },
          React.createElement(DialogHeader, null,
            React.createElement(DialogTitle, {
              style: {
                fontFamily: 'var(--knf-font-display)',
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '-0.01em',
              },
            }, 'Log water'),
            React.createElement(DialogDescription, null, 'Enter any amount in millilitres.'),
          ),
          // Input row
          React.createElement('div', {
            style: {
              display: 'flex',
              alignItems: 'stretch',
              gap: 8,
              marginTop: 4,
            },
          },
            React.createElement(Input, {
              type: 'number',
              inputMode: 'numeric',
              min: 1,
              step: 50,
              placeholder: '500',
              value: customValue,
              onChange: (e: any) => setCustomValue(e.target.value),
              onKeyDown: (e: any) => { if (e.key === 'Enter') submitCustom(); },
              autoFocus: true,
              style: {
                flex: 1,
                fontFamily: 'var(--knf-font-mono)',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 18,
                fontWeight: 600,
              },
            }),
            React.createElement('div', {
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 14px',
                background: 'var(--knf-surface-2)',
                border: '1px solid var(--knf-hairline)',
                borderRadius: 'var(--knf-radius-md)',
                fontFamily: 'var(--knf-font-mono)',
                fontSize: 12,
                color: 'var(--knf-muted)',
                letterSpacing: '0.1em',
              },
            }, 'ML'),
          ),
          // Preset chips
          React.createElement('div', {
            style: {
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 12,
            },
          },
            ...MODAL_PRESETS.map((ml) =>
              React.createElement('button', {
                key: ml,
                type: 'button',
                onClick: () => setCustomValue(String(ml)),
                style: {
                  padding: '4px 10px',
                  background: String(ml) === customValue ? 'var(--knf-hero-wash)' : 'transparent',
                  border: `1px solid ${String(ml) === customValue ? 'var(--knf-hero-edge)' : 'var(--knf-hairline)'}`,
                  borderRadius: 'var(--knf-radius-pill)',
                  color: String(ml) === customValue ? 'var(--knf-hero-ink)' : 'var(--knf-muted)',
                  fontFamily: 'var(--knf-font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background var(--knf-duration-1) var(--knf-ease), color var(--knf-duration-1) var(--knf-ease), border-color var(--knf-duration-1) var(--knf-ease)',
                },
              }, `${ml} ml`),
            ),
          ),
          // Footer actions
          React.createElement(DialogFooter, {
            style: { marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' },
          },
            React.createElement('button', {
              type: 'button',
              onClick: () => setCustomOpen(false),
              style: {
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid var(--knf-hairline)',
                borderRadius: 'var(--knf-radius-pill)',
                color: 'var(--knf-muted)',
                fontFamily: 'var(--knf-font-body)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              },
            }, 'Cancel'),
            React.createElement('button', {
              type: 'button',
              onClick: submitCustom,
              disabled: !customValue || !Number.isFinite(parseInt(customValue, 10)) || parseInt(customValue, 10) <= 0,
              style: {
                padding: '8px 16px',
                background: 'var(--knf-hero)',
                border: '1px solid var(--knf-hero-edge)',
                borderRadius: 'var(--knf-radius-pill)',
                color: 'var(--knf-hero-ink)',
                fontFamily: 'var(--knf-font-body)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: !customValue || parseInt(customValue, 10) <= 0 ? 0.5 : 1,
                transition: 'transform var(--knf-duration-1) var(--knf-ease)',
              },
            }, 'Add to today'),
          ),
        ),
      ),
    );
  };
}
