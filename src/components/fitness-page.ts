import type { SharedDependencies } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { createOnboarding } from './onboarding';
import { createOverviewPage } from '../pages/overview';
import { createTodayPage } from '../pages/today';
import { createTrendsPage } from '../pages/trends';
import { createLibraryPage } from '../pages/library';
import { createWorkoutsPage } from '../pages/workouts';

type TabId = 'overview' | 'today' | 'trends' | 'library' | 'workouts';

const TAB_IDS: TabId[] = ['overview', 'today', 'trends', 'library', 'workouts'];

const TAB_LABELS: Record<TabId, { label: string; icon: string }> = {
  overview: { label: 'Overview', icon: 'LayoutDashboard' },
  today: { label: 'Today', icon: 'Utensils' },
  trends: { label: 'Trends', icon: 'TrendingUp' },
  library: { label: 'Library', icon: 'BookOpen' },
  workouts: { label: 'Workouts', icon: 'Dumbbell' },
};

const MONTH_ABBR = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

function parseTabFromLocation(): TabId {
  if (typeof window === 'undefined') return 'overview';
  try {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t && (TAB_IDS as string[]).includes(t)) return t as TabId;
  } catch {
    /* noop */
  }
  return 'overview';
}

function writeTabToLocation(tab: TabId) {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState({}, '', next);
  } catch {
    /* noop */
  }
}

function formatTodayEyebrow(d: Date): string {
  return `${MONTH_ABBR[d.getMonth()]} \u00B7 ${d.getDate()} \u00B7 ${d.getFullYear()}`;
}

export function createFitnessPage(Shared: SharedDependencies) {
  const { React, lucideIcons } = Shared;
  const { Dumbbell } = lucideIcons;

  const Onboarding = createOnboarding(Shared);
  const OverviewPage = createOverviewPage(Shared);
  const TodayPage = createTodayPage(Shared);
  const TrendsPage = createTrendsPage(Shared);
  const LibraryPage = createLibraryPage(Shared);
  const WorkoutsPage = createWorkoutsPage(Shared);

  return function FitnessPage() {
    const [setupComplete, setSetupComplete] = React.useState<boolean | null>(
      null,
    );
    const [activeTab, setActiveTab] = React.useState<TabId>(() =>
      parseTabFromLocation(),
    );
    const [fadeKey, setFadeKey] = React.useState(0);
    const now = React.useMemo(() => new Date(), []);

    // Profile probe — decides whether to show onboarding
    React.useEffect(() => {
      let alive = true;
      getStorage()
        .getProfile()
        .then((profile) => {
          if (alive) setSetupComplete(profile.setup_complete === true);
        })
        .catch(() => {
          if (alive) setSetupComplete(false);
        });
      return () => {
        alive = false;
      };
    }, []);

    // Listen for popstate so back/forward button updates tabs
    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      const handler = () => {
        setActiveTab(parseTabFromLocation());
        setFadeKey((k) => k + 1);
      };
      window.addEventListener('popstate', handler);
      return () => window.removeEventListener('popstate', handler);
    }, []);

    const handleTabChange = React.useCallback((next: TabId) => {
      setActiveTab((prev) => {
        if (prev === next) return prev;
        writeTabToLocation(next);
        setFadeKey((k) => k + 1);
        return next;
      });
    }, []);

    // ------------------------------------------------------------------
    // Loading state — signature typography, chartreuse dot pulse
    // ------------------------------------------------------------------
    if (setupComplete === null) {
      return React.createElement(
        'div',
        {
          className: 'knosys-fitness-root flex flex-col h-full',
          style: {
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--knf-bg)',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            },
          },
          React.createElement('div', {
            className: 'knf-pulse',
            'aria-hidden': true,
            style: {
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--knf-hero)',
              boxShadow: '0 0 0 4px var(--knf-hero-wash)',
            },
          }),
          React.createElement(
            'div',
            {
              className: 'knf-display',
              style: {
                fontFamily: 'var(--knf-font-display)',
                fontSize: 'var(--knf-text-h4)',
                color: 'var(--knf-ink)',
              },
            },
            'Fitness',
          ),
          React.createElement(
            'div',
            {
              className: 'knf-eyebrow',
              style: { letterSpacing: '0.2em' },
            },
            'LOADING…',
          ),
        ),
      );
    }

    // ------------------------------------------------------------------
    // Onboarding gate
    // ------------------------------------------------------------------
    if (!setupComplete) {
      return React.createElement(
        'div',
        { className: 'knosys-fitness-root h-full' },
        React.createElement(Onboarding, {
          onComplete: () => setSetupComplete(true),
        }),
      );
    }

    // ------------------------------------------------------------------
    // Main shell
    // ------------------------------------------------------------------
    const quickLog = () => handleTabChange('today');

    const activePage = (() => {
      switch (activeTab) {
        case 'overview':
          return React.createElement(OverviewPage, { onQuickLog: quickLog });
        case 'today':
          return React.createElement(TodayPage, null);
        case 'trends':
          return React.createElement(TrendsPage, null);
        case 'library':
          return React.createElement(LibraryPage, null);
        case 'workouts':
          return React.createElement(WorkoutsPage, null);
        default:
          return React.createElement(OverviewPage, { onQuickLog: quickLog });
      }
    })();

    return React.createElement(
      'div',
      {
        className: 'knosys-fitness-root flex flex-col h-full',
        // Explicit viewport-height floor guarantees the bone canvas fills
        // the host <main> area even when the percentage-height chain from
        // SidebarProvider \u2192 main \u2192 plugin-root doesn't resolve.
        style: {
          background: 'var(--knf-bg)',
          height: '100%',
          minHeight: '100svh',
        },
      },
      // -------- Plugin identity strip (tiny eyebrow + date) --------
      React.createElement(
        'div',
        {
          style: {
            flexShrink: 0,
            padding: '14px 32px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            },
          },
          React.createElement(Dumbbell, {
            style: {
              width: 14,
              height: 14,
              color: 'var(--knf-hero-ink)',
            },
          }),
          React.createElement(
            'span',
            {
              className: 'knf-eyebrow',
              style: {
                fontFamily: 'var(--knf-font-mono)',
                fontSize: 11,
                letterSpacing: '0.2em',
                color: 'var(--knf-hero-ink)',
                fontWeight: 600,
              },
            },
            'FITNESS',
          ),
        ),
        React.createElement(
          'div',
          {
            className: 'knf-eyebrow',
            style: {
              fontFamily: 'var(--knf-font-mono)',
              fontSize: 11,
              letterSpacing: '0.15em',
              color: 'var(--knf-muted)',
            },
          },
          formatTodayEyebrow(now),
        ),
      ),
      // -------- Tab navigation --------
      React.createElement(
        'div',
        {
          style: {
            flexShrink: 0,
            padding: '8px 32px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            borderBottom: '1px solid var(--knf-hairline)',
          },
        },
        ...TAB_IDS.map((id) => {
          const meta = TAB_LABELS[id];
          const active = id === activeTab;
          const Icon = (lucideIcons as any)[meta.icon];
          return React.createElement(
            'button',
            {
              key: id,
              type: 'button',
              role: 'tab',
              'aria-selected': active,
              onClick: () => handleTabChange(id),
              style: {
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                border: 'none',
                background: active
                  ? 'var(--knf-hero-wash)'
                  : 'transparent',
                color: active ? 'var(--knf-hero-ink)' : 'var(--knf-muted)',
                fontSize: 13,
                fontFamily: 'var(--knf-font-body)',
                fontWeight: active ? 600 : 500,
                cursor: active ? 'default' : 'pointer',
                borderTopLeftRadius: 'var(--knf-radius-sm)',
                borderTopRightRadius: 'var(--knf-radius-sm)',
                borderBottom: active
                  ? '2px solid var(--knf-hero-edge)'
                  : '2px solid transparent',
                marginBottom: -1,
                transition:
                  'background-color 180ms var(--knf-ease), color 180ms var(--knf-ease), border-color 180ms var(--knf-ease)',
                letterSpacing: '0.01em',
              },
            },
            Icon
              ? React.createElement(Icon, {
                  style: { width: 16, height: 16 },
                })
              : null,
            meta.label,
          );
        }),
      ),
      // -------- Content area (cross-fade) --------
      React.createElement(
        'div',
        {
          style: {
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          },
        },
        React.createElement(
          'div',
          {
            key: `page-${activeTab}-${fadeKey}`,
            style: {
              flex: 1,
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              animation: 'knfFadeIn 180ms var(--knf-ease-out) forwards',
              willChange: 'opacity',
            },
          },
          activePage,
        ),
      ),
    );
  };
}
