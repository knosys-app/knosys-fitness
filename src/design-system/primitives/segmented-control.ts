import type { SharedDependencies } from '../../types';

export interface SegmentedOption<V extends string = string> {
  value: V;
  label: string;
  /** Lucide icon name. */
  icon?: string;
}

export interface SegmentedControlProps<V extends string = string> {
  value: V;
  onValueChange: (value: V) => void;
  options: SegmentedOption<V>[];
  /** 'sm' = 28px tall, 'md' = 36px, 'lg' = 44px. Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: any;
  /** Accessible label for the group. */
  ariaLabel?: string;
}

const HEIGHT_MAP = { sm: 28, md: 36, lg: 44 } as const;
const PADDING_MAP = { sm: '4px 10px', md: '6px 14px', lg: '8px 18px' } as const;
const FONT_MAP = { sm: 12, md: 13, lg: 14 } as const;

export function createSegmentedControl(Shared: SharedDependencies) {
  const { React, cn, lucideIcons } = Shared;

  return function SegmentedControl<V extends string = string>(
    props: SegmentedControlProps<V>,
  ) {
    const {
      value,
      onValueChange,
      options,
      size = 'md',
      className,
      style,
      ariaLabel,
    } = props;

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

    const [indicator, setIndicator] = React.useState<{
      left: number;
      width: number;
      ready: boolean;
    }>({ left: 0, width: 0, ready: false });

    const activeIndex = Math.max(
      0,
      options.findIndex((o) => o.value === value),
    );

    const measure = React.useCallback(() => {
      const btn = buttonRefs.current[activeIndex];
      const container = containerRef.current;
      if (!btn || !container) return;
      const btnRect = btn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setIndicator({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
        ready: true,
      });
    }, [activeIndex]);

    React.useEffect(() => {
      measure();
    }, [measure, options.length]);

    // Re-measure on resize
    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      const handler = () => measure();
      window.addEventListener('resize', handler);
      return () => window.removeEventListener('resize', handler);
    }, [measure]);

    const height = HEIGHT_MAP[size];
    const padding = PADDING_MAP[size];
    const fontSize = FONT_MAP[size];

    return React.createElement(
      'div',
      {
        ref: containerRef,
        role: 'tablist',
        'aria-label': ariaLabel,
        className: cn(className),
        style: {
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          padding: 3,
          background: 'var(--knf-surface-2)',
          borderRadius: 'var(--knf-radius-pill)',
          border: '1px solid var(--knf-hairline)',
          height,
          ...style,
        },
      },
      // Sliding indicator
      indicator.ready
        ? React.createElement('div', {
            'aria-hidden': true,
            style: {
              position: 'absolute',
              top: 3,
              bottom: 3,
              left: 0,
              height: 'auto',
              width: indicator.width,
              transform: `translateX(${indicator.left}px)`,
              background: 'var(--knf-hero-wash)',
              border: '1px solid var(--knf-hero-edge)',
              borderRadius: 'var(--knf-radius-pill)',
              boxShadow: '0 1px 2px rgba(12,14,5,0.06)',
              transition:
                'transform var(--knf-duration-1) var(--knf-ease), width var(--knf-duration-1) var(--knf-ease)',
              pointerEvents: 'none',
              zIndex: 0,
            },
          })
        : null,
      ...options.map((opt, i) => {
        const active = opt.value === value;
        const Icon = opt.icon ? (lucideIcons as any)[opt.icon] : null;
        return React.createElement(
          'button',
          {
            key: opt.value,
            ref: (el: HTMLButtonElement | null) => {
              buttonRefs.current[i] = el;
            },
            type: 'button',
            role: 'tab',
            'aria-selected': active,
            onClick: () => {
              if (!active) onValueChange(opt.value);
            },
            style: {
              position: 'relative',
              zIndex: 1,
              padding,
              fontSize,
              fontWeight: active ? 600 : 500,
              color: active ? 'var(--knf-hero-ink)' : 'var(--knf-muted)',
              background: 'transparent',
              border: 'none',
              cursor: active ? 'default' : 'pointer',
              borderRadius: 'var(--knf-radius-pill)',
              transition:
                'color var(--knf-duration-1) var(--knf-ease), font-weight var(--knf-duration-1) var(--knf-ease)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--knf-font-body)',
              whiteSpace: 'nowrap',
            },
          },
          Icon
            ? React.createElement(Icon, {
                style: {
                  width: size === 'sm' ? 12 : 14,
                  height: size === 'sm' ? 12 : 14,
                },
              })
            : null,
          opt.label,
        );
      }),
    );
  };
}
