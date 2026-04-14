import type { SharedDependencies } from '../types';
import { toDateKey } from '../utils/date-helpers';

/**
 * Streak widget — big numeric + 7-dot row for the last week's logged status.
 */
export function createStreakWidget(Shared: SharedDependencies) {
  const { React, lucideIcons, dateFns } = Shared;
  const { Flame } = lucideIcons;

  return function StreakWidget() {
    const [streak, setStreak] = React.useState<number | null>(null);
    const [last7, setLast7] = React.useState<boolean[]>([]);

    React.useEffect(() => {
      let alive = true;
      (async () => {
        const keys =
          (await (window as any).electronAPI?.pluginsStorageKeys?.(
            'knosys-fitness',
          )) ?? [];
        const dates = new Set<string>();
        for (const key of keys as string[]) {
          const m = key.match(
            /^(?:log|exercise|weight|water|wellness):(\d{4}-\d{2}-\d{2})/,
          );
          if (m) dates.add(m[1]);
        }
        let count = 0;
        for (let i = 0; ; i++) {
          const d = toDateKey(dateFns.subDays(new Date(), i));
          if (dates.has(d)) count++;
          else break;
        }
        const days: boolean[] = [];
        for (let i = 6; i >= 0; i--) {
          const k = toDateKey(dateFns.subDays(new Date(), i));
          days.push(dates.has(k));
        }
        if (alive) {
          setStreak(count);
          setLast7(days);
        }
      })();
      return () => {
        alive = false;
      };
    }, [dateFns]);

    if (streak === null) {
      return React.createElement(
        'div',
        {
          className: 'knosys-fitness-root knosys-fitness-widget',
          style: { fontSize: 12, color: 'var(--knf-muted)' },
        },
        '…',
      );
    }

    return React.createElement(
      'div',
      {
        className: 'knosys-fitness-root knosys-fitness-widget',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          minWidth: 220,
        },
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            },
          },
          React.createElement(Flame, {
            style: {
              width: 12,
              height: 12,
              color: 'var(--knf-cal-burn)',
            },
          }),
          React.createElement(
            'span',
            {
              className: 'knf-eyebrow',
              style: { fontSize: 10 },
            },
            'STREAK',
          ),
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
            },
          },
          React.createElement(
            'span',
            {
              style: {
                fontFamily: 'var(--knf-font-display)',
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--knf-ink)',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              },
            },
            streak,
          ),
          React.createElement(
            'span',
            {
              style: {
                fontSize: 10,
                color: 'var(--knf-muted)',
                fontFamily: 'var(--knf-font-mono)',
              },
            },
            streak === 1 ? 'day' : 'days',
          ),
        ),
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            gap: 4,
          },
        },
        ...last7.map((logged, i) =>
          React.createElement('div', {
            key: i,
            'aria-hidden': true,
            style: {
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: logged
                ? 'var(--knf-hero-ink)'
                : 'var(--knf-hairline)',
            },
          }),
        ),
      ),
    );
  };
}
