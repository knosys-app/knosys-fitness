import type { SharedDependencies, Exercise } from '../types';
import { createUseExerciseSearch } from '../hooks/use-fitness-store';
import { findCatalogExercise } from '../api/exercise-catalog';

export function createExerciseSearchDialog(Shared: SharedDependencies) {
  const {
    React, Dialog, DialogContent, DialogHeader, DialogTitle,
    Input, Button, Tabs, TabsList, TabsTrigger, Separator, lucideIcons, cn,
  } = Shared;
  const { Search, Plus, Star, Dumbbell } = lucideIcons;

  const useExerciseSearch = createUseExerciseSearch(Shared);

  function ExerciseRow({ exercise, favorite, onSelect, onToggleFavorite }: {
    exercise: Exercise;
    favorite: boolean;
    onSelect: (ex: Exercise) => void;
    onToggleFavorite: (id: string) => void;
  }) {
    const thumb = exercise.images[0];
    const muscles = exercise.primaryMuscles.slice(0, 2).join(', ');
    const sourceBadge =
      exercise.source === 'yuhonas' ? null :
      exercise.source === 'custom' ? { label: 'Custom', bg: 'rgba(139, 92, 246, 0.12)', fg: '#7c3aed' } :
      exercise.source === 'wger' ? { label: 'wger · CC-BY-SA', bg: 'rgba(16, 185, 129, 0.12)', fg: '#059669' } :
      { label: 'api-ninjas', bg: 'rgba(245, 158, 11, 0.12)', fg: '#d97706' };

    return React.createElement('div', {
      className: 'flex items-center gap-3 px-2 py-2 hover:bg-muted/50 rounded-md transition-colors group',
    },
      React.createElement('button', {
        onClick: () => onSelect(exercise),
        className: 'flex items-center gap-3 flex-1 min-w-0 text-left',
      },
        thumb
          ? React.createElement('img', {
              src: thumb,
              alt: '',
              loading: 'lazy',
              onError: (e: any) => { e.currentTarget.style.visibility = 'hidden'; },
              className: 'h-10 w-10 rounded object-cover bg-muted shrink-0',
            })
          : React.createElement('div', {
              className: 'h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0',
            }, React.createElement(Dumbbell, { className: 'h-5 w-5 text-muted-foreground' })),
        React.createElement('div', { className: 'flex-1 min-w-0' },
          React.createElement('div', { className: 'text-sm font-medium truncate' }, exercise.name),
          React.createElement('div', { className: 'flex items-center gap-1.5 text-xs text-muted-foreground truncate' },
            React.createElement('span', { className: 'truncate' },
              [muscles, exercise.equipment].filter(Boolean).join(' · ') || exercise.category || ''),
            sourceBadge && React.createElement('span', {
              className: 'text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
              style: { backgroundColor: sourceBadge.bg, color: sourceBadge.fg },
            }, sourceBadge.label),
          ),
        ),
      ),
      React.createElement(Button, {
        variant: 'ghost', size: 'icon',
        className: 'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
        onClick: () => onToggleFavorite(exercise.id),
        'aria-label': favorite ? 'Unfavorite' : 'Favorite',
      },
        React.createElement(Star, {
          className: cn('h-3.5 w-3.5', favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'),
        }),
      ),
    );
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

    // Resolve favorites / frequent to Exercise objects via catalog or custom list.
    const resolve = React.useCallback((id: string): Exercise | undefined => {
      return customExercises.find(e => e.id === id) ?? findCatalogExercise(id);
    }, [customExercises]);

    const favoriteExercises = React.useMemo(
      () => favorites.map(resolve).filter((e): e is Exercise => !!e),
      [favorites, resolve, catalogReady],
    );

    const frequentExercises = React.useMemo(() => {
      const entries = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
      return entries.map(([id]) => resolve(id)).filter((e): e is Exercise => !!e);
    }, [frequency, resolve, catalogReady]);

    const handleSelect = React.useCallback((exercise: Exercise) => {
      trackUsage(exercise);
      onSelect(exercise);
      onOpenChange(false);
    }, [onSelect, onOpenChange, trackUsage]);

    const showingEmptyState = !query.trim();

    return React.createElement(Dialog, { open, onOpenChange },
      React.createElement(DialogContent, {
        className: 'max-w-lg flex flex-col',
        style: { maxHeight: '85vh' },
      },
        React.createElement(DialogHeader, null,
          React.createElement(DialogTitle, null, 'Add Exercise'),
        ),

        // Search input
        React.createElement('div', { className: 'relative' },
          React.createElement(Search, {
            className: 'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground',
          }),
          React.createElement(Input, {
            placeholder: 'Search exercises, muscles, equipment...',
            value: query,
            onChange: (e: any) => setQuery(e.target.value),
            className: 'pl-9',
            autoFocus: true,
          }),
        ),

        // Source tabs
        React.createElement(Tabs, {
          value: source,
          onValueChange: (v: string) => setSource(v as any),
        },
          React.createElement(TabsList, { className: 'w-full' },
            React.createElement(TabsTrigger, { value: 'all', className: 'flex-1 text-xs' }, 'All'),
            React.createElement(TabsTrigger, { value: 'yuhonas', className: 'flex-1 text-xs' }, 'Catalog'),
            React.createElement(TabsTrigger, { value: 'wger', className: 'flex-1 text-xs' }, 'wger'),
            React.createElement(TabsTrigger, { value: 'api-ninjas', className: 'flex-1 text-xs' }, 'Ninjas'),
            React.createElement(TabsTrigger, { value: 'custom', className: 'flex-1 text-xs' }, 'Custom'),
          ),
        ),

        // Catalog loading / error banner
        !catalogReady && !catalogError && React.createElement('div', {
          className: 'text-xs text-muted-foreground text-center py-1',
        }, 'Loading catalog…'),
        catalogError && React.createElement('div', {
          className: 'text-xs text-destructive text-center py-1',
        }, `Catalog unavailable: ${catalogError}`),

        // Results
        React.createElement('div', {
          style: { maxHeight: '55vh', overflowY: 'auto', marginLeft: '-8px', marginRight: '-8px' },
        },
          searching
            ? React.createElement('div', { className: 'flex items-center justify-center py-8 text-sm text-muted-foreground' }, 'Searching…')
            : !showingEmptyState && results.length === 0
            ? React.createElement('div', { className: 'flex flex-col items-center justify-center py-8 px-6 text-center space-y-3' },
                React.createElement(Search, { className: 'h-8 w-8 text-muted-foreground/40' }),
                React.createElement('div', null,
                  React.createElement('div', { className: 'text-sm font-medium' }, 'No matches found'),
                  React.createElement('div', { className: 'text-xs text-muted-foreground mt-0.5' }, `Nothing matches "${query}"`),
                ),
                onCreateCustom && React.createElement(Button, {
                  size: 'sm',
                  onClick: () => { onOpenChange(false); onCreateCustom(query); },
                },
                  React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
                  `Create "${query}" as custom exercise`,
                ),
              )
            : !showingEmptyState
            ? React.createElement('div', { className: 'px-2' },
                ...results.map(ex =>
                  React.createElement(ExerciseRow, {
                    key: ex.id, exercise: ex,
                    favorite: favorites.includes(ex.id),
                    onSelect: handleSelect,
                    onToggleFavorite: toggleFavorite,
                  }),
                ),
              )
            : React.createElement('div', { className: 'px-2' },
                favoriteExercises.length > 0 && React.createElement(React.Fragment, null,
                  React.createElement('div', { className: 'text-xs font-medium text-muted-foreground px-3 py-2' }, 'Favorites'),
                  ...favoriteExercises.map(ex =>
                    React.createElement(ExerciseRow, {
                      key: `fav:${ex.id}`, exercise: ex, favorite: true,
                      onSelect: handleSelect, onToggleFavorite: toggleFavorite,
                    }),
                  ),
                ),
                frequentExercises.length > 0 && React.createElement(React.Fragment, null,
                  React.createElement('div', { className: 'text-xs font-medium text-muted-foreground px-3 py-2 mt-1' }, 'Frequently Used'),
                  ...frequentExercises.map(ex =>
                    React.createElement(ExerciseRow, {
                      key: `freq:${ex.id}`, exercise: ex,
                      favorite: favorites.includes(ex.id),
                      onSelect: handleSelect, onToggleFavorite: toggleFavorite,
                    }),
                  ),
                ),
                recents.length > 0 && React.createElement(React.Fragment, null,
                  React.createElement('div', { className: 'text-xs font-medium text-muted-foreground px-3 py-2 mt-1' }, 'Recent'),
                  ...recents.slice(0, 10).map(ex =>
                    React.createElement(ExerciseRow, {
                      key: `recent:${ex.id}`, exercise: ex,
                      favorite: favorites.includes(ex.id),
                      onSelect: handleSelect, onToggleFavorite: toggleFavorite,
                    }),
                  ),
                ),
                favoriteExercises.length === 0 && frequentExercises.length === 0 && recents.length === 0 && React.createElement('div', {
                  className: 'text-xs text-muted-foreground text-center py-6',
                }, 'Start typing to search the catalog.'),
              ),
        ),

        onCreateCustom && React.createElement(Separator, { className: 'my-2' }),
        onCreateCustom && React.createElement(Button, {
          variant: 'outline',
          className: 'w-full',
          onClick: () => { onOpenChange(false); onCreateCustom(query.trim() || undefined); },
        },
          React.createElement(Plus, { className: 'h-4 w-4 mr-2' }),
          'Create Custom Exercise',
        ),
      ),
    );
  };
}
