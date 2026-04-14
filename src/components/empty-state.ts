import type { SharedDependencies } from '../types';

export function createEmptyState(Shared: SharedDependencies) {
  const { React, Button, lucideIcons } = Shared;

  return function EmptyState({ icon, title, description, action }: {
    icon: string;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void; iconName?: string };
  }) {
    const Icon = (lucideIcons as any)[icon] ?? lucideIcons.CircleHelp;
    const ActionIcon = action?.iconName ? (lucideIcons as any)[action.iconName] : null;

    return React.createElement('div', {
      className: 'flex flex-col items-center justify-center text-center py-12 px-6 space-y-3',
    },
      React.createElement('div', {
        style: {
          width: '48px',
          height: '48px',
          borderRadius: '9999px',
          backgroundColor: 'hsl(var(--muted))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
        React.createElement(Icon, { className: 'h-5 w-5 text-muted-foreground' }),
      ),
      React.createElement('div', { className: 'space-y-1' },
        React.createElement('div', { className: 'text-sm font-semibold' }, title),
        description && React.createElement('div', {
          className: 'text-xs text-muted-foreground max-w-xs',
        }, description),
      ),
      action && React.createElement(Button, {
        size: 'sm', variant: 'default', className: 'mt-1',
        onClick: action.onClick,
      },
        ActionIcon && React.createElement(ActionIcon, { className: 'h-3.5 w-3.5 mr-1.5' }),
        action.label,
      ),
    );
  };
}
