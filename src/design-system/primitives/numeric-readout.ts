import type { SharedDependencies } from '../../types';

export interface NumericReadoutProps {
  value: number;
  /** Value to animate FROM. Defaults to 0 on mount, or the previous value on update. */
  from?: number;
  /** Animation duration in ms. Default 620. */
  duration?: number;
  /** Decimal places. Default 0. */
  decimals?: number;
  /** Custom format function — overrides decimals. */
  format?: (n: number) => string;
  /** Disable the count-up entirely — render the final value as a string. */
  animate?: boolean;
  className?: string;
  style?: any;
  /** Force React element tag. Default 'span'. */
  as?: string;
}

/** cubic ease-out */
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function createNumericReadout(Shared: SharedDependencies) {
  const { React } = Shared;

  return function NumericReadout(props: NumericReadoutProps) {
    const {
      value,
      from,
      duration = 620,
      decimals = 0,
      format,
      animate = true,
      className,
      style,
      as = 'span',
    } = props;

    const prevValueRef = React.useRef<number>(from ?? 0);
    const [display, setDisplay] = React.useState<number>(
      animate ? from ?? 0 : value,
    );

    React.useEffect(() => {
      if (!animate) {
        setDisplay(value);
        prevValueRef.current = value;
        return;
      }

      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReduced) {
        setDisplay(value);
        prevValueRef.current = value;
        return;
      }

      const start = prevValueRef.current;
      const delta = value - start;
      if (delta === 0) {
        setDisplay(value);
        return;
      }

      let rafId: number;
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(t);
        const current = start + delta * eased;
        setDisplay(current);
        if (t < 1) {
          rafId = window.requestAnimationFrame(step);
        } else {
          setDisplay(value);
          prevValueRef.current = value;
        }
      };

      rafId = window.requestAnimationFrame(step);
      return () => {
        if (rafId !== undefined) window.cancelAnimationFrame(rafId);
        prevValueRef.current = value;
      };
    }, [value, animate, duration]);

    const text = format
      ? format(display)
      : decimals > 0
        ? display.toFixed(decimals)
        : String(Math.round(display));

    return React.createElement(
      as,
      {
        className,
        style: {
          fontFamily: 'var(--knf-font-mono)',
          fontVariantNumeric: 'tabular-nums slashed-zero',
          fontFeatureSettings: '"tnum", "zero"',
          ...style,
        },
      },
      text,
    );
  };
}
