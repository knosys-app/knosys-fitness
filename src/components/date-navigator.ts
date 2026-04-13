import type { SharedDependencies } from '../types';
import { toDateKey, dateLabel } from '../utils/date-helpers';

export function createDateNavigator(Shared: SharedDependencies) {
  const { React, Button, lucideIcons, dateFns, cn } = Shared;
  const { ChevronLeft, ChevronRight, Calendar: CalIcon } = lucideIcons;

  return function DateNavigator({ date, onDateChange }: { date: Date; onDateChange: (d: Date) => void }) {
    const label = dateLabel(date, dateFns.isToday);

    return React.createElement('div', { className: 'flex items-center gap-2' },
      React.createElement(Button, {
        variant: 'ghost',
        size: 'icon',
        onClick: () => onDateChange(dateFns.subDays(date, 1)),
        className: 'h-8 w-8',
      }, React.createElement(ChevronLeft, { className: 'h-4 w-4' })),

      React.createElement('button', {
        onClick: () => onDateChange(new Date()),
        className: 'text-sm font-medium min-w-[140px] text-center hover:text-primary transition-colors',
      },
        React.createElement('div', null, label),
        !dateFns.isToday(date) && React.createElement('div', {
          className: 'text-xs text-muted-foreground',
        }, dateFns.format(date, 'MMM d, yyyy')),
      ),

      React.createElement(Button, {
        variant: 'ghost',
        size: 'icon',
        onClick: () => onDateChange(dateFns.addDays(date, 1)),
        className: 'h-8 w-8',
        disabled: dateFns.isToday(date),
      }, React.createElement(ChevronRight, { className: 'h-4 w-4' })),
    );
  };
}
