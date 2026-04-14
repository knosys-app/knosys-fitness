import type { SharedDependencies } from '../../types';
import type { SemanticColor } from '../../theme/palette';
import { semanticToHex } from '../../theme/palette';

export interface DataBarProps {
  value: number;
  max: number;
  accent: SemanticColor;
  /** Optional label rendered above the bar. */
  label?: string;
  /** When true, shows "{value} / {max}" on the right of the label row. */
  showValue?: boolean;
  /** When set (and != max), renders a 2px vertical tick at goal position. */
  goal?: number;
  /** When false, fills immediately at final width. Default true. */
  animate?: boolean;
  /** Height in px. Default 6. */
  height?: number;
  /** Optional formatter for the displayed value string. */
  formatValue?: (v: number) => string;
  className?: string;
  style?: any;
}

export function createDataBar(Shared: SharedDependencies) {
  const { React, cn } = Shared;

  return function DataBar(props: DataBarProps) {
    const {
      value,
      max,
      accent,
      label,
      showValue = false,
      goal,
      animate = true,
      height = 6,
      formatValue,
      className,
      style,
    } = props;

    const [animated, setAnimated] = React.useState(!animate);

    React.useEffect(() => {
      if (!animate) return;
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        setAnimated(true);
        return;
      }
      const raf = window.requestAnimationFrame(() => {
        setAnimated(true);
      });
      return () => window.cancelAnimationFrame(raf);
    }, [animate]);

    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const over = value > max;
    const hex = semanticToHex(accent);

    const goalPct =
      goal !== undefined && max > 0 && goal !== max
        ? Math.min(Math.max((goal / max) * 100, 0), 100)
        : null;

    const fmt = formatValue ?? ((v: number) => String(Math.round(v)));

    return React.createElement(
      'div',
      {
        className: cn(className),
        style: { display: 'flex', flexDirection: 'column', gap: 6, ...style },
      },
      (label || showValue) &&
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 8,
              fontSize: 12,
              lineHeight: 1.2,
            },
          },
          label
            ? React.createElement(
                'span',
                {
                  style: {
                    color: 'var(--knf-muted)',
                    fontFamily: 'var(--knf-font-body)',
                  },
                },
                label,
              )
            : React.createElement('span', null),
          showValue
            ? React.createElement(
                'span',
                {
                  style: {
                    fontFamily: 'var(--knf-font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                    color: over ? 'var(--knf-alert)' : 'var(--knf-ink)',
                    fontWeight: 500,
                  },
                },
                `${fmt(value)} / ${fmt(max)}`,
              )
            : null,
        ),
      React.createElement(
        'div',
        {
          style: {
            position: 'relative',
            height,
            width: '100%',
            background: 'var(--knf-surface-2)',
            borderRadius: 'var(--knf-radius-pill)',
            overflow: 'visible',
          },
          role: 'progressbar',
          'aria-valuenow': value,
          'aria-valuemin': 0,
          'aria-valuemax': max,
          'aria-label': label,
        },
        // Track fill (clipped to bar radius)
        React.createElement(
          'div',
          {
            style: {
              position: 'absolute',
              inset: 0,
              borderRadius: 'var(--knf-radius-pill)',
              overflow: 'hidden',
            },
          },
          React.createElement('div', {
            style: {
              height: '100%',
              width: animated ? `${pct}%` : '0%',
              background: over ? 'var(--knf-alert)' : hex,
              borderRadius: 'var(--knf-radius-pill)',
              transition:
                'width var(--knf-duration-3) var(--knf-ease-out), background-color var(--knf-duration-1) var(--knf-ease)',
            },
          }),
        ),
        // Goal tick
        goalPct !== null
          ? React.createElement('div', {
              'aria-hidden': true,
              style: {
                position: 'absolute',
                top: -2,
                bottom: -2,
                left: `${goalPct}%`,
                width: 2,
                background: 'var(--knf-ink)',
                borderRadius: 1,
                opacity: 0.55,
                transform: 'translateX(-1px)',
              },
            })
          : null,
      ),
    );
  };
}
