import type { SharedDependencies, Exercise } from '../types';
import { createUseExerciseSearch } from '../hooks/use-fitness-store';
import { findCatalogExercise } from '../api/exercise-catalog';
import { createScopedShadcn } from '../design-system/scoped-shadcn';
import {
  createSegmentedControl,
  createSemanticBadge,
} from '../design-system/primitives';

const EYEBROW_STYLE = {
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

type SourceBadge = { label: string; accent: 'protein' | 'steps' | 'carbs' };

function badgeForSource(source: Exercise['source']): SourceBadge | null {
  if (source === 'yuhonas') return null;
  if (source === 'custom') return { label: 'Custom', accent: 'protein' };
  if (source === 'wger') return { label: 'wger · CC-BY-SA', accent: 'steps' };
  return { label: 'api-ninjas', accent: 'carbs' };
}

export function createExerciseSearchDialog(Shared: SharedDependencies) {
  const { React, Input, Button, lucideIcons, cn } = Shared;
  const { Search: SearchIcon, Plus, Star, Dumbbell } = lucideIcons;

  const Scoped = createScopedShadcn(Shared);
  const SegmentedControl = createSegmentedControl(Shared);
  const SemanticBadge = createSemanticBadge(Shared);
  const useExerciseSearch = createUseExerciseSearch(Shared);

  function ExerciseRow({ exercise, favorite, onSelect, onToggleFavorite }: {
    exercise: Exercise;
    favorite: boolean;
    onSelect: (ex: Exercise) => void;
    onToggleFavorite: (id: string) => void;
  }) {
    const [hovered, setHovered] = React.useState(false);
    const thumb = exercise.images[0];
    const subtitleParts = [
      exercise.primaryMuscles.slice(0, 2).join(', '),
      exercise.equipment,
    ].filter(Boolean);
    const badge = badgeForSource(exercise.source);

    return React.createElement('div', {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 10px',
        borderRadius: 'var(--knf-radius-md)',
        background: hovered ? 'var(--knf-hero-wash)' : 'transparent',
        transition: 'background var(--knf-duration-1) var(--knf-ease)',
        cursor: 'pointer',
      },
    },
      React.createElement('button', {
        onClick: () => onSelect(exercise),
        style: {
          display: 'flex', alignItems: 'center', gap: 12, flex: 1,
          minWidth: 0, textAlign: 'left', background: 'transparent',
          border: 'none', padding: 0, cursor: 'pointer',
        },
      },
        thumb
          ? React.createElement('img', {
              src: thumb, alt: '',
              loading: 'lazy',
              onError: (e: any) => { e.currentTarget.style.visibility = 'hidden'; },
              style: {
                width: 44, height: 44, objectFit: 'cover',
                borderRadius: 'var(--knf-radius-sm)',
                background: 'var(--knf-surface-2)',
                border: '1px solid var(--knf-hairline)',
                flexShrink: 0,
              },
            })
          : React.createElement('div', {
              style: {
                width: 44, height: 44,
                borderRadius: 'var(--knf-radius-sm)',
                background: 'var(--knf-surface-2)',
                border: '1px solid var(--knf-hairline)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              },
            }, React.createElement(Dumbbell, {
              className: 'h-5 w-5',
              style: { color: 'var(--knf-muted)' },
            })),
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', {
            style: {
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--knf-ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3,
            },
          }, exercise.name),
          React.createElement('div', {
            style: {
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11,
              color: 'var(--knf-muted)',
              fontFamily: 'var(--knf-font-mono)',
              marginTop: 2,
              minWidth: 0,
            },
          },
            React.createElement('span', {
              style: {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            }, subtitleParts.join(' · ') || exercise.category || ''),
            badge && React.createElement(SemanticBadge, {
              accent: badge.accent, variant: 'soft',
              style: { flexShrink: 0, fontSize: 9, padding: '1px 6px' },
            }, badge.label),
          ),
        ),
      ),
      React.createElement(Button, {
        variant: 'ghost', size: 'icon',
        className: 'h-7 w-7',
        style: {
          opacity: favorite || hovered ? 1 : 0,
          transition: 'opacity var(--knf-duration-1) var(--knf-ease)',
          flexShrink: 0,
        },
        onClick: () => onToggleFavorite(exercise.id),
        'aria-label': favorite ? 'Unfavorite' : 'Favorite',
      }, React.createElement(Star, {
        className: cn('h-3.5 w-3.5'),
        style: {
          fill: favorite ? 'var(--knf-hero)' : 'none',
          color: favorite ? 'var(--knf-hero-ink)' : 'var(--knf-muted)',
          strokeWidth: 2,
        },
      })),
    );
  }

  function SectionHeader({ children }: { children: any }) {
    return React.createElement('div', {
      style: { ...EYEBROW_STYLE, padding: '8px 10px 4px' },
    }, children);
  }

  return function ExerciseSearchDialog({ open, onOpenChange, onSelect, onCreateCustom }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (exercise: Exercise) => void;
    onCreateCustom?: (queryHint?: string) => void;
  }) {
    const {
      query, setQuery, results, searching, catalogReady, catalogError,
      source, setSource, recents, favorites, frequency, customExercises,
      toggleFavorite, trackUsage, refreshCustomExercises,
    } = useExerciseSearch();

    React.useEffect(() => {
      if (open) refreshCustomExercises();
    }, [open, refreshCustomExercises]);

    const resolve = React.useCallback((id: string): Exercise | undefined => {
      return customExercises.find(e => e.id === id) ?? findCatalogExercise(id);
    }, [customExercises, catalogReady]);

    const favoriteExercises = React.useMemo(
      () => favorites.map(resolve).filter((e): e is Exercise => !!e),
      [favorites, resolve],
    );

    const frequentExercises = React.useMemo(() => {
      const entries = Object.entries(frequency).sort((a, b) => b[1] - a[1]).slice(0, 8);
      return entries.map(([id]) => resolve(id)).filter((e): e is Exercise => !!e);
    }, [frequency, resolve]);

    const handleSelect = React.useCallback((exercise: Exercise) => {
      trackUsage(exercise);
      onSelect(exercise);
      onOpenChange(false);
    }, [onSelect, onOpenChange, trackUsage]);

    const showingEmptyState = !query.trim();

    return React.createElement(Scoped.Dialog, { open, onOpenChange },
      React.createElement(Scoped.DialogContent, {
        className: 'max-w-lg',
        style: { maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
      },
        React.createElement(Scoped.DialogHeader, null,
          React.createElement('div', { className: 'knf-eyebrow', style: EYEBROW_STYLE }, 'Browse'),
          React.createElement(Scoped.DialogTitle, {
            style: { fontFamily: 'var(--knf-font-display)', letterSpacing: '-0.01em' },
          }, 'Exercises'),
        ),

        // Search input
        React.createElement('div', {
          style: { position: 'relative', margin: '4px 0 10px' },
        },
          React.createElement(SearchIcon, {
            className: 'h-4 w-4',
            style: {
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--knf-muted)',
              pointerEvents: 'none',
            },
          }),
          React.createElement(Input, {
            placeholder: 'Search exercises, muscles, equipment…',
            value: query,
            onChange: (e: any) => setQuery(e.target.value),
            className: 'h-9',
            style: { ...INPUT_STYLE, paddingLeft: 36 },
            autoFocus: true,
          }),
        ),

        // Source tabs
        React.createElement('div', { style: { marginBottom: 10 } },
          React.createElement(SegmentedControl, {
            value: source,
            onValueChange: (v: string) => setSource(v as any),
            options: [
              { value: 'all', label: 'All' },
              { value: 'yuhonas', label: 'Catalog' },
              { value: 'wger', label: 'wger' },
              { value: 'api-ninjas', label: 'Ninjas' },
              { value: 'custom', label: 'Custom' },
            ],
            size: 'sm',
            ariaLabel: 'Exercise source',
          }),
        ),

        // Catalog loading / error banner
        !catalogReady && !catalogError && React.createElement('div', {
          style: { ...EYEBROW_STYLE, textAlign: 'center', padding: '4px 0' },
        }, 'Loading catalog…'),
        catalogError && React.createElement('div', {
          style: { ...EYEBROW_STYLE, color: 'var(--knf-alert)', textAlign: 'center', padding: '4px 0' },
        }, `Catalog unavailable: ${catalogError}`),

        // Results
        React.createElement('div', {
          style: {
            flex: 1, minHeight: 0, overflowY: 'auto',
            marginLeft: -10, marginRight: -10,
          },
        },
          searching
            ? React.createElement('div', {
                style: { ...EYEBROW_STYLE, textAlign: 'center', padding: '24px 0' },
              }, 'Searching…')
            : !showingEmptyState && results.length === 0
            ? React.createElement('div', {
                style: {
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '32px 24px', textAlign: 'center', gap: 12,
                },
              },
                React.createElement(SearchIcon, {
                  className: 'h-8 w-8',
                  style: { color: 'var(--knf-muted)', opacity: 0.5 },
                }),
                React.createElement('div', null,
                  React.createElement('div', {
                    style: {
                      fontSize: 13, fontWeight: 500, color: 'var(--knf-ink)',
                    },
                  }, 'No matches found'),
                  React.createElement('div', {
                    style: {
                      fontSize: 11, color: 'var(--knf-muted)',
                      marginTop: 2, fontFamily: 'var(--knf-font-mono)',
                    },
                  }, `Nothing matches "${query}"`),
                ),
                onCreateCustom && React.createElement(Button, {
                  size: 'sm',
                  onClick: () => { onOpenChange(false); onCreateCustom(query); },
                  style: {
                    background: 'var(--knf-hero)',
                    color: 'var(--knf-hero-ink)',
                    border: '1px solid var(--knf-hero-edge)',
                  },
                },
                  React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
                  `Create "${query}" as custom exercise`,
                ),
              )
            : !showingEmptyState
            ? React.createElement('div', { style: { padding: '0 4px' } },
                ...results.map(ex =>
                  React.createElement(ExerciseRow, {
                    key: ex.id, exercise: ex,
                    favorite: favorites.includes(ex.id),
                    onSelect: handleSelect,
                    onToggleFavorite: toggleFavorite,
                  }),
                ),
              )
            : React.createElement('div', { style: { padding: '0 4px' } },
                favoriteExercises.length > 0 && React.createElement(React.Fragment, null,
                  React.createElement(SectionHeader, null, 'Favorites'),
                  ...favoriteExercises.map(ex =>
                    React.createElement(ExerciseRow, {
                      key: `fav:${ex.id}`, exercise: ex, favorite: true,
                      onSelect: handleSelect, onToggleFavorite: toggleFavorite,
                    }),
                  ),
                ),
                frequentExercises.length > 0 && React.createElement(React.Fragment, null,
                  React.createElement(SectionHeader, null, 'Frequent'),
                  ...frequentExercises.map(ex =>
                    React.createElement(ExerciseRow, {
                      key: `freq:${ex.id}`, exercise: ex,
                      favorite: favorites.includes(ex.id),
                      onSelect: handleSelect, onToggleFavorite: toggleFavorite,
                    }),
                  ),
                ),
                recents.length > 0 && React.createElement(React.Fragment, null,
                  React.createElement(SectionHeader, null, 'Recent'),
                  ...recents.slice(0, 10).map(ex =>
                    React.createElement(ExerciseRow, {
                      key: `recent:${ex.id}`, exercise: ex,
                      favorite: favorites.includes(ex.id),
                      onSelect: handleSelect, onToggleFavorite: toggleFavorite,
                    }),
                  ),
                ),
                favoriteExercises.length === 0 && frequentExercises.length === 0 && recents.length === 0
                  && React.createElement('div', {
                    style: {
                      ...EYEBROW_STYLE, textAlign: 'center', padding: '24px 0',
                    },
                  }, 'Start typing to search the catalog'),
              ),
        ),

        onCreateCustom && React.createElement('div', {
          style: {
            marginTop: 10, paddingTop: 10,
            borderTop: '1px solid var(--knf-hairline)',
          },
        },
          React.createElement(Button, {
            variant: 'outline',
            className: 'w-full h-9',
            onClick: () => { onOpenChange(false); onCreateCustom(query.trim() || undefined); },
          },
            React.createElement(Plus, { className: 'h-4 w-4 mr-2' }),
            'Create custom exercise',
          ),
        ),
      ),
    );
  };
}
