import type { SharedDependencies } from '../../types';

export interface PageHeaderProps {
  /** Tiny uppercase above the title (e.g., "APR · 13 · 2026"). */
  eyebrow?: string;
  title: string;
  /** Optional subtitle below the title. */
  subtitle?: string;
  /** Right-aligned slot for buttons/controls. */
  trailing?: any;
  /** 'h1' = 56px display. 'mega' = 88px display. Default 'h1'. */
  size?: 'h1' | 'mega';
  className?: string;
  style?: any;
}

const TITLE_SIZE_MAP: Record<NonNullable<PageHeaderProps['size']>, string> = {
  h1: 'var(--knf-text-h1)',
  mega: 'var(--knf-text-mega)',
};

export function createPageHeader(Shared: SharedDependencies) {
  const { React, cn } = Shared;

  return function PageHeader(props: PageHeaderProps) {
    const {
      eyebrow,
      title,
      subtitle,
      trailing,
      size = 'h1',
      className,
      style,
    } = props;

    const titleSize = TITLE_SIZE_MAP[size];

    return React.createElement(
      'header',
      {
        className: cn(className),
        style: {
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          padding: '4px 0 12px',
          ...style,
        },
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 0,
            flex: 1,
          },
        },
        eyebrow
          ? React.createElement(
              'div',
              {
                className: 'knf-eyebrow',
                style: {
                  fontFamily: 'var(--knf-font-mono)',
                  fontSize: 'var(--knf-text-micro)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: 'var(--knf-muted)',
                  fontWeight: 500,
                  marginBottom: 4,
                },
              },
              eyebrow,
            )
          : null,
        React.createElement(
          'h1',
          {
            className: size === 'mega' ? 'knf-display-mega' : 'knf-display',
            style: {
              fontFamily: 'var(--knf-font-display)',
              fontSize: titleSize,
              fontWeight: size === 'mega' ? 700 : 600,
              letterSpacing: size === 'mega' ? '-0.03em' : '-0.02em',
              lineHeight: size === 'mega' ? 0.95 : 1,
              margin: 0,
              color: 'var(--knf-ink)',
              fontVariationSettings:
                size === 'mega' ? '"wdth" 92, "GRAD" 120' : '"wdth" 95, "GRAD" 0',
            },
          },
          title,
        ),
        subtitle
          ? React.createElement(
              'p',
              {
                style: {
                  margin: '6px 0 0',
                  fontSize: 'var(--knf-text-lede)',
                  color: 'var(--knf-muted)',
                  lineHeight: 1.45,
                },
              },
              subtitle,
            )
          : null,
      ),
      trailing
        ? React.createElement(
            'div',
            {
              style: {
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingTop: eyebrow ? 16 : 0,
              },
            },
            trailing,
          )
        : null,
    );
  };
}
