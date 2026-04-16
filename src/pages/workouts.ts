import type { SharedDependencies, Exercise, ExerciseEntry, ExerciseSet, WorkoutTemplate } from '../types';
import { toDateKey } from '../utils/date-helpers';
import { createUseDiary, createUseExerciseSearch, getStorage } from '../hooks/use-fitness-store';
import { findCatalogExercise } from '../api/exercise-catalog';
import { createExerciseLogger } from '../components/exercise-logger';
import { createExerciseHistory } from '../components/exercise-history';
import { createCustomExerciseForm } from '../components/custom-exercise-form';
import { createWorkoutTemplatesSection } from '../components/workout-templates-section';
import { createScopedShadcn } from '../design-system/scoped-shadcn';
import {
  createPageHeader,
  createSegmentedControl,
  createSignatureCard,
  createSemanticBadge,
} from '../design-system/primitives';
import { SIG_PALETTE } from '../theme/palette';

type Section = 'browse' | 'templates' | 'history' | 'custom';

const SECTION_OPTIONS: { value: Section; label: string; icon: string }[] = [
  { value: 'browse', label: 'Browse', icon: 'Search' },
  { value: 'templates', label: 'Templates', icon: 'ListPlus' },
  { value: 'history', label: 'History', icon: 'TrendingUp' },
  { value: 'custom', label: 'Custom', icon: 'Plus' },
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

export function createWorkoutsPage(Shared: SharedDependencies) {
  const { React, Input, Button, lucideIcons } = Shared;
  const { Search: SearchIcon, Plus, Dumbbell, Trash2 } = lucideIcons;

  const Scoped = createScopedShadcn(Shared);
  const PageHeader = createPageHeader(Shared);
  const SegmentedControl = createSegmentedControl(Shared);
  const SignatureCard = createSignatureCard(Shared);
  const SemanticBadge = createSemanticBadge(Shared);

  const useExerciseSearch = createUseExerciseSearch(Shared);
  const useDiary = createUseDiary(Shared);

  const ExerciseLogger = createExerciseLogger(Shared);
  const ExerciseHistoryDialog = createExerciseHistory(Shared);
  const CustomExerciseForm = createCustomExerciseForm(Shared);
  const WorkoutTemplatesSection = createWorkoutTemplatesSection(Shared);

  function BrowseSection({ onSelectExercise, onCreateCustom }: {
    onSelectExercise: (exercise: Exercise) => void;
    onCreateCustom: (queryHint?: string) => void;
  }) {
    const {
      query, setQuery, results, searching, catalogReady, catalogError,
      source, setSource, favorites, toggleFavorite, trackUsage,
    } = useExerciseSearch();

    const handleSelect = (ex: Exercise) => {
      trackUsage(ex);
      onSelectExercise(ex);
    };

    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      // Search input
      React.createElement('div', { style: { position: 'relative' } },
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
          className: 'h-10',
          style: { ...INPUT_STYLE, paddingLeft: 36 },
        }),
      ),

      // Source tabs
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
        ariaLabel: 'Source',
      }),

      !catalogReady && !catalogError && React.createElement('div', {
        style: { ...EYEBROW, textAlign: 'center', padding: '8px 0' },
      }, 'Loading catalog…'),
      catalogError && React.createElement('div', {
        style: { ...EYEBROW, color: 'var(--knf-alert)', textAlign: 'center', padding: '8px 0' },
      }, `Catalog unavailable: ${catalogError}`),

      // Result grid
      searching
        ? React.createElement('div', { style: { ...EYEBROW, textAlign: 'center', padding: '24px 0' } }, 'Searching…')
        : !query.trim()
        ? React.createElement(SignatureCard, { padding: 'lg' },
            React.createElement('div', {
              style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 8, padding: '20px 0',
              },
            },
              React.createElement(SearchIcon, {
                className: 'h-7 w-7',
                style: { color: 'var(--knf-muted)', opacity: 0.5 },
              }),
              React.createElement('div', {
                style: { fontSize: 13, color: 'var(--knf-ink)', fontWeight: 500 },
              }, 'Search the exercise catalog'),
              React.createElement('div', {
                style: {
                  fontSize: 12, color: 'var(--knf-muted)',
                  fontFamily: 'var(--knf-font-body)', textAlign: 'center',
                  maxWidth: 380,
                },
              }, 'Browse ~800 exercises from the public yuhonas catalog, or pull from wger / API-Ninjas.'),
            ),
          )
        : results.length === 0
        ? React.createElement(SignatureCard, { padding: 'lg' },
            React.createElement('div', {
              style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 8, padding: '20px 0',
              },
            },
              React.createElement('div', {
                style: { fontSize: 13, color: 'var(--knf-ink)' },
              }, `No matches for "${query}"`),
              React.createElement(Button, {
                size: 'sm',
                onClick: () => onCreateCustom(query),
                style: {
                  background: 'var(--knf-hero)',
                  color: 'var(--knf-hero-ink)',
                  border: '1px solid var(--knf-hero-edge)',
                },
              },
                React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
                'Create as custom',
              ),
            ),
          )
        : React.createElement('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 8,
            },
          },
            ...results.map(ex => {
              const isFav = favorites.includes(ex.id);
              const thumb = ex.images[0];
              const subtitle = [
                ex.primaryMuscles.slice(0, 2).join(', '),
                ex.equipment,
              ].filter(Boolean).join(' · ') || ex.category || '';
              return React.createElement(SignatureCard, { key: ex.id, padding: 'sm' },
                React.createElement('div', {
                  style: { display: 'flex', alignItems: 'center', gap: 10 },
                },
                  React.createElement('button', {
                    onClick: () => handleSelect(ex),
                    style: {
                      display: 'flex', alignItems: 'center', gap: 10, flex: 1,
                      minWidth: 0, textAlign: 'left', background: 'transparent',
                      border: 'none', padding: 0, cursor: 'pointer',
                    },
                  },
                    thumb
                      ? React.createElement('img', {
                          src: thumb, alt: '', loading: 'lazy',
                          onError: (e: any) => { e.currentTarget.style.visibility = 'hidden'; },
                          style: {
                            width: 40, height: 40, objectFit: 'cover',
                            borderRadius: 'var(--knf-radius-sm)',
                            background: 'var(--knf-surface-2)',
                            border: '1px solid var(--knf-hairline)',
                            flexShrink: 0,
                          },
                        })
                      : React.createElement('div', {
                          style: {
                            width: 40, height: 40, flexShrink: 0,
                            borderRadius: 'var(--knf-radius-sm)',
                            background: 'var(--knf-surface-2)',
                            border: '1px solid var(--knf-hairline)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          },
                        }, React.createElement(Dumbbell, {
                          className: 'h-5 w-5',
                          style: { color: 'var(--knf-muted)' },
                        })),
                    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      React.createElement('div', {
                        style: {
                          fontSize: 13, fontWeight: 500, color: 'var(--knf-ink)',
                          whiteSpace: 'nowrap', overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        },
                      }, ex.name),
                      React.createElement('div', {
                        style: {
                          fontSize: 11, color: 'var(--knf-muted)',
                          fontFamily: 'var(--knf-font-mono)', marginTop: 2,
                          whiteSpace: 'nowrap', overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        },
                      }, subtitle),
                    ),
                  ),
                  React.createElement(Button, {
                    variant: 'ghost', size: 'icon', className: 'h-7 w-7',
                    onClick: () => toggleFavorite(ex.id),
                    'aria-label': isFav ? 'Unfavorite' : 'Favorite',
                    style: { flexShrink: 0 },
                  }, React.createElement(lucideIcons.Star, {
                    className: 'h-3.5 w-3.5',
                    style: {
                      fill: isFav ? 'var(--knf-hero)' : 'none',
                      color: isFav ? 'var(--knf-hero-ink)' : 'var(--knf-muted)',
                      strokeWidth: 2,
                    },
                  })),
                ),
              );
            }),
          ),
    );
  }

  function HistorySection({ onOpenHistory }: {
    onOpenHistory: (id: string, name: string) => void;
  }) {
    const [items, setItems] = React.useState<Array<{ id: string; name: string; sessions: number }>>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      let cancelled = false;
      (async () => {
        const s = getStorage();
        let historyKeys: string[] = [];
        try {
          const apiModule = await import('../hooks/use-fitness-store');
          const pluginApi = apiModule.getApi();
          historyKeys = (await pluginApi.storage.keys()).filter((k: string) => k.startsWith('exercise-history:'));
        } catch {
          historyKeys = [];
        }
        const customs = await s.getCustomExercises();
        const customsById = new Map(customs.map(c => [c.id, c]));
        const results: Array<{ id: string; name: string; sessions: number }> = [];
        for (const k of historyKeys) {
          const id = k.replace('exercise-history:', '');
          const list = await s.getExerciseHistory(id);
          const resolved = customsById.get(id) ?? findCatalogExercise(id);
          const name = resolved?.name ?? id.replace(/^(custom|yuhonas|wger|api-ninjas):/, '');
          results.push({ id, name, sessions: list.length });
        }
        results.sort((a, b) => b.sessions - a.sessions);
        if (!cancelled) {
          setItems(results);
          setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, []);

    if (loading) {
      return React.createElement('div', { style: { ...EYEBROW, textAlign: 'center', padding: '32px 0' } }, 'Loading history…');
    }

    if (items.length === 0) {
      return React.createElement(SignatureCard, { padding: 'lg' },
        React.createElement('div', {
          style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 10, padding: '24px 0', textAlign: 'center',
          },
        },
          React.createElement(lucideIcons.TrendingUp, {
            className: 'h-8 w-8',
            style: { color: 'var(--knf-muted)', opacity: 0.5 },
          }),
          React.createElement('div', {
            style: { fontSize: 13, color: 'var(--knf-ink)', fontWeight: 500 },
          }, 'No exercise history yet'),
          React.createElement('div', {
            style: {
              fontSize: 12, color: 'var(--knf-muted)',
              fontFamily: 'var(--knf-font-body)', maxWidth: 360,
            },
          }, 'Log strength or cardio from the Browse tab to start building a progression history.'),
        ),
      );
    }

    return React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 10,
      },
    },
      ...items.map(item =>
        React.createElement(SignatureCard, { key: item.id, padding: 'md', interactive: true, onClick: () => onOpenHistory(item.id, item.name) },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            React.createElement('div', {
              style: {
                width: 36, height: 36, flexShrink: 0,
                borderRadius: 'var(--knf-radius-sm)',
                background: 'var(--knf-hero-wash)',
                border: '1px solid var(--knf-hero-edge)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              },
            }, React.createElement(lucideIcons.TrendingUp, {
              className: 'h-4 w-4',
              style: { color: SIG_PALETTE.calBurn },
            })),
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', {
                style: {
                  fontSize: 13, fontWeight: 500, color: 'var(--knf-ink)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                },
              }, item.name),
              React.createElement('div', {
                style: {
                  fontSize: 11, color: 'var(--knf-muted)',
                  fontFamily: 'var(--knf-font-mono)', marginTop: 2,
                },
              }, `${item.sessions} session${item.sessions === 1 ? '' : 's'}`),
            ),
          ),
        ),
      ),
    );
  }

  function CustomSection({ createOpen, setCreateOpen, onLogExercise }: {
    createOpen: boolean;
    setCreateOpen: (v: boolean) => void;
    onLogExercise: (ex: Exercise) => void;
  }) {
    const [customs, setCustoms] = React.useState<Exercise[]>([]);
    const [loading, setLoading] = React.useState(true);

    const refresh = React.useCallback(async () => {
      setLoading(true);
      const list = await getStorage().getCustomExercises();
      setCustoms(list);
      setLoading(false);
    }, []);

    React.useEffect(() => { refresh(); }, [refresh]);

    const handleDelete = async (id: string) => {
      await getStorage().deleteCustomExercise(id);
      await refresh();
    };

    const handleCreated = async (ex: Exercise) => {
      await refresh();
      onLogExercise(ex);
    };

    return React.createElement('div', null,
      loading
        ? React.createElement('div', { style: { ...EYEBROW, textAlign: 'center', padding: '32px 0' } }, 'Loading custom exercises…')
        : customs.length === 0
        ? React.createElement(SignatureCard, { padding: 'lg' },
            React.createElement('div', {
              style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 10, padding: '24px 0', textAlign: 'center',
              },
            },
              React.createElement(lucideIcons.Plus, {
                className: 'h-8 w-8',
                style: { color: 'var(--knf-muted)', opacity: 0.5 },
              }),
              React.createElement('div', {
                style: { fontSize: 13, color: 'var(--knf-ink)', fontWeight: 500 },
              }, 'No custom exercises yet'),
              React.createElement('div', {
                style: {
                  fontSize: 12, color: 'var(--knf-muted)',
                  fontFamily: 'var(--knf-font-body)', maxWidth: 380,
                },
              }, 'Tap "New" above to define an exercise the catalog doesn\u2019t have.'),
            ),
          )
        : React.createElement('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 10,
            },
          },
            ...customs.map(ex =>
              React.createElement(SignatureCard, { key: ex.id, padding: 'md' },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                  React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('div', {
                      style: {
                        fontSize: 13, fontWeight: 500, color: 'var(--knf-ink)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      },
                    }, ex.name),
                    React.createElement('div', {
                      style: {
                        fontSize: 11, color: 'var(--knf-muted)',
                        fontFamily: 'var(--knf-font-mono)', marginTop: 2,
                      },
                    }, [ex.primaryMuscles.slice(0, 2).join(', '), ex.equipment].filter(Boolean).join(' · ') || ex.category || '—'),
                  ),
                  React.createElement(SemanticBadge, { accent: 'protein', variant: 'soft' }, ex.category ?? 'custom'),
                  React.createElement(Button, {
                    variant: 'ghost', size: 'icon', className: 'h-7 w-7',
                    onClick: () => handleDelete(ex.id),
                    'aria-label': 'Delete custom exercise',
                  }, React.createElement(Trash2, {
                    className: 'h-3.5 w-3.5',
                    style: { color: 'var(--knf-alert)' },
                  })),
                ),
              ),
            ),
          ),
      React.createElement(CustomExerciseForm, {
        open: createOpen,
        onOpenChange: setCreateOpen,
        onCreated: handleCreated,
      }),
    );
  }

  return function WorkoutsPage() {
    const [section, setSectionState] = React.useState<Section>(() => {
      if (typeof window === 'undefined') return 'browse';
      const sp = new URLSearchParams(window.location.search);
      const s = sp.get('section') as Section | null;
      if (s && SECTION_OPTIONS.some(o => o.value === s)) return s;
      return 'browse';
    });

    // Tick-driven "New" button state for sections that own their own dialogs.
    const [customCreateOpen, setCustomCreateOpen] = React.useState(false);
    const [templatesSaveTick, setTemplatesSaveTick] = React.useState(0);

    // Shared logger dialog — used by Browse, Templates (apply), and CustomSection (create + log)
    const [loggerOpen, setLoggerOpen] = React.useState(false);
    const [loggerExercise, setLoggerExercise] = React.useState<Exercise | undefined>();
    const [loggerEntry, setLoggerEntry] = React.useState<ExerciseEntry | undefined>();

    // Shared history dialog
    const [historyOpen, setHistoryOpen] = React.useState(false);
    const [historyTarget, setHistoryTarget] = React.useState<{ id: string; name: string } | null>(null);

    // Today's diary — used for save-template and apply-template
    const today = toDateKey(new Date());
    const diary = useDiary(today);

    // URL sync
    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      const sp = new URLSearchParams(window.location.search);
      sp.set('tab', 'workouts');
      sp.set('section', section);
      const next = `${window.location.pathname}?${sp.toString()}`;
      if (next !== window.location.pathname + window.location.search) {
        window.history.replaceState(null, '', next);
      }
    }, [section]);

    const openLoggerForExercise = (ex: Exercise) => {
      setLoggerExercise(ex);
      setLoggerEntry(undefined);
      setLoggerOpen(true);
    };

    const handleLoggerSubmit = async (patch: Partial<ExerciseEntry>, entryId?: string) => {
      if (entryId) {
        await diary.updateExerciseEntry(entryId, patch);
      } else {
        const kind = (patch.kind ?? 'cardio') as 'strength' | 'cardio';
        await diary.addExerciseEntry({
          name: patch.name ?? '',
          kind,
          exercise_id: patch.exercise_id,
          primaryMuscles: patch.primaryMuscles,
          sets: patch.sets,
          duration_min: patch.duration_min,
          distance: patch.distance,
          distance_unit: patch.distance_unit,
          calories_burned: patch.calories_burned,
          notes: patch.notes,
        });
      }
    };

    const fetchPreviousSets = async (exerciseId: string): Promise<ExerciseSet[] | null> => {
      const s = getStorage();
      const history = await s.getExerciseHistory(exerciseId);
      const sorted = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));
      for (const h of sorted) {
        if (h.date === today) continue;
        const log = await s.getExercise(h.date);
        const entry = log.entries.find(e => e.id === h.entry_id);
        if (entry?.sets?.length) return entry.sets;
      }
      return null;
    };

    const applyTemplate = async (template: WorkoutTemplate) => {
      for (const ex of template.exercises) {
        const isCustomRef = ex.exercise_id.startsWith('custom:');
        await diary.addExerciseEntry({
          exercise_id: isCustomRef ? undefined : ex.exercise_id,
          name: ex.name,
          kind: ex.kind,
          sets: ex.kind === 'strength' && ex.target_sets
            ? Array.from({ length: ex.target_sets }, () => ({
                reps: ex.target_reps ?? 8,
                weight: ex.target_weight,
              }))
            : undefined,
          duration_min: ex.kind === 'cardio' ? ex.target_duration_min : undefined,
        });
      }
    };

    const newButton = React.createElement('button', {
      type: 'button',
      onClick: () => {
        if (section === 'custom') setCustomCreateOpen(true);
        else if (section === 'templates') setTemplatesSaveTick(t => t + 1);
      },
      disabled: section === 'browse' || section === 'history',
      style: {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px',
        fontFamily: 'var(--knf-font-body)',
        fontWeight: 600, fontSize: 13,
        color: (section === 'browse' || section === 'history') ? 'var(--knf-muted)' : 'var(--knf-hero-ink)',
        background: (section === 'browse' || section === 'history') ? 'var(--knf-surface-2)' : 'var(--knf-hero)',
        border: `1px solid ${(section === 'browse' || section === 'history') ? 'var(--knf-hairline)' : 'var(--knf-hero-edge)'}`,
        borderRadius: 'var(--knf-radius-pill)',
        cursor: (section === 'browse' || section === 'history') ? 'not-allowed' : 'pointer',
        boxShadow: (section === 'browse' || section === 'history') ? 'none' : 'var(--knf-shadow-sm)',
        transition: 'transform var(--knf-duration-1) var(--knf-ease)',
      },
    },
      React.createElement(Plus, { style: { width: 14, height: 14 } }),
      'New',
    );

    return React.createElement('div', {
      style: {
        flex: 1, alignSelf: 'stretch', width: '100%', minHeight: '100%',
        background: 'var(--knf-bg)', display: 'flex', flexDirection: 'column',
      },
    },
      React.createElement('div', {
        style: {
          flex: 1, width: '100%', padding: '32px 40px 64px',
          display: 'flex', flexDirection: 'column', gap: 20,
          maxWidth: 1360, margin: '0 auto', boxSizing: 'border-box',
        },
      },
        React.createElement(PageHeader, {
          eyebrow: 'YOUR WORKOUTS',
          title: 'Workouts',
          trailing: newButton,
        }),
        React.createElement('div', null,
          React.createElement(SegmentedControl, {
            value: section,
            onValueChange: (v: string) => setSectionState(v as Section),
            options: SECTION_OPTIONS,
            size: 'md',
            ariaLabel: 'Workouts section',
          }),
        ),
        React.createElement('div', { style: { marginTop: 4, flex: 1 } },
          section === 'browse'
            ? React.createElement(BrowseSection, {
                onSelectExercise: openLoggerForExercise,
                onCreateCustom: (hint?: string) => {
                  setSectionState('custom');
                  setCustomCreateOpen(true);
                },
              })
            : null,
          section === 'templates'
            ? React.createElement(WorkoutTemplatesSection, {
                todayEntries: diary.exercise.entries,
                saveTick: templatesSaveTick,
                onApply: applyTemplate,
              })
            : null,
          section === 'history'
            ? React.createElement(HistorySection, {
                onOpenHistory: (id, name) => {
                  setHistoryTarget({ id, name });
                  setHistoryOpen(true);
                },
              })
            : null,
          section === 'custom'
            ? React.createElement(CustomSection, {
                createOpen: customCreateOpen,
                setCreateOpen: setCustomCreateOpen,
                onLogExercise: openLoggerForExercise,
              })
            : null,
        ),
      ),

      // Shared dialogs
      React.createElement(ExerciseLogger, {
        open: loggerOpen,
        onOpenChange: setLoggerOpen,
        mode: loggerEntry ? 'edit' : 'create',
        exercise: loggerExercise,
        entry: loggerEntry,
        onSubmit: handleLoggerSubmit,
        onPreviousSetsRequest: fetchPreviousSets,
      }),

      historyTarget && React.createElement(ExerciseHistoryDialog, {
        open: historyOpen,
        onOpenChange: setHistoryOpen,
        exerciseId: historyTarget.id,
        exerciseName: historyTarget.name,
      }),
    );
  };
}
