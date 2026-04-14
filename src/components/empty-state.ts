import type { SharedDependencies } from '../types';

/**
 * Signature EmptyState — centered icon-in-wash + Bricolage headline + chartreuse CTA.
 *
 *   <EmptyState
 *     icon="Sparkles"
 *     title="Nothing here yet"
 *     description="Log your first meal to see macros."
 *     actionLabel="Get started"
 *     action={() => openDialog()}
 *   />
 *
 * Keeps back-compat with the older shape that passed `action` as
 * `{ label, onClick, iconName }`. Both styles are accepted.
 */
export function createEmptyState(Shared: SharedDependencies) {
  const { React, lucideIcons } = Shared;

  return function EmptyState(props: {
    icon?: string;
    title: string;
    description?: string;
    // Either a plain onClick + label, OR an {label,onClick,iconName} object.
    actionLabel?: string;
    action?: any;
    actionIcon?: string;
    /** Tighter vertical — useful for small tiles. */
    compact?: boolean;
  }) {
    const { icon, title, description, actionLabel, action, actionIcon, compact } = props;

    const Icon = icon ? (lucideIcons as any)[icon] : (lucideIcons as any).Sparkles;

    // Normalize action API.
    let onClick: (() => void) | null = null;
    let label: string | null = null;
    let ActionIcon: any = actionIcon ? (lucideIcons as any)[actionIcon] : null;

    if (typeof action === 'function') {
      onClick = action;
      label = actionLabel ?? 'Get started';
    } else if (action && typeof action === 'object') {
      onClick = action.onClick ?? null;
      label = action.label ?? actionLabel ?? 'Get started';
      if (!ActionIcon && action.iconName) ActionIcon = (lucideIcons as any)[action.iconName];
    } else if (actionLabel) {
      label = actionLabel;
    }

    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: compact ? '24px 16px' : '56px 24px',
          gap: 14,
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: compact ? 40 : 56,
            height: compact ? 40 : 56,
            borderRadius: '9999px',
            background: 'var(--knf-hero-wash)',
            border: '1px solid var(--knf-hero-edge)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--knf-hero-ink)',
          },
        },
        React.createElement(Icon, {
          style: { width: compact ? 18 : 22, height: compact ? 18 : 22 },
        }),
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxWidth: 420,
          },
        },
        React.createElement(
          'div',
          {
            className: 'knf-display',
            style: {
              fontFamily: 'var(--knf-font-display)',
              fontWeight: 600,
              fontSize: compact ? 18 : 'var(--knf-text-h4)',
              color: 'var(--knf-ink)',
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
            },
          },
          title,
        ),
        description
          ? React.createElement(
              'p',
              {
                style: {
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--knf-muted)',
                  lineHeight: 1.5,
                  fontFamily: 'var(--knf-font-body)',
                },
              },
              description,
            )
          : null,
      ),
      onClick
        ? React.createElement(
            'button',
            {
              type: 'button',
              onClick,
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontFamily: 'var(--knf-font-body)',
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--knf-hero-ink)',
                background: 'var(--knf-hero)',
                border: '1px solid var(--knf-hero-edge)',
                borderRadius: 'var(--knf-radius-pill)',
                cursor: 'pointer',
                boxShadow: 'var(--knf-shadow-sm)',
                transition: 'transform var(--knf-duration-1) var(--knf-ease)',
              },
              onMouseDown: (e: any) => {
                e.currentTarget.style.transform = 'scale(0.97)';
              },
              onMouseUp: (e: any) => {
                e.currentTarget.style.transform = 'scale(1)';
              },
              onMouseLeave: (e: any) => {
                e.currentTarget.style.transform = 'scale(1)';
              },
            },
            ActionIcon
              ? React.createElement(ActionIcon, {
                  style: { width: 14, height: 14 },
                })
              : null,
            label,
          )
        : null,
    );
  };
}
