import type { SharedDependencies } from '../../types';
import type { SemanticColor } from '../../theme/palette';
import { semanticToHex } from '../../theme/palette';

export interface SignatureCardProps {
  children?: any;
  className?: string;
  /** Draws a 3px stripe on the left edge in the given semantic color. */
  accent?: SemanticColor;
  /** Inner padding preset. Default 'md'. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** When true, hover lifts the card -2px and reveals a chartreuse bottom edge. */
  interactive?: boolean;
  /**
   * Milliseconds to stagger the reveal animation by. When set, the card
   * fades+rises on mount. Pass undefined to render instantly.
   */
  delay?: number;
  onClick?: () => void;
  /** Inline style escape hatch — merged after all computed styles. */
  style?: any;
}

const PADDING_MAP: Record<NonNullable<SignatureCardProps['padding']>, string> = {
  none: '0',
  sm: '12px',
  md: '16px',
  lg: '24px',
};

export function createSignatureCard(Shared: SharedDependencies) {
  const { React, cn } = Shared;

  return function SignatureCard(props: SignatureCardProps) {
    const {
      children,
      className,
      accent,
      padding = 'md',
      interactive = false,
      delay,
      onClick,
      style: styleOverride,
    } = props;

    const [hovered, setHovered] = React.useState(false);

    const accentHex = accent ? semanticToHex(accent) : null;

    const baseStyle: any = {
      background: 'var(--knf-surface)',
      border: '1px solid var(--knf-hairline)',
      borderRadius: 'var(--knf-radius-lg)',
      boxShadow: 'var(--knf-shadow-sm)',
      padding: PADDING_MAP[padding],
      position: 'relative',
      transition:
        'transform var(--knf-duration-1) var(--knf-ease), box-shadow var(--knf-duration-1) var(--knf-ease), border-color var(--knf-duration-1) var(--knf-ease)',
      overflow: 'hidden',
    };

    if (interactive) {
      baseStyle.cursor = 'pointer';
      if (hovered) {
        baseStyle.transform = 'translateY(-2px)';
        baseStyle.boxShadow = 'var(--knf-shadow-md)';
      }
    }

    if (delay !== undefined) {
      baseStyle.animationDelay = `${delay}ms`;
      baseStyle.opacity = 0;
      baseStyle.transform = baseStyle.transform
        ? baseStyle.transform
        : 'translateY(12px)';
      baseStyle.animation = `knfReveal var(--knf-duration-2) var(--knf-ease-out) forwards`;
      baseStyle.animationDelay = `${delay}ms`;
    }

    const handlers = interactive
      ? {
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        }
      : {};

    const mergedStyle = { ...baseStyle, ...styleOverride };

    const accentStripe = accentHex
      ? React.createElement('div', {
          'aria-hidden': true,
          style: {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '3px',
            background: accentHex,
            pointerEvents: 'none',
          },
        })
      : null;

    const hoverEdge = interactive
      ? React.createElement('div', {
          'aria-hidden': true,
          style: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '2px',
            background: 'var(--knf-hero-edge)',
            transform: hovered ? 'scaleX(1)' : 'scaleX(0)',
            transformOrigin: 'left center',
            transition: 'transform var(--knf-duration-1) var(--knf-ease)',
            pointerEvents: 'none',
          },
        })
      : null;

    return React.createElement(
      onClick ? 'button' : 'div',
      {
        className: cn(className),
        style: mergedStyle,
        onClick,
        type: onClick ? 'button' : undefined,
        ...handlers,
      },
      accentStripe,
      children,
      hoverEdge,
    );
  };
}
