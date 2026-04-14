import type { SharedDependencies } from '../../types';
import type { SemanticColor } from '../../theme/palette';
import { semanticToHex, semanticToSoft } from '../../theme/palette';

export interface SemanticBadgeProps {
  accent: SemanticColor;
  children?: any;
  /** 'solid' = color background + white text. 'soft' = 10% wash + colored text. 'outline' = border only. */
  variant?: 'solid' | 'soft' | 'outline';
  className?: string;
  style?: any;
}

export function createSemanticBadge(Shared: SharedDependencies) {
  const { React, cn } = Shared;

  return function SemanticBadge(props: SemanticBadgeProps) {
    const { accent, children, variant = 'soft', className, style } = props;
    const hex = semanticToHex(accent);
    const soft = semanticToSoft(accent);

    let background = 'transparent';
    let color: string = hex;
    let border = '1px solid transparent';

    if (variant === 'solid') {
      background = hex;
      color = '#FFFFFF';
      border = `1px solid ${hex}`;
    } else if (variant === 'soft') {
      background = soft;
      color = hex;
      border = '1px solid transparent';
    } else if (variant === 'outline') {
      background = 'transparent';
      color = hex;
      border = `1px solid ${hex}`;
    }

    return React.createElement(
      'span',
      {
        className: cn(className),
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 'var(--knf-radius-pill)',
          fontSize: 11,
          fontWeight: 500,
          lineHeight: 1.4,
          fontFamily: 'var(--knf-font-mono)',
          letterSpacing: '0.02em',
          background,
          color,
          border,
          whiteSpace: 'nowrap',
          ...style,
        },
      },
      children,
    );
  };
}
