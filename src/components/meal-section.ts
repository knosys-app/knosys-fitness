import type { SharedDependencies, MealType, MealLog, FoodEntry } from '../types';
import { MEAL_LABELS } from '../types';
import { mealTotals, formatCal, formatG, entryNutrients } from '../utils/nutrients';
import { createScopedShadcn } from '../design-system/scoped-shadcn';
import {
  createNumericReadout,
  createSemanticBadge,
} from '../design-system/primitives';
import { createEmptyState } from './empty-state';

/**
 * MealSection — redesigned card per meal (breakfast/lunch/dinner/snacks).
 * Chartreuse-accented hover lift; entries live in a clean list with
 * kcal and macro mini-stats on the right; "+ Add food" and "Save as
 * template" actions at the bottom.
 *
 * Popover for edit-servings uses `createScopedShadcn` so portal content
 * inherits signature tokens.
 */
export function createMealSection(Shared: SharedDependencies) {
  const { React, Button, Input, lucideIcons, cn } = Shared;
  const {
    Plus, Minus, Trash2, ChevronDown, ChevronUp, BookmarkPlus, Pencil,
    UtensilsCrossed, Sun, Sunset, Moon: MoonIcon, Coffee,
  } = lucideIcons;

  const scoped = createScopedShadcn(Shared);
  const { Popover, PopoverContent, PopoverTrigger } = scoped;

  const NumericReadout = createNumericReadout(Shared);
  const SemanticBadge = createSemanticBadge(Shared);
  const EmptyState = createEmptyState(Shared);

  const MEAL_ICONS: Record<MealType, any> = {
    breakfast: Coffee,
    lunch: Sun,
    dinner: Sunset,
    snacks: UtensilsCrossed,
  };

  // --- Servings editor (used inside Popover) ---
  function ServingsEditor({ entry, onUpdate, onClose }: {
    entry: FoodEntry; onUpdate: (s: number) => void; onClose: () => void;
  }) {
    const [servings, setServings] = React.useState(entry.servings);
    const handleSave = () => {
      if (servings > 0) {
        onUpdate(servings);
        onClose();
      }
    };

    return React.createElement('div', {
      style: { padding: 14, display: 'flex', flexDirection: 'column', gap: 10, width: 240 },
    },
      React.createElement('div', {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--knf-ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }, entry.food.name),
      React.createElement('div', {
        style: {
          fontSize: 11,
          color: 'var(--knf-muted)',
          fontFamily: 'var(--knf-font-mono)',
        },
      }, `per serving: ${entry.food.serving_label}`),

      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
        React.createElement(Button, {
          variant: 'outline', size: 'icon', className: 'h-8 w-8 shrink-0',
          onClick: () => setServings(Math.max(0.25, Math.round((servings - 0.25) * 4) / 4)),
        }, React.createElement(Minus, { className: 'h-3 w-3' })),
        React.createElement(Input, {
          type: 'number', min: 0.25, step: 0.25, value: servings,
          onChange: (e: any) => setServings(Math.max(0.25, parseFloat(e.target.value) || 0.25)),
          className: 'h-8 text-center tabular-nums',
          style: { fontFamily: 'var(--knf-font-mono)' },
        }),
        React.createElement(Button, {
          variant: 'outline', size: 'icon', className: 'h-8 w-8 shrink-0',
          onClick: () => setServings(Math.round((servings + 0.25) * 4) / 4),
        }, React.createElement(Plus, { className: 'h-3 w-3' })),
      ),

      React.createElement('div', {
        style: {
          fontSize: 12, textAlign: 'center',
          fontFamily: 'var(--knf-font-mono)',
          color: 'var(--knf-ink-2)',
        },
      }, `= ${Math.round(entry.food.calories * servings)} cal`),

      React.createElement('div', { style: { display: 'flex', gap: 6 } },
        React.createElement(Button, {
          variant: 'ghost', size: 'sm', className: 'flex-1 h-8 text-xs',
          onClick: onClose,
        }, 'Cancel'),
        React.createElement(Button, {
          size: 'sm', className: 'flex-1 h-8 text-xs',
          onClick: handleSave,
        }, 'Update'),
      ),
    );
  }

  function FoodEntryRow({ entry, onRemove, onUpdateServings }: {
    entry: FoodEntry; onRemove: () => void; onUpdateServings: (s: number) => void;
  }) {
    const [editOpen, setEditOpen] = React.useState(false);
    const [hovered, setHovered] = React.useState(false);
    const n = entryNutrients(entry);

    return React.createElement('div', {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 4px',
        borderBottom: '1px solid var(--knf-hairline)',
        position: 'relative',
        background: hovered ? 'var(--knf-hero-wash)' : 'transparent',
        transition: 'background-color var(--knf-duration-1) var(--knf-ease)',
        borderRadius: 6,
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
        }, entry.food.name),
        React.createElement('div', {
          style: {
            fontSize: 11,
            color: 'var(--knf-muted)',
            fontFamily: 'var(--knf-font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        },
          React.createElement('span', {
            style: {
              display: 'inline-block',
              padding: '1px 6px',
              background: 'var(--knf-surface-2)',
              borderRadius: 999,
              fontSize: 10,
            },
          }, `${entry.servings}\u00D7`),
          React.createElement('span', null, entry.food.serving_label),
          entry.food.brand
            ? React.createElement('span', { style: { color: 'var(--knf-muted)' } }, `\u00B7 ${entry.food.brand}`)
            : null,
        ),
      ),
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        },
      },
        React.createElement('div', { style: { textAlign: 'right' } },
          React.createElement('div', {
            style: {
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--knf-ink)',
              fontFamily: 'var(--knf-font-mono)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            },
          }, n.calories),
          React.createElement('div', {
            style: {
              fontSize: 10,
              color: 'var(--knf-muted)',
              fontFamily: 'var(--knf-font-mono)',
              fontVariantNumeric: 'tabular-nums',
              marginTop: 2,
            },
          }, `P${formatG(n.protein_g)} C${formatG(n.carbs_g)} F${formatG(n.fat_g)}`),
        ),
        React.createElement(Popover, { open: editOpen, onOpenChange: setEditOpen },
          React.createElement(PopoverTrigger, { asChild: true },
            React.createElement(Button, {
              variant: 'ghost', size: 'icon',
              className: 'h-7 w-7',
              style: {
                opacity: hovered || editOpen ? 1 : 0,
                transition: 'opacity var(--knf-duration-1) var(--knf-ease)',
              },
              onClick: (e: any) => e.stopPropagation(),
            }, React.createElement(Pencil, {
              className: 'h-3.5 w-3.5',
              style: { color: 'var(--knf-muted)' },
            })),
          ),
          React.createElement(PopoverContent, {
            className: 'p-0',
            align: 'end',
            side: 'left',
            style: {
              background: 'var(--knf-surface)',
              border: '1px solid var(--knf-hairline)',
              borderRadius: 'var(--knf-radius-md)',
              boxShadow: 'var(--knf-shadow-md)',
            },
          },
            React.createElement(ServingsEditor, {
              entry, onUpdate: onUpdateServings, onClose: () => setEditOpen(false),
            }),
          ),
        ),
        React.createElement(Button, {
          variant: 'ghost', size: 'icon',
          className: 'h-7 w-7',
          style: {
            opacity: hovered ? 1 : 0,
            transition: 'opacity var(--knf-duration-1) var(--knf-ease)',
          },
          onClick: (e: any) => { e.stopPropagation(); onRemove(); },
        }, React.createElement(Trash2, {
          className: 'h-3.5 w-3.5',
          style: { color: 'var(--knf-alert)' },
        })),
      ),
    );
  }

  return function MealSection({
    mealType, meal, onAddFood, onRemoveEntry, onUpdateServings, onSaveAsTemplate,
  }: {
    mealType: MealType;
    meal: MealLog;
    onAddFood: () => void;
    onRemoveEntry: (id: string) => void;
    onUpdateServings: (id: string, servings: number) => void;
    onSaveAsTemplate?: () => void;
  }) {
    const [expanded, setExpanded] = React.useState(true);
    const totals = mealTotals(meal);
    const MealIcon = MEAL_ICONS[mealType];

    return React.createElement('div', {
      style: {
        background: 'var(--knf-surface)',
        border: '1px solid var(--knf-hairline)',
        borderRadius: 'var(--knf-radius-lg)',
        boxShadow: 'var(--knf-shadow-sm)',
        overflow: 'hidden',
      },
    },
      // Header (clickable)
      React.createElement('button', {
        type: 'button',
        onClick: () => setExpanded(!expanded),
        style: {
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background var(--knf-duration-1) var(--knf-ease)',
          fontFamily: 'var(--knf-font-body)',
        },
        onMouseEnter: (e: any) => { e.currentTarget.style.background = 'var(--knf-surface-2)'; },
        onMouseLeave: (e: any) => { e.currentTarget.style.background = 'transparent'; },
      },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          React.createElement('div', {
            style: {
              width: 28, height: 28,
              background: 'var(--knf-hero-wash)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            },
          },
            React.createElement(MealIcon, {
              style: { width: 14, height: 14, color: 'var(--knf-hero-ink)' },
            }),
          ),
          React.createElement('div', { style: { textAlign: 'left' } },
            React.createElement('div', {
              style: {
                fontFamily: 'var(--knf-font-display)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--knf-ink)',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
              },
            }, MEAL_LABELS[mealType]),
            meal.entries.length > 0
              ? React.createElement('div', {
                  style: {
                    fontSize: 11,
                    color: 'var(--knf-muted)',
                    fontFamily: 'var(--knf-font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                    marginTop: 2,
                  },
                }, `${meal.entries.length} item${meal.entries.length === 1 ? '' : 's'}`)
              : React.createElement('div', {
                  style: {
                    fontSize: 11,
                    color: 'var(--knf-muted)',
                    marginTop: 2,
                  },
                }, 'Nothing logged'),
          ),
        ),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          React.createElement('div', {
            style: {
              display: 'flex',
              alignItems: 'baseline',
              gap: 3,
              fontFamily: 'var(--knf-font-mono)',
            },
          },
            React.createElement(NumericReadout, {
              value: totals.calories,
              style: { fontSize: 22, fontWeight: 600, color: 'var(--knf-ink)' },
            }),
            React.createElement('span', {
              style: { fontSize: 11, color: 'var(--knf-muted)', fontWeight: 500 },
            }, 'cal'),
          ),
          React.createElement(expanded ? ChevronUp : ChevronDown, {
            style: { width: 16, height: 16, color: 'var(--knf-muted)' },
          }),
        ),
      ),

      // Body
      expanded && React.createElement('div', {
        style: {
          padding: '0 16px 12px',
          borderTop: '1px solid var(--knf-hairline)',
        },
      },
        meal.entries.length > 0
          ? React.createElement('div', {
              style: { display: 'flex', flexDirection: 'column' },
            },
              ...meal.entries.map(entry =>
                React.createElement(FoodEntryRow, {
                  key: entry.id,
                  entry,
                  onRemove: () => onRemoveEntry(entry.id),
                  onUpdateServings: (s: number) => onUpdateServings(entry.id, s),
                }),
              ),
            )
          : null,

        React.createElement('div', {
          style: {
            display: 'flex',
            gap: 6,
            marginTop: meal.entries.length > 0 ? 10 : 12,
          },
        },
          React.createElement(Button, {
            variant: 'ghost', size: 'sm',
            className: 'flex-1',
            style: {
              fontSize: 12,
              color: 'var(--knf-hero-ink)',
              fontWeight: 500,
              justifyContent: 'flex-start',
            },
            onClick: onAddFood,
          },
            React.createElement(Plus, { className: 'h-4 w-4 mr-1.5' }),
            'Add food',
          ),
          onSaveAsTemplate && meal.entries.length > 0
            ? React.createElement(Button, {
                variant: 'ghost', size: 'sm',
                style: { fontSize: 12, color: 'var(--knf-muted)' },
                onClick: onSaveAsTemplate,
                title: 'Save as template',
              },
                React.createElement(BookmarkPlus, { className: 'h-4 w-4' }),
              )
            : null,
        ),
      ),
    );
  };
}
