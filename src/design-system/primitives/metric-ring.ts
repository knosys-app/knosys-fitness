import type { SharedDependencies } from '../../types';
import type { SemanticColor } from '../../theme/palette';
import { semanticToHex, SIG_PALETTE } from '../../theme/palette';

export interface MetricRingSegment {
  value: number;
  max: number;
  /** Semantic color key OR raw hex/CSS color. */
  color: SemanticColor | string;
  label?: string;
}

export interface MetricRingProps {
  segments: MetricRingSegment[];
  /** Outer diameter in px. Default 128. */
  size?: number;
  /** Ring track color. Defaults to --knf-hero-wash. */
  trackColor?: string;
  /** Center label text (small, uppercase). */
  centerLabel?: string;
  /** Center value text (large, mono). */
  centerValue?: string | number;
  /** Center unit (small, after value). */
  centerUnit?: string;
  /** When false, draws at final state with no animation. Default true. */
  animate?: boolean;
  /** Staggered animation delay between rings, in ms. Default 120. */
  stagger?: number;
  /** Total draw duration per ring, in ms. Default 620. */
  duration?: number;
  className?: string;
}

function resolveColor(color: SemanticColor | string): string {
  const semanticKeys: SemanticColor[] = [
    'cal-burn',
    'protein',
    'carbs',
    'fat',
    'hydration',
    'steps',
    'sleep',
    'heart',
    'weight-down',
    'weight-up',
    'hero',
    'success',
    'warning',
    'alert',
    'muted',
    'ink',
  ];
  if (typeof color === 'string' && (semanticKeys as string[]).includes(color)) {
    return semanticToHex(color as SemanticColor);
  }
  return color;
}

export function createMetricRing(Shared: SharedDependencies) {
  const { React } = Shared;

  return function MetricRing(props: MetricRingProps) {
    const {
      segments,
      size = 128,
      trackColor,
      centerLabel,
      centerValue,
      centerUnit,
      animate = true,
      stagger = 120,
      duration = 620,
      className,
    } = props;

    const [animatedCount, setAnimatedCount] = React.useState(animate ? 0 : segments.length);

    React.useEffect(() => {
      if (!animate) {
        setAnimatedCount(segments.length);
        return;
      }
      // Respect reduced motion
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        setAnimatedCount(segments.length);
        return;
      }
      const timers: number[] = [];
      segments.forEach((_, i) => {
        const t = window.setTimeout(() => {
          setAnimatedCount((c) => Math.max(c, i + 1));
        }, i * stagger + 60);
        timers.push(t);
      });
      return () => timers.forEach((t) => window.clearTimeout(t));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [segments.length, stagger, animate]);

    // Scale ring thickness to segment count.
    // 1 segment → 10px, 2 → 9, 3 → 8, 4 → 7, 5+ → 6.
    const thickness = Math.max(6, 11 - segments.length);
    const gap = 2; // space between rings

    const resolvedTrack = trackColor ?? 'var(--knf-hero-wash)';
    const center = size / 2;

    const rings = segments.map((seg, i) => {
      const r = center - thickness / 2 - i * (thickness + gap);
      if (r <= 0) return null;
      const circumference = 2 * Math.PI * r;
      const pct = seg.max > 0 ? Math.min(seg.value / seg.max, 1) : 0;
      const targetLen = pct * circumference;
      const isAnimated = animatedCount > i;
      const stroke = resolveColor(seg.color);

      return React.createElement(
        React.Fragment,
        { key: i },
        // Track
        React.createElement('circle', {
          cx: center,
          cy: center,
          r,
          fill: 'none',
          stroke: resolvedTrack,
          strokeWidth: thickness,
        }),
        // Value
        React.createElement('circle', {
          cx: center,
          cy: center,
          r,
          fill: 'none',
          stroke,
          strokeWidth: thickness,
          strokeLinecap: 'round',
          strokeDasharray: `${circumference} ${circumference}`,
          strokeDashoffset: isAnimated ? circumference - targetLen : circumference,
          transform: `rotate(-90 ${center} ${center})`,
          style: {
            transition: `stroke-dashoffset ${duration}ms var(--knf-ease-out)`,
          },
        }),
      );
    });

    return React.createElement(
      'div',
      {
        className,
        style: {
          position: 'relative',
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      React.createElement(
        'svg',
        {
          width: size,
          height: size,
          viewBox: `0 0 ${size} ${size}`,
          'aria-hidden': centerValue === undefined,
        },
        ...rings,
      ),
      (centerValue !== undefined || centerLabel) &&
        React.createElement(
          'div',
          {
            style: {
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              textAlign: 'center',
              lineHeight: 1,
            },
          },
          centerValue !== undefined
            ? React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 2,
                    fontFamily: 'var(--knf-font-mono)',
                    fontVariantNumeric: 'tabular-nums slashed-zero',
                    color: 'var(--knf-ink)',
                    fontWeight: 700,
                    fontSize: size >= 128 ? 28 : 22,
                  },
                },
                String(centerValue),
                centerUnit
                  ? React.createElement(
                      'span',
                      {
                        style: {
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'var(--knf-muted)',
                        },
                      },
                      centerUnit,
                    )
                  : null,
              )
            : null,
          centerLabel
            ? React.createElement(
                'div',
                {
                  style: {
                    marginTop: 4,
                    fontFamily: 'var(--knf-font-mono)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: 'var(--knf-muted)',
                    fontWeight: 500,
                  },
                },
                centerLabel,
              )
            : null,
        ),
    );
  };
}
