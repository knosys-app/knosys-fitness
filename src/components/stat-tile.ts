import type { SharedDependencies } from '../types';

export function createStatTile(Shared: SharedDependencies) {
  const { React, lucideIcons, cn } = Shared;

  return function StatTile({ icon, label, value, unit, hint, accent, onClick }: {
    icon?: string;
    label: string;
    value: string | number;
    unit?: string;
    hint?: string;
    accent?: string; // CSS color for icon
    onClick?: () => void;
  }) {
    const Icon = icon ? (lucideIcons as any)[icon] : null;
    const inner = React.createElement('div', {
      className: cn(
        'rounded-md border p-2.5 space-y-1 transition-colors',
        onClick && 'hover:bg-muted/40 cursor-pointer',
      ),
    },
      React.createElement('div', { className: 'flex items-center gap-1.5' },
        Icon && React.createElement(Icon, {
          className: 'h-3 w-3',
          style: { color: accent ?? 'hsl(var(--muted-foreground))' },
        }),
        React.createElement('span', {
          className: 'text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
        }, label),
      ),
      React.createElement('div', { className: 'flex items-baseline gap-1' },
        React.createElement('span', { className: 'text-lg font-bold tabular-nums leading-none' }, value),
        unit && React.createElement('span', {
          className: 'text-[10px] text-muted-foreground',
        }, unit),
      ),
      hint && React.createElement('div', {
        className: 'text-[10px] text-muted-foreground tabular-nums',
      }, hint),
    );

    return onClick
      ? React.createElement('button', { onClick, className: 'text-left w-full' }, inner)
      : inner;
  };
}
