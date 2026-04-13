import type { SharedDependencies, Goals, WaterEntry } from '../types';
import { UNITS, type ServingUnit } from '../utils/unit-conversions';

const WATER_UNITS: { unit: ServingUnit; label: string }[] = [
  { unit: 'ml', label: 'ml' },
  { unit: 'fl_oz', label: 'fl oz' },
  { unit: 'cup', label: 'cups' },
  { unit: 'l', label: 'L' },
];

function toMl(value: number, unit: ServingUnit): number {
  // For water, grams ≈ ml, so toGrams factor works
  return Math.round(value * UNITS[unit].toGrams);
}

export function createWaterTracker(Shared: SharedDependencies) {
  const {
    React, Card, CardContent, Button, Input, Label,
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Separator, lucideIcons, cn,
  } = Shared;
  const { Droplets, Plus, Minus } = lucideIcons;

  const QUICK_ADD = [250, 500]; // ml

  function AddWaterDialog({ open, onOpenChange, onAdd }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (ml: number) => void;
  }) {
    const [amount, setAmount] = React.useState('');
    const [unit, setUnit] = React.useState<ServingUnit>('ml');

    const mlValue = amount ? toMl(parseFloat(amount) || 0, unit) : 0;

    const handleAdd = () => {
      if (mlValue > 0) {
        onAdd(mlValue);
        setAmount('');
        onOpenChange(false);
      }
    };

    return React.createElement(Dialog, { open, onOpenChange },
      React.createElement(DialogContent, { className: 'max-w-xs' },
        React.createElement(DialogHeader, null,
          React.createElement(DialogTitle, { className: 'flex items-center gap-2' },
            React.createElement(Droplets, { className: 'h-5 w-5 text-blue-500' }),
            'Add Water',
          ),
        ),

        React.createElement('div', { className: 'space-y-3 py-2' },
          React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
            React.createElement('div', { className: 'space-y-1' },
              React.createElement(Label, { className: 'text-xs' }, 'Amount'),
              React.createElement(Input, {
                type: 'number', min: 0, step: 'any', value: amount,
                onChange: (e: any) => setAmount(e.target.value),
                placeholder: 'e.g. 16', className: 'h-9', autoFocus: true,
              }),
            ),
            React.createElement('div', { className: 'space-y-1' },
              React.createElement(Label, { className: 'text-xs' }, 'Unit'),
              React.createElement(Select, {
                value: unit,
                onValueChange: (v: string) => setUnit(v as ServingUnit),
              },
                React.createElement(SelectTrigger, { className: 'h-9' },
                  React.createElement(SelectValue, null),
                ),
                React.createElement(SelectContent, null,
                  ...WATER_UNITS.map(wu =>
                    React.createElement(SelectItem, { key: wu.unit, value: wu.unit }, wu.label),
                  ),
                ),
              ),
            ),
          ),

          // Show ml equivalent when not already ml
          unit !== 'ml' && mlValue > 0 && React.createElement('div', {
            className: 'text-xs text-muted-foreground text-center',
          }, `= ${mlValue} ml`),
        ),

        React.createElement(DialogFooter, null,
          React.createElement(Button, { variant: 'outline', onClick: () => onOpenChange(false) }, 'Cancel'),
          React.createElement(Button, {
            onClick: handleAdd, disabled: mlValue <= 0,
            style: { backgroundColor: 'hsl(217, 91%, 60%)' },
          }, `Add ${mlValue > 0 ? mlValue + ' ml' : 'Water'}`),
        ),
      ),
    );
  }

  return function WaterTracker({ water, goals, onAddWater, onSetWater }: {
    water: WaterEntry;
    goals: Goals;
    onAddWater: (ml: number) => void;
    onSetWater: (ml: number) => void;
  }) {
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const pct = goals.water_ml > 0 ? Math.min((water.ml / goals.water_ml) * 100, 100) : 0;

    return React.createElement(React.Fragment, null,
      React.createElement(Card, null,
        React.createElement(CardContent, { className: 'p-4' },
          React.createElement('div', { className: 'flex items-center justify-between mb-3' },
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement(Droplets, { className: 'h-4 w-4 text-blue-500' }),
              React.createElement('span', { className: 'text-sm font-semibold' }, 'Water'),
            ),
            React.createElement('span', { className: 'text-sm text-muted-foreground' },
              `${water.ml} / ${goals.water_ml} ml`),
          ),

          React.createElement('div', { className: 'space-y-3' },
            React.createElement('div', {
              style: { height: '8px', width: '100%', overflow: 'hidden', borderRadius: '9999px', backgroundColor: 'hsl(var(--secondary))' },
            },
              React.createElement('div', {
                style: { height: '100%', borderRadius: '9999px', backgroundColor: 'hsl(217, 91%, 60%)', transition: 'width 300ms', width: `${pct}%` },
              }),
            ),

            React.createElement('div', { className: 'flex items-center justify-between' },
              React.createElement('div', { className: 'flex gap-1' },
                ...QUICK_ADD.map(ml =>
                  React.createElement(Button, {
                    key: ml, variant: 'outline', size: 'sm', className: 'h-7 text-xs',
                    onClick: () => onAddWater(ml),
                  },
                    React.createElement(Plus, { className: 'h-3 w-3 mr-1' }),
                    `${ml}ml`,
                  ),
                ),
                React.createElement(Button, {
                  variant: 'outline', size: 'sm', className: 'h-7 text-xs',
                  onClick: () => setDialogOpen(true),
                },
                  React.createElement(Plus, { className: 'h-3 w-3 mr-1' }),
                  'Custom',
                ),
              ),
              React.createElement(Button, {
                variant: 'ghost', size: 'sm', className: 'h-7 text-xs',
                onClick: () => onSetWater(Math.max(0, water.ml - 250)),
              },
                React.createElement(Minus, { className: 'h-3 w-3 mr-1' }),
                '250ml',
              ),
            ),
          ),
        ),
      ),

      React.createElement(AddWaterDialog, {
        open: dialogOpen,
        onOpenChange: setDialogOpen,
        onAdd: onAddWater,
      }),
    );
  };
}
