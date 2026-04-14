import type { SharedDependencies } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey } from '../utils/date-helpers';
import { createSparkline } from '../design-system/primitives';
import { SIG_PALETTE } from '../theme/palette';

/**
 * Weight widget — current weight + delta + 14-day Sparkline.
 */
export function createWeightWidget(Shared: SharedDependencies) {
  const { React, lucideIcons, dateFns } = Shared;
  const { Scale, TrendingDown, TrendingUp, Minus } = lucideIcons;

  const Sparkline = createSparkline(Shared);

  return function WeightWidget() {
    const [data, setData] = React.useState<
      { date: string; weight_kg: number }[]
    >([]);

    React.useEffect(() => {
      let alive = true;
      const s = getStorage();
      const end = toDateKey(new Date());
      const start = toDateKey(dateFns.subDays(new Date(), 14));
      s.getWeightRange(start, end).then((d) => {
        if (alive) setData(d);
      });
      return () => {
        alive = false;
      };
    }, [dateFns]);

    if (data.length === 0) {
      return React.createElement(
        'div',
        {
          className: 'knosys-fitness-root knosys-fitness-widget',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--knf-muted)',
            fontSize: 12,
            fontFamily: 'var(--knf-font-body)',
          },
        },
        React.createElement(Scale, { style: { width: 14, height: 14 } }),
        React.createElement('span', null, 'No weigh-ins yet'),
      );
    }

    const latest = data[data.length - 1].weight_kg;
    const oldest = data[0].weight_kg;
    const trend = latest - oldest;
    const TrendIcon =
      trend < -0.05 ? TrendingDown : trend > 0.05 ? TrendingUp : Minus;
    const trendColor =
      trend < -0.05
        ? SIG_PALETTE.weightDown
        : trend > 0.05
          ? SIG_PALETTE.weightUp
          : SIG_PALETTE.muted;

    return React.createElement(
      'div',
      {
        className: 'knosys-fitness-root knosys-fitness-widget',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          minWidth: 220,
        },
      },
      React.createElement(
        'div',
        {
          style: {
            flex: 1,
            minWidth: 0,
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
          React.createElement(Scale, {
            style: {
              width: 12,
              height: 12,
              color: 'var(--knf-muted)',
            },
          }),
          React.createElement(
            'span',
            {
              className: 'knf-eyebrow',
              style: { fontSize: 10 },
            },
            'WEIGHT',
          ),
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'baseline',
              gap: 5,
            },
          },
          React.createElement(
            'span',
            {
              style: {
                fontFamily: 'var(--knf-font-display)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--knf-ink)',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              },
            },
            latest.toFixed(1),
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
            'kg',
          ),
          data.length > 1 &&
            React.createElement(
              'span',
              {
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  fontSize: 10,
                  fontFamily: 'var(--knf-font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  color: trendColor,
                  marginLeft: 4,
                },
              },
              React.createElement(TrendIcon, {
                style: { width: 10, height: 10 },
              }),
              `${trend > 0 ? '+' : ''}${trend.toFixed(1)}`,
            ),
        ),
      ),
      data.length >= 2 &&
        React.createElement(Sparkline, {
          values: data.map((d) => d.weight_kg),
          color: trend < 0 ? 'weight-down' : 'weight-up',
          width: 80,
          height: 28,
          strokeWidth: 1.5,
          showLastDot: true,
        }),
    );
  };
}
