import type { SharedDependencies, NormalizedFood, ServingUnit } from '../types';
import { uuid } from '../utils/date-helpers';
import { getStorage } from '../hooks/use-fitness-store';
import { UNITS, UNIT_OPTIONS, toGrams, servingLabel } from '../utils/unit-conversions';

export function createFoodEntryForm(Shared: SharedDependencies) {
  const {
    React, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    Input, Label, Button, Separator,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  } = Shared;

  // NumField defined OUTSIDE the component function for stable reference
  function NumField({ label, value, onChange, placeholder, unit }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; unit?: string;
  }) {
    return React.createElement('div', { className: 'space-y-1' },
      React.createElement(Label, { className: 'text-xs' }, label),
      React.createElement('div', { className: 'relative' },
        React.createElement(Input, {
          type: 'number', min: 0, step: 'any', value, placeholder,
          onChange: (e: any) => onChange(e.target.value),
          className: unit ? 'h-8 pr-10' : 'h-8',
        }),
        unit && React.createElement('span', {
          className: 'absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground',
        }, unit),
      ),
    );
  }

  return function FoodEntryForm({ open, onOpenChange, onSave }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (food: NormalizedFood) => void;
  }) {
    const [name, setName] = React.useState('');
    const [brand, setBrand] = React.useState('');
    const [servingSize, setServingSize] = React.useState('1');
    const [servingUnit, setServingUnit] = React.useState<ServingUnit>('g');
    const [calories, setCalories] = React.useState('');
    const [protein, setProtein] = React.useState('');
    const [carbs, setCarbs] = React.useState('');
    const [fat, setFat] = React.useState('');
    const [fiber, setFiber] = React.useState('');
    const [sugar, setSugar] = React.useState('');
    const [sodium, setSodium] = React.useState('');

    const unitInfo = UNITS[servingUnit];
    const sizeValue = parseFloat(servingSize) || 0;
    const gramsEquiv = toGrams(sizeValue, servingUnit);

    const handleSave = async () => {
      const label = servingLabel(sizeValue, servingUnit);
      const food: NormalizedFood = {
        id: uuid(),
        source: 'custom',
        name: name.trim(),
        brand: brand.trim() || undefined,
        serving_size_g: gramsEquiv,
        serving_unit: servingUnit,
        serving_label: label,
        calories: parseFloat(calories) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
        fiber_g: fiber ? parseFloat(fiber) : undefined,
        sugar_g: sugar ? parseFloat(sugar) : undefined,
        sodium_mg: sodium ? parseFloat(sodium) : undefined,
      };
      await getStorage().setCustomFood(food);
      onSave(food);
      onOpenChange(false);
      setName(''); setBrand(''); setServingSize('1'); setServingUnit('g');
      setCalories(''); setProtein(''); setCarbs(''); setFat('');
      setFiber(''); setSugar(''); setSodium('');
    };

    const valid = name.trim().length > 0 && (parseFloat(calories) || 0) >= 0;

    return React.createElement(Dialog, { open, onOpenChange },
      React.createElement(DialogContent, { className: 'max-w-sm' },
        React.createElement(DialogHeader, null,
          React.createElement(DialogTitle, null, 'Create Custom Food'),
        ),

        React.createElement('div', { className: 'space-y-3' },
          // Name
          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Food Name *'),
            React.createElement(Input, {
              value: name, onChange: (e: any) => setName(e.target.value),
              placeholder: 'e.g. Homemade Granola', className: 'h-8',
            }),
          ),
          // Brand
          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Brand (optional)'),
            React.createElement(Input, {
              value: brand, onChange: (e: any) => setBrand(e.target.value),
              placeholder: 'e.g. Homemade', className: 'h-8',
            }),
          ),
          // Serving size + unit
          React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
            React.createElement('div', { className: 'space-y-1' },
              React.createElement(Label, { className: 'text-xs' }, 'Serving Size'),
              React.createElement(Input, {
                type: 'number', min: 0, step: 'any', value: servingSize,
                onChange: (e: any) => setServingSize(e.target.value),
                className: 'h-8',
              }),
            ),
            React.createElement('div', { className: 'col-span-2 space-y-1' },
              React.createElement(Label, { className: 'text-xs' }, 'Unit'),
              React.createElement(Select, {
                value: servingUnit,
                onValueChange: (v: string) => setServingUnit(v as ServingUnit),
              },
                React.createElement(SelectTrigger, { className: 'h-8' },
                  React.createElement(SelectValue, null),
                ),
                React.createElement(SelectContent, null,
                  ...UNIT_OPTIONS.map(u =>
                    React.createElement(SelectItem, { key: u, value: u },
                      `${UNITS[u].label} (${UNITS[u].short})`),
                  ),
                ),
              ),
            ),
          ),
          // Show gram equivalent if not already grams
          servingUnit !== 'g' && sizeValue > 0 && React.createElement('div', {
            className: 'text-xs text-muted-foreground',
          }, `= ${gramsEquiv}g`),

          React.createElement(Separator, null),

          // Nutrition per serving
          React.createElement('div', { className: 'text-xs text-muted-foreground' },
            `Nutrition per ${servingLabel(sizeValue || 1, servingUnit)}`),
          React.createElement(NumField, { label: 'Calories *', value: calories, onChange: setCalories, unit: 'kcal' }),
          React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
            React.createElement(NumField, { label: 'Protein', value: protein, onChange: setProtein, unit: 'g' }),
            React.createElement(NumField, { label: 'Carbs', value: carbs, onChange: setCarbs, unit: 'g' }),
            React.createElement(NumField, { label: 'Fat', value: fat, onChange: setFat, unit: 'g' }),
          ),
          React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
            React.createElement(NumField, { label: 'Fiber', value: fiber, onChange: setFiber, unit: 'g' }),
            React.createElement(NumField, { label: 'Sugar', value: sugar, onChange: setSugar, unit: 'g' }),
            React.createElement(NumField, { label: 'Sodium', value: sodium, onChange: setSodium, unit: 'mg' }),
          ),
        ),

        React.createElement(DialogFooter, null,
          React.createElement(Button, { variant: 'outline', onClick: () => onOpenChange(false) }, 'Cancel'),
          React.createElement(Button, { onClick: handleSave, disabled: !valid }, 'Save Food'),
        ),
      ),
    );
  };
}
