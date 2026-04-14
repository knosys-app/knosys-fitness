import type { SharedDependencies } from '../../types';
import type { SemanticColor } from '../../theme/palette';
import { semanticToHex } from '../../theme/palette';
import { createSparkline } from './sparkline';

export interface StatTileProps {
  /** Lucide icon name (e.g., 'Flame'). */
  icon?: string;
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  /** Semantic color key — colors the icon, the accent dot, sparkline. */
  accent?: SemanticColor;
  trend?: 'up' | 'down' | 'flat';
  /** 7-ish points of history. When set, renders a mini sparkline bottom-right. */
  sparkline?: number[];
  onClick?: () => void;
  className?: string;
}

export function createStatTile(Shared: SharedDependencies) {
  const { React, lucideIcons, cn } = Shared;
  const Sparkline = createSparkline(Shared);

  return function StatTile(props: StatTileProps) {
    const {
      icon,
      label,
      value,
      unit,
      hint,
      accent,
      trend,
      sparkline,
      onClick,
      className,
    } = props;

    const Icon = icon ? (lucideIcons as any)[icon] : null;
    const accentHex = accent ? semanticToHex(accent) : null;

    const TrendIcon =
      trend === 'up'
        ? (lucideIcons as any).TrendingUp
        : trend === 'down'
          ? (lucideIcons as any).TrendingDown
          : trend === 'flat'
            ? (lucideIcons as any).Minus
            : null;

    const content = React.createElement(
      'div',
      {
        className: cn('knf-stat-tile', className),
        style: {
          background: 'var(--knf-surface)',
          border: '1px solid var(--knf-hairline)',
          borderRadius: 'var(--knf-radius-md)',
          boxShadow: 'var(--knf-shadow-sm)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          position: 'relative',
          minHeight: '82px',
          transition:
            'transform var(--knf-duration-1) var(--knf-ease), box-shadow var(--knf-duration-1) var(--knf-ease)',
        },
      },
      // Label row: optional icon + accent dot + uppercase label
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          },
        },
        Icon
          ? React.createElement(Icon, {
              style: {
                width: 12,
                height: 12,
                color: accentHex ?? 'var(--knf-muted)',
                flexShrink: 0,
              },
            })
          : null,
        accent
          ? React.createElement('span', {
              'aria-hidden': true,
              style: {
                display: 'inline-block',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: accentHex,
                flexShrink: 0,
              },
            })
          : null,
        React.createElement(
          'span',
          {
            className: 'knf-eyebrow',
            style: {
              fontSize: 'var(--knf-text-micro)',
              color: 'var(--knf-muted)',
              fontFamily: 'var(--knf-font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 500,
            },
          },
          label,
        ),
      ),
      // Value row
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px',
            fontFamily: 'var(--knf-font-mono)',
            fontFeatureSettings: '"tnum", "zero"',
          },
        },
        React.createElement(
          'span',
          {
            style: {
              fontSize: '24px',
              fontWeight: 700,
              lineHeight: 1,
              color: 'var(--knf-ink)',
              fontVariantNumeric: 'tabular-nums slashed-zero',
            },
          },
          value,
        ),
        unit
          ? React.createElement(
              'span',
              {
                style: {
                  fontSize: '11px',
                  color: 'var(--knf-muted)',
                  fontWeight: 500,
                },
              },
              unit,
            )
          : null,
        TrendIcon
          ? React.createElement(TrendIcon, {
              style: {
                width: 12,
                height: 12,
                color:
                  trend === 'up'
                    ? 'var(--knf-success)'
                    : trend === 'down'
                      ? 'var(--knf-alert)'
                      : 'var(--knf-muted)',
                marginLeft: 4,
              },
            })
          : null,
      ),
      // Hint + sparkline row
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 'auto',
          },
        },
        hint
          ? React.createElement(
              'div',
              {
                style: {
                  fontSize: '11px',
                  color: 'var(--knf-muted)',
                  fontFamily: 'var(--knf-font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.2,
                },
              },
              hint,
            )
          : React.createElement('span', null),
        sparkline && sparkline.length
          ? React.createElement(Sparkline, {
              values: sparkline,
              width: 48,
              height: 14,
              color: accent,
              showLastDot: true,
            })
          : null,
      ),
    );

    if (onClick) {
      return React.createElement(
        'button',
        {
          onClick,
          type: 'button',
          className: 'knf-stat-tile-button',
          style: {
            textAlign: 'left',
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          },
        },
        content,
      );
    }

    return content;
  };
}
