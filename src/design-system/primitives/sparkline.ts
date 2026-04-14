import type { SharedDependencies } from '../../types';
import type { SemanticColor } from '../../theme/palette';
import { semanticToHex, SIG_PALETTE } from '../../theme/palette';

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** Semantic color key (preferred) OR raw CSS color. */
  color?: SemanticColor | string;
  /** When true, renders a 20%-alpha area fill under the line. */
  fill?: boolean;
  /** When true, renders a 3px dot at the last value in the line color. */
  showLastDot?: boolean;
  /** Stroke width — defaults 1.5. */
  strokeWidth?: number;
  /** Inline style escape hatch. */
  style?: any;
  className?: string;
}

function isSemanticKey(c: string): c is SemanticColor {
  return (
    c === 'cal-burn' ||
    c === 'protein' ||
    c === 'carbs' ||
    c === 'fat' ||
    c === 'hydration' ||
    c === 'steps' ||
    c === 'sleep' ||
    c === 'heart' ||
    c === 'weight-down' ||
    c === 'weight-up' ||
    c === 'hero' ||
    c === 'success' ||
    c === 'warning' ||
    c === 'alert' ||
    c === 'muted' ||
    c === 'ink'
  );
}

function resolveColor(color: SemanticColor | string | undefined): string {
  if (!color) return SIG_PALETTE.ink;
  if (typeof color === 'string' && isSemanticKey(color)) return semanticToHex(color);
  return color as string;
}

/**
 * Converts a hex color to an rgba string at the given alpha.
 * Falls back to the hex itself if parsing fails.
 */
function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex;
  let full = hex;
  if (hex.length === 4) {
    full = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createSparkline(Shared: SharedDependencies) {
  const { React } = Shared;

  return function Sparkline(props: SparklineProps) {
    const {
      values,
      width = 60,
      height = 18,
      color,
      fill = false,
      showLastDot = false,
      strokeWidth = 1.5,
      style,
      className,
    } = props;

    const resolved = resolveColor(color);
    const n = values.length;

    // Handle 0/1-length gracefully — render a flat line at vertical centre.
    if (n < 2) {
      const midY = height / 2;
      return React.createElement(
        'svg',
        {
          width,
          height,
          viewBox: `0 0 ${width} ${height}`,
          className,
          style: { display: 'inline-block', ...style },
          'aria-hidden': true,
        },
        React.createElement('line', {
          x1: 0,
          y1: midY,
          x2: width,
          y2: midY,
          stroke: resolved,
          strokeWidth,
          strokeLinecap: 'round',
          opacity: 0.5,
        }),
      );
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    // 1px padding top/bottom to avoid clipping the stroke.
    const pad = strokeWidth;
    const usableH = height - pad * 2;
    const usableW = width;

    const points = values.map((v, i) => {
      const x = (i / (n - 1)) * usableW;
      const y = pad + (1 - (v - min) / range) * usableH;
      return { x, y };
    });

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');

    const fillD = fill
      ? `${pathD} L${usableW.toFixed(2)},${height} L0,${height} Z`
      : null;

    const lastPoint = points[points.length - 1];

    return React.createElement(
      'svg',
      {
        width,
        height,
        viewBox: `0 0 ${width} ${height}`,
        className,
        style: { display: 'inline-block', overflow: 'visible', ...style },
        'aria-hidden': true,
      },
      fill && fillD
        ? React.createElement('path', {
            d: fillD,
            fill: hexToRgba(resolved, 0.2),
            stroke: 'none',
          })
        : null,
      React.createElement('path', {
        d: pathD,
        fill: 'none',
        stroke: resolved,
        strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
      showLastDot
        ? React.createElement('circle', {
            cx: lastPoint.x,
            cy: lastPoint.y,
            r: 2.5,
            fill: resolved,
          })
        : null,
    );
  };
}
