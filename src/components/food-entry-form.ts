import type { SharedDependencies, NormalizedFood, ServingUnit } from '../types';
import { uuid } from '../utils/date-helpers';
import { getStorage } from '../hooks/use-fitness-store';
import { UNITS, UNIT_OPTIONS, toGrams, servingLabel } from '../utils/unit-conversions';
import { createScopedShadcn } from '../design-system/scoped-shadcn';

/**
 * FoodEntryForm — signature redesign with large inputs, hairline borders,
 * chartreuse focus ring (via host --ring token already re-scoped), and
 * a portal-scoped Dialog.
 */
export function createFoodEntryForm(Shared: SharedDependencies) {
  const {
    React, Input, Label, Button,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  } = Shared;

  const scoped = createScopedShadcn(Shared);
  const { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } = scoped;

  function NumField({ label, value, onChange, placeholder, unit, required }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; unit?: string; required?: boolean;
  }) {
    return React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 4 },
    },
      React.createElement('label', {
        style: {
          fontSize: 10,
          color: 'var(--knf-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: 'var(--knf-font-mono)',
          fontWeight: 500,
        },
      }, required ? `${label} *` : label),
      React.createElement('div', { style: { position: 'relative' } },
        React.createElement(Input, {
          type: 'number', min: 0, step: 'any', value, placeholder,
          onChange: (e: any) => onChange(e.target.value),
          style: {
            height: 36,
            paddingRight: unit ? 36 : undefined,
            background: 'var(--knf-surface)',
            border: '1px solid var(--knf-hairline)',
            borderRadius: 'var(--knf-radius-md)',
            fontFamily: 'var(--knf-font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 13,
          },
        }),
        unit
          ? React.createElement('span', {
              style: {
                position: 'absolute',
                right: 10, top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 11,
                color: 'var(--knf-muted)',
                fontFamily: 'var(--knf-font-mono)',
              },
            }, unit)
          : null,
      ),
    );
  }

  function TextField({ label, value, onChange, placeholder, required }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
  }) {
    return React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 4 },
    },
      React.createElement('label', {
        style: {
          fontSize: 10,
          color: 'var(--knf-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: 'var(--knf-font-mono)',
          fontWeight: 500,
        },
      }, required ? `${label} *` : label),
      React.createElement(Input, {
        value,
        onChange: (e: any) => onChange(e.target.value),
        placeholder,
        style: {
          height: 36,
          background: 'var(--knf-surface)',
          border: '1px solid var(--knf-hairline)',
          borderRadius: 'var(--knf-radius-md)',
          fontFamily: 'var(--knf-font-body)',
          fontSize: 14,
        },
      }),
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
      React.createElement(DialogContent, {
        className: 'max-w-md',
        style: { background: 'var(--knf-surface)', padding: 20 },
      },
        React.createElement(DialogHeader, null,
          React.createElement(DialogTitle, {
            style: {
              fontFamily: 'var(--knf-font-display)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--knf-ink)',
              letterSpacing: '-0.01em',
            },
          }, 'Create custom food'),
        ),

        React.createElement('div', {
          style: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 },
        },
          React.createElement(TextField, {
            label: 'Food name', value: name, onChange: setName,
            placeholder: 'e.g. Homemade Granola', required: true,
          }),
          React.createElement(TextField, {
            label: 'Brand (optional)', value: brand, onChange: setBrand,
            placeholder: 'e.g. Homemade',
          }),

          React.createElement('div', {
            style: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 },
          },
            React.createElement(NumField, {
              label: 'Serving size', value: servingSize, onChange: setServingSize,
            }),
            React.createElement('div', {
              style: { display: 'flex', flexDirection: 'column', gap: 4 },
            },
              React.createElement('label', {
                style: {
                  fontSize: 10,
                  color: 'var(--knf-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontFamily: 'var(--knf-font-mono)',
                  fontWeight: 500,
                },
              }, 'Unit'),
              React.createElement(Select, {
                value: servingUnit,
                onValueChange: (v: string) => setServingUnit(v as ServingUnit),
              },
                React.createElement(SelectTrigger, {
                  style: {
                    height: 36,
                    background: 'var(--knf-surface)',
                    border: '1px solid var(--knf-hairline)',
                    borderRadius: 'var(--knf-radius-md)',
                  },
                },
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
          servingUnit !== 'g' && sizeValue > 0
            ? React.createElement('div', {
                style: {
                  fontSize: 11,
                  color: 'var(--knf-muted)',
                  fontFamily: 'var(--knf-font-mono)',
                },
              }, `= ${gramsEquiv}g`)
            : null,

          React.createElement('div', {
            style: {
              borderTop: '1px solid var(--knf-hairline)',
              paddingTop: 10,
              fontSize: 11,
              color: 'var(--knf-muted)',
              fontFamily: 'var(--knf-font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 500,
            },
          }, `Nutrition per ${servingLabel(sizeValue || 1, servingUnit)}`),

          React.createElement(NumField, {
            label: 'Calories', value: calories, onChange: setCalories, unit: 'kcal', required: true,
          }),
          React.createElement('div', {
            style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
          },
            React.createElement(NumField, { label: 'Protein', value: protein, onChange: setProtein, unit: 'g' }),
            React.createElement(NumField, { label: 'Carbs', value: carbs, onChange: setCarbs, unit: 'g' }),
            React.createElement(NumField, { label: 'Fat', value: fat, onChange: setFat, unit: 'g' }),
          ),
          React.createElement('div', {
            style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
          },
            React.createElement(NumField, { label: 'Fiber', value: fiber, onChange: setFiber, unit: 'g' }),
            React.createElement(NumField, { label: 'Sugar', value: sugar, onChange: setSugar, unit: 'g' }),
            React.createElement(NumField, { label: 'Sodium', value: sodium, onChange: setSodium, unit: 'mg' }),
          ),
        ),

        React.createElement(DialogFooter, { style: { marginTop: 16 } },
          React.createElement(Button, {
            variant: 'outline', onClick: () => onOpenChange(false),
          }, 'Cancel'),
          React.createElement(Button, {
            onClick: handleSave, disabled: !valid,
            style: { background: 'var(--knf-hero)', color: 'var(--knf-hero-ink)' },
          }, 'Save food'),
        ),
      ),
    );
  };
}
