import type { SharedDependencies } from '../types';
import { dateLabel } from '../utils/date-helpers';

export function createDateNavigator(Shared: SharedDependencies) {
  const {
    React, Button, lucideIcons, dateFns, cn,
    Popover, PopoverContent, PopoverTrigger, Calendar,
  } = Shared;
  const { ChevronLeft, ChevronRight, CalendarDays } = lucideIcons;

  return function DateNavigator({ date, onDateChange }: { date: Date; onDateChange: (d: Date) => void }) {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const label = dateLabel(date, dateFns.isToday);
    const today = new Date();

    return React.createElement('div', { className: 'flex items-center gap-1' },
      React.createElement(Button, {
        variant: 'ghost',
        size: 'icon',
        onClick: () => onDateChange(dateFns.subDays(date, 1)),
        className: 'h-8 w-8',
      }, React.createElement(ChevronLeft, { className: 'h-4 w-4' })),

      React.createElement(Popover, { open: pickerOpen, onOpenChange: setPickerOpen },
        React.createElement(PopoverTrigger, { asChild: true },
          React.createElement(Button, {
            variant: 'ghost',
            className: 'min-w-[160px] h-8 px-2 gap-1.5 text-sm font-medium flex flex-col items-center justify-center',
          },
            React.createElement('div', { className: 'flex items-center gap-1.5' },
              React.createElement(CalendarDays, { className: 'h-3.5 w-3.5 text-muted-foreground' }),
              React.createElement('span', null, label),
            ),
            !dateFns.isToday(date) && React.createElement('div', {
              className: 'text-[10px] text-muted-foreground tabular-nums leading-none',
            }, dateFns.format(date, 'MMM d, yyyy')),
          ),
        ),
        React.createElement(PopoverContent, { className: 'w-auto p-0', align: 'center' },
          React.createElement('div', { className: 'p-2 border-b flex gap-1' },
            React.createElement(Button, {
              variant: 'ghost', size: 'sm', className: 'flex-1 h-7 text-xs',
              onClick: () => { onDateChange(today); setPickerOpen(false); },
            }, 'Today'),
            React.createElement(Button, {
              variant: 'ghost', size: 'sm', className: 'flex-1 h-7 text-xs',
              onClick: () => { onDateChange(dateFns.subDays(today, 1)); setPickerOpen(false); },
            }, 'Yesterday'),
            React.createElement(Button, {
              variant: 'ghost', size: 'sm', className: 'flex-1 h-7 text-xs',
              onClick: () => { onDateChange(dateFns.subDays(today, 7)); setPickerOpen(false); },
            }, '-7d'),
          ),
          React.createElement(Calendar, {
            mode: 'single',
            selected: date,
            onSelect: (d: Date | undefined) => {
              if (d) { onDateChange(d); setPickerOpen(false); }
            },
            defaultMonth: date,
            disabled: { after: today },
          }),
        ),
      ),

      React.createElement(Button, {
        variant: 'ghost',
        size: 'icon',
        onClick: () => onDateChange(dateFns.addDays(date, 1)),
        className: 'h-8 w-8',
        disabled: dateFns.isToday(date),
        title: dateFns.isToday(date) ? 'Cannot log future dates' : undefined,
      }, React.createElement(ChevronRight, { className: 'h-4 w-4' })),
    );
  };
}
