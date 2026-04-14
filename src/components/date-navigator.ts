import type { SharedDependencies } from '../types';
import { fromDateKey, toDateKey } from '../utils/date-helpers';
import { createScopedShadcn } from '../design-system/scoped-shadcn';

/**
 * Signature DateNavigator — prev/next chevrons flank a Bricolage date label.
 *
 * Props intentionally use `dateKey` (YYYY-MM-DD string) as the single source
 * of truth. TP's Today page, Trends (for per-day scope), and any other
 * consumer can pass `dateKey` + `onChange(newKey)` rather than constructing
 * Date objects that can drift on DST boundaries.
 *
 *   <DateNavigator dateKey={dateKey} onChange={setDateKey} onToday={…} />
 *
 * Keyboard: arrow keys navigate days when focus is inside the control.
 */
export function createDateNavigator(Shared: SharedDependencies) {
  const { React, lucideIcons, dateFns, Calendar } = Shared;
  const Scoped = createScopedShadcn(Shared);
  const { Popover, PopoverContent, PopoverTrigger } = Scoped;
  const { ChevronLeft, ChevronRight } = lucideIcons;

  return function DateNavigator({
    dateKey,
    onChange,
    onToday,
  }: {
    dateKey: string;
    onChange: (key: string) => void;
    onToday?: () => void;
  }) {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement | null>(null);

    const date = fromDateKey(dateKey);
    const isToday = dateFns.isToday(date);
    const today = new Date();
    const todayKey = toDateKey(today);

    const stepDay = React.useCallback(
      (delta: number) => {
        const next = dateFns.addDays(date, delta);
        // never allow logging future dates
        if (next.getTime() > today.getTime()) return;
        onChange(toDateKey(next));
      },
      [date, onChange, today],
    );

    const handleKey = (e: any) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepDay(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!isToday) stepDay(1);
      } else if (e.key === 'Home' || (e.metaKey && e.key === 't')) {
        e.preventDefault();
        if (onToday) onToday();
        else onChange(todayKey);
      }
    };

    const dayLine = dateFns.format(date, 'EEEE, MMM d');
    const eyebrow = dateKey;

    // Shared chevron button style
    const chevronBtn = (dir: 'prev' | 'next', disabled: boolean) => {
      const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
      return React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => stepDay(dir === 'prev' ? -1 : 1),
          disabled,
          'aria-label': dir === 'prev' ? 'Previous day' : 'Next day',
          title: disabled ? 'Cannot log future dates' : undefined,
          style: {
            width: 32,
            height: 32,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--knf-surface)',
            color: disabled ? 'var(--knf-hairline)' : 'var(--knf-ink)',
            border: '1px solid var(--knf-hairline)',
            borderRadius: 'var(--knf-radius-pill)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition:
              'background var(--knf-duration-1) var(--knf-ease), color var(--knf-duration-1) var(--knf-ease)',
          },
          onMouseEnter: (e: any) => {
            if (disabled) return;
            e.currentTarget.style.background = 'var(--knf-hero-wash)';
            e.currentTarget.style.color = 'var(--knf-hero-ink)';
          },
          onMouseLeave: (e: any) => {
            if (disabled) return;
            e.currentTarget.style.background = 'var(--knf-surface)';
            e.currentTarget.style.color = 'var(--knf-ink)';
          },
        },
        React.createElement(Icon, { style: { width: 16, height: 16 } }),
      );
    };

    const todayChip = React.createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          if (onToday) onToday();
          else onChange(todayKey);
        },
        disabled: isToday,
        style: {
          padding: '4px 12px',
          fontSize: 12,
          fontFamily: 'var(--knf-font-mono)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          background: isToday ? 'var(--knf-surface-2)' : 'var(--knf-hero)',
          color: isToday ? 'var(--knf-muted)' : 'var(--knf-hero-ink)',
          border: `1px solid ${isToday ? 'var(--knf-hairline)' : 'var(--knf-hero-edge)'}`,
          borderRadius: 'var(--knf-radius-pill)',
          cursor: isToday ? 'default' : 'pointer',
          transition: 'all var(--knf-duration-1) var(--knf-ease)',
        },
      },
      'Today',
    );

    const dateButton = React.createElement(
      PopoverTrigger,
      { asChild: true },
      React.createElement(
        'button',
        {
          type: 'button',
          style: {
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: '6px 14px',
            minWidth: 200,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 'var(--knf-radius-md)',
            transition: 'background var(--knf-duration-1) var(--knf-ease)',
          },
          onMouseEnter: (e: any) => {
            e.currentTarget.style.background = 'var(--knf-surface-2)';
          },
          onMouseLeave: (e: any) => {
            e.currentTarget.style.background = 'transparent';
          },
        },
        React.createElement(
          'span',
          {
            className: 'knf-eyebrow',
            style: {
              fontSize: 10,
              letterSpacing: '0.16em',
            },
          },
          eyebrow,
        ),
        React.createElement(
          'span',
          {
            className: 'knf-display',
            style: {
              fontSize: 'var(--knf-text-h4)',
              fontWeight: 600,
              color: 'var(--knf-ink)',
              lineHeight: 1.05,
              fontVariationSettings: '"wdth" 96, "GRAD" 0',
            },
          },
          isToday ? 'Today' : dayLine,
        ),
      ),
    );

    return React.createElement(
      'div',
      {
        ref: rootRef,
        tabIndex: 0,
        onKeyDown: handleKey,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '4px 8px',
          outline: 'none',
        },
      },
      chevronBtn('prev', false),
      React.createElement(
        Popover,
        { open: pickerOpen, onOpenChange: setPickerOpen },
        dateButton,
        React.createElement(
          PopoverContent,
          {
            className: 'w-auto p-0',
            align: 'center',
            style: {
              background: 'var(--knf-surface)',
              border: '1px solid var(--knf-hairline)',
              boxShadow: 'var(--knf-shadow-lg)',
              borderRadius: 'var(--knf-radius-lg)',
              padding: 4,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                gap: 4,
                padding: 6,
                borderBottom: '1px solid var(--knf-hairline)',
              },
            },
            ...[
              { label: 'Today', date: new Date() },
              {
                label: 'Yesterday',
                date: dateFns.subDays(new Date(), 1),
              },
              { label: '-7d', date: dateFns.subDays(new Date(), 7) },
            ].map((p) =>
              React.createElement(
                'button',
                {
                  key: p.label,
                  type: 'button',
                  onClick: () => {
                    onChange(toDateKey(p.date));
                    setPickerOpen(false);
                  },
                  style: {
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: 12,
                    fontFamily: 'var(--knf-font-mono)',
                    color: 'var(--knf-ink)',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--knf-radius-sm)',
                    cursor: 'pointer',
                    transition: 'background var(--knf-duration-1) var(--knf-ease)',
                  },
                  onMouseEnter: (e: any) => {
                    e.currentTarget.style.background = 'var(--knf-hero-wash)';
                  },
                  onMouseLeave: (e: any) => {
                    e.currentTarget.style.background = 'transparent';
                  },
                },
                p.label,
              ),
            ),
          ),
          React.createElement(Calendar, {
            mode: 'single',
            selected: date,
            onSelect: (d: Date | undefined) => {
              if (d) {
                onChange(toDateKey(d));
                setPickerOpen(false);
              }
            },
            defaultMonth: date,
            disabled: { after: today },
          }),
        ),
      ),
      chevronBtn('next', isToday),
      todayChip,
    );
  };
}
