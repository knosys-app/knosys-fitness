import type { SharedDependencies, NormalizedFood, MealType } from '../types';
import { MEAL_LABELS } from '../types';
import { formatCal, formatG } from '../utils/nutrients';
import { createUseFoodSearch } from '../hooks/use-fitness-store';
import { createNutritionLabel } from './nutrition-label';
import { createScopedShadcn } from '../design-system/scoped-shadcn';
import {
  createSemanticBadge,
  createSegmentedControl,
} from '../design-system/primitives';
import { SIG_PALETTE, type SemanticColor } from '../theme/palette';

/**
 * FoodSearchDialog — redesigned signature variant with portal-scoped
 * DialogContent (via createScopedShadcn) so the dialog keeps chartreuse
 * tokens when it portals outside `.knosys-fitness-root`.
 */
export function createFoodSearchDialog(Shared: SharedDependencies) {
  const {
    React, Input, Button, lucideIcons, cn,
  } = Shared;
  const { Search, Plus, X } = lucideIcons;

  const scoped = createScopedShadcn(Shared);
  const { Dialog, DialogContent, DialogHeader, DialogTitle } = scoped;

  const SemanticBadge = createSemanticBadge(Shared);
  const SegmentedControl = createSegmentedControl(Shared);

  const useFoodSearch = createUseFoodSearch(Shared);
  const NutritionLabel = createNutritionLabel(Shared);

  const SOURCE_BADGE: Record<NormalizedFood['source'], { label: string; accent: SemanticColor }> = {
    openfoodfacts: { label: 'Open Food', accent: 'steps' },
    usda: { label: 'USDA', accent: 'hydration' },
    custom: { label: 'Custom', accent: 'protein' },
    recipe: { label: 'Recipe', accent: 'carbs' },
  };

  function FoodCard({ food, onSelect }: { food: NormalizedFood; onSelect: (f: NormalizedFood) => void }) {
    const [hovered, setHovered] = React.useState(false);
    const badge = SOURCE_BADGE[food.source];

    return React.createElement('button', {
      type: 'button',
      onClick: () => onSelect(food),
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      style: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        background: hovered ? 'var(--knf-hero-wash)' : 'var(--knf-surface)',
        border: '1px solid var(--knf-hairline)',
        borderRadius: 'var(--knf-radius-md)',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background var(--knf-duration-1) var(--knf-ease), border-color var(--knf-duration-1) var(--knf-ease)',
        borderColor: hovered ? 'var(--knf-hero-edge)' : 'var(--knf-hairline)',
      },
    },
      React.createElement('div', { style: { flex: 1, minWidth: 0, marginRight: 12 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } },
          React.createElement('span', {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--knf-ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
              flex: '1 1 auto',
            },
          }, food.name),
          React.createElement(SemanticBadge, { accent: badge.accent, variant: 'soft' }, badge.label),
        ),
        React.createElement('div', {
          style: {
            fontSize: 11,
            color: 'var(--knf-muted)',
            fontFamily: 'var(--knf-font-mono)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        },
          [food.brand, food.serving_label].filter(Boolean).join(' \u00B7 '),
        ),
      ),
      React.createElement('div', { style: { textAlign: 'right', flexShrink: 0 } },
        React.createElement('div', {
          style: {
            fontFamily: 'var(--knf-font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--knf-ink)',
          },
        }, `${food.calories} cal`),
        React.createElement('div', {
          style: {
            fontSize: 10,
            color: 'var(--knf-muted)',
            fontFamily: 'var(--knf-font-mono)',
            fontVariantNumeric: 'tabular-nums',
          },
        }, `P${formatG(food.protein_g)} C${formatG(food.carbs_g)} F${formatG(food.fat_g)}`),
      ),
    );
  }

  const QUICK_SERVINGS = [0.5, 1, 1.5, 2, 3];

  function ServingsSelector({ food, mealType, onAdd, onCancel }: {
    food: NormalizedFood; mealType: MealType; onAdd: (servings: number) => void; onCancel: () => void;
  }) {
    const [servings, setServings] = React.useState(1);
    const [nutritionOpen, setNutritionOpen] = React.useState(false);
    const cal = Math.round(food.calories * servings);
    const p = Math.round(food.protein_g * servings * 10) / 10;
    const c = Math.round(food.carbs_g * servings * 10) / 10;
    const f = Math.round(food.fat_g * servings * 10) / 10;

    const badge = SOURCE_BADGE[food.source];

    return React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 14, padding: 2 },
    },
      React.createElement('div', null,
        React.createElement('div', {
          style: {
            fontFamily: 'var(--knf-font-display)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--knf-ink)',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
          },
        }, food.name),
        food.brand
          ? React.createElement('div', {
              style: { fontSize: 12, color: 'var(--knf-muted)', marginTop: 2 },
            }, food.brand)
          : null,
        React.createElement('div', { style: { marginTop: 6 } },
          React.createElement(SemanticBadge, { accent: badge.accent, variant: 'soft' }, badge.label),
        ),
      ),

      // Nutrition for selected servings — big display
      React.createElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          textAlign: 'center',
          background: 'var(--knf-surface-2)',
          padding: 12,
          borderRadius: 'var(--knf-radius-md)',
        },
      },
        ...([
          { label: 'cal', value: formatCal(cal), color: 'var(--knf-ink)' },
          { label: 'protein', value: formatG(p), color: SIG_PALETTE.protein },
          { label: 'carbs', value: formatG(c), color: SIG_PALETTE.carbs },
          { label: 'fat', value: formatG(f), color: SIG_PALETTE.fat },
        ]).map(({ label, value, color }) =>
          React.createElement('div', { key: label },
            React.createElement('div', {
              style: {
                fontFamily: 'var(--knf-font-mono)',
                fontSize: 20,
                fontWeight: 700,
                color,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              },
            }, value),
            React.createElement('div', {
              style: {
                fontSize: 10,
                color: 'var(--knf-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: 4,
                fontFamily: 'var(--knf-font-mono)',
              },
            }, label),
          )
        ),
      ),

      // Servings control
      React.createElement('div', {
        style: { display: 'flex', flexDirection: 'column', gap: 8 },
      },
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        },
          React.createElement('label', {
            style: {
              fontSize: 11,
              color: 'var(--knf-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'var(--knf-font-mono)',
              fontWeight: 500,
            },
          }, 'Servings'),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
            React.createElement(Input, {
              type: 'number', min: 0.25, step: 0.25, value: servings,
              onChange: (e: any) => {
                const v = parseFloat(e.target.value);
                setServings(isNaN(v) || v <= 0 ? 0.25 : v);
              },
              className: 'w-20 h-8 text-center tabular-nums',
              style: { fontFamily: 'var(--knf-font-mono)' },
            }),
            React.createElement('span', {
              style: {
                fontSize: 11,
                color: 'var(--knf-muted)',
                fontFamily: 'var(--knf-font-mono)',
              },
            }, `\u00D7 ${food.serving_label}`),
          ),
        ),
        React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
          ...QUICK_SERVINGS.map(v =>
            React.createElement('button', {
              key: v, type: 'button',
              onClick: () => setServings(v),
              style: {
                fontSize: 11,
                fontFamily: 'var(--knf-font-mono)',
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all var(--knf-duration-1) var(--knf-ease)',
                background: servings === v ? 'var(--knf-hero)' : 'var(--knf-surface)',
                borderColor: servings === v ? 'var(--knf-hero-edge)' : 'var(--knf-hairline)',
                color: servings === v ? 'var(--knf-hero-ink)' : 'var(--knf-ink)',
                fontWeight: servings === v ? 600 : 500,
              },
            }, v === 0.5 ? '\u00BD' : v === 1.5 ? '1\u00BD' : String(v)),
          ),
        ),
        React.createElement('div', {
          style: {
            fontSize: 11,
            color: 'var(--knf-muted)',
            fontFamily: 'var(--knf-font-mono)',
          },
        }, `Total: ${Math.round(food.serving_size_g * servings)}g`),
      ),

      // Collapsible nutrition facts
      React.createElement('button', {
        type: 'button',
        onClick: () => setNutritionOpen(!nutritionOpen),
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--knf-hero-ink)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          alignSelf: 'flex-start',
        },
      },
        React.createElement('span', {
          style: {
            display: 'inline-block',
            transform: nutritionOpen ? 'rotate(90deg)' : 'rotate(0)',
            transition: 'transform var(--knf-duration-1) var(--knf-ease)',
            fontSize: 10,
          },
        }, '\u25B6'),
        'Full nutrition facts',
      ),
      nutritionOpen
        ? React.createElement(NutritionLabel, { food, servings })
        : null,

      React.createElement('div', { style: { display: 'flex', gap: 8, paddingTop: 4 } },
        React.createElement(Button, {
          variant: 'outline', className: 'flex-1', onClick: onCancel,
        }, 'Cancel'),
        React.createElement(Button, {
          className: 'flex-1',
          style: { background: 'var(--knf-hero)', color: 'var(--knf-hero-ink)' },
          onClick: () => onAdd(servings),
        }, `Add to ${MEAL_LABELS[mealType]}`),
      ),
    );
  }

  return function FoodSearchDialog({ open, onOpenChange, mealType, onAddFood, onCreateCustom }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mealType: MealType;
    onAddFood: (food: NormalizedFood, servings: number) => void;
    onCreateCustom?: () => void;
  }) {
    const { query, setQuery, results, searching, source, setSource, recentFoods, frequentFoods, customFoods } = useFoodSearch();
    const [selectedFood, setSelectedFood] = React.useState<NormalizedFood | null>(null);

    const handleAdd = (servings: number) => {
      if (selectedFood) {
        onAddFood(selectedFood, servings);
        setSelectedFood(null);
        onOpenChange(false);
      }
    };

    React.useEffect(() => {
      if (!open) setSelectedFood(null);
    }, [open]);

    // Filter view by tab — the hook's `source` drives external searches;
    // for Custom / Recent / Frequent we use local lists.
    const [view, setView] = React.useState<'all' | 'custom' | 'recent' | 'frequent'>('all');
    React.useEffect(() => {
      setSource(view === 'all' ? 'all' : view === 'custom' ? 'custom' : 'all');
    }, [view, setSource]);

    const viewResults: NormalizedFood[] = (() => {
      if (view === 'custom' && !query) return customFoods;
      if (view === 'recent' && !query) return recentFoods;
      if (view === 'frequent' && !query) return frequentFoods;
      return results;
    })();

    return React.createElement(Dialog, { open, onOpenChange },
      React.createElement(DialogContent, {
        className: 'max-w-lg',
        style: {
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--knf-surface)',
          padding: 20,
        },
      },
        React.createElement(DialogHeader, null,
          React.createElement(DialogTitle, {
            style: {
              fontFamily: 'var(--knf-font-display)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--knf-ink)',
              letterSpacing: '-0.01em',
            },
          }, selectedFood ? 'Add food' : `Add to ${MEAL_LABELS[mealType]}`),
        ),

        selectedFood
          ? React.createElement(ServingsSelector, {
              food: selectedFood,
              mealType,
              onAdd: handleAdd,
              onCancel: () => setSelectedFood(null),
            })
          : React.createElement('div', {
              style: { display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, flex: 1 },
            },
              // Search input
              React.createElement('div', { style: { position: 'relative' } },
                React.createElement(Search, {
                  className: 'h-4 w-4',
                  style: {
                    position: 'absolute',
                    left: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--knf-muted)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  },
                }),
                React.createElement(Input, {
                  placeholder: 'Search foods…',
                  value: query,
                  onChange: (e: any) => setQuery(e.target.value),
                  className: 'pl-9',
                  autoFocus: true,
                  style: {
                    height: 40,
                    background: 'var(--knf-surface-2)',
                    border: '1px solid var(--knf-hairline)',
                    borderRadius: 'var(--knf-radius-md)',
                    fontFamily: 'var(--knf-font-body)',
                    fontSize: 14,
                  },
                }),
              ),

              // Tab strip
              React.createElement('div', null,
                React.createElement(SegmentedControl, {
                  value: view,
                  onValueChange: (v: any) => setView(v),
                  size: 'sm',
                  options: [
                    { value: 'all', label: 'All' },
                    { value: 'custom', label: 'Custom' },
                    { value: 'recent', label: 'Recent' },
                    { value: 'frequent', label: 'Frequent' },
                  ],
                }),
              ),

              // Results
              React.createElement('div', {
                style: {
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                },
              },
                searching
                  ? React.createElement('div', {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      },
                    },
                      ...[1, 2, 3, 4, 5].map(i =>
                        React.createElement('div', {
                          key: i,
                          style: {
                            height: 56,
                            background: 'var(--knf-surface-2)',
                            borderRadius: 'var(--knf-radius-md)',
                            opacity: 0.5 + 0.1 * (5 - i),
                            animation: `knfReveal 600ms var(--knf-ease-out) ${i * 60}ms forwards`,
                          },
                        }),
                      ),
                    )
                  : query && viewResults.length === 0
                  ? React.createElement('div', {
                      style: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '32px 24px',
                        gap: 12,
                        textAlign: 'center',
                      },
                    },
                      React.createElement(Search, {
                        style: { width: 32, height: 32, color: 'var(--knf-muted)', opacity: 0.5 },
                      }),
                      React.createElement('div', null,
                        React.createElement('div', {
                          style: { fontSize: 14, fontWeight: 600, color: 'var(--knf-ink)' },
                        }, 'No results'),
                        React.createElement('div', {
                          style: { fontSize: 12, color: 'var(--knf-muted)', marginTop: 2 },
                        }, `Try a different search`),
                      ),
                      onCreateCustom
                        ? React.createElement(Button, {
                            size: 'sm',
                            style: { background: 'var(--knf-hero)', color: 'var(--knf-hero-ink)' },
                            onClick: () => { onOpenChange(false); onCreateCustom(); },
                          },
                            React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
                            `Create "${query}" as custom food`,
                          )
                        : null,
                    )
                  : React.createElement(React.Fragment, null,
                      ...viewResults.map(food =>
                        React.createElement(FoodCard, {
                          key: `${food.source}:${food.id}`,
                          food,
                          onSelect: (f: NormalizedFood) => setSelectedFood(f),
                        }),
                      ),
                      !query && view === 'all' && viewResults.length === 0
                        ? React.createElement(React.Fragment, null,
                            frequentFoods.length > 0 && React.createElement('div', {
                              style: {
                                fontSize: 11,
                                color: 'var(--knf-muted)',
                                fontFamily: 'var(--knf-font-mono)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                padding: '8px 4px 4px',
                              },
                            }, 'Frequently used'),
                            ...frequentFoods.slice(0, 8).map(food =>
                              React.createElement(FoodCard, {
                                key: `freq:${food.source}:${food.id}`,
                                food,
                                onSelect: (f: NormalizedFood) => setSelectedFood(f),
                              }),
                            ),
                            recentFoods.length > 0 && React.createElement('div', {
                              style: {
                                fontSize: 11,
                                color: 'var(--knf-muted)',
                                fontFamily: 'var(--knf-font-mono)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                padding: '8px 4px 4px',
                              },
                            }, 'Recent'),
                            ...recentFoods.slice(0, 10).map(food =>
                              React.createElement(FoodCard, {
                                key: `recent:${food.source}:${food.id}`,
                                food,
                                onSelect: (f: NormalizedFood) => setSelectedFood(f),
                              }),
                            ),
                          )
                        : null,
                    ),
              ),

              onCreateCustom
                ? React.createElement(Button, {
                    variant: 'outline',
                    className: 'w-full',
                    onClick: () => { onOpenChange(false); onCreateCustom(); },
                  },
                    React.createElement(Plus, { className: 'h-4 w-4 mr-2' }),
                    'Create custom food',
                  )
                : null,
            ),
      ),
    );
  };
}
