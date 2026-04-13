import type { SharedDependencies, Goals, UserProfile, FitnessSettings } from '../types';
import { getStorage } from '../hooks/use-fitness-store';

export function createSettingsPanel(Shared: SharedDependencies) {
  const {
    React, Input, Label, Button, Separator,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Card, CardContent, CardHeader, CardTitle,
  } = Shared;

  return function SettingsPanel() {
    const [goals, setGoals] = React.useState<Goals>({ calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, water_ml: 2500 });
    const [profile, setProfile] = React.useState<UserProfile>({ unit_system: 'metric' });
    const [saved, setSaved] = React.useState(false);

    React.useEffect(() => {
      const s = getStorage();
      s.getGoals().then(setGoals);
      s.getProfile().then(setProfile);
    }, []);

    const save = async () => {
      const s = getStorage();
      await Promise.all([s.setGoals(goals), s.setProfile(profile)]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    };

    function GoalField({ label, value, onChange, unit }: { label: string; value: number; onChange: (v: number) => void; unit: string }) {
      return React.createElement('div', { className: 'space-y-1' },
        React.createElement(Label, { className: 'text-xs' }, label),
        React.createElement('div', { className: 'relative' },
          React.createElement(Input, {
            type: 'number', min: 0, value: String(value),
            onChange: (e: any) => onChange(parseFloat(e.target.value) || 0),
            className: 'h-8 pr-8',
          }),
          React.createElement('span', {
            className: 'absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground',
          }, unit),
        ),
      );
    }

    return React.createElement('div', { className: 'space-y-4 p-4 max-w-md' },
      React.createElement(Card, null,
        React.createElement(CardHeader, { className: 'pb-2' },
          React.createElement(CardTitle, { className: 'text-sm' }, 'Daily Goals'),
        ),
        React.createElement(CardContent, { className: 'space-y-3' },
          React.createElement(GoalField, {
            label: 'Calories', value: goals.calories,
            onChange: (v: number) => setGoals({ ...goals, calories: v }), unit: 'kcal',
          }),
          React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
            React.createElement(GoalField, {
              label: 'Protein', value: goals.protein_g,
              onChange: (v: number) => setGoals({ ...goals, protein_g: v }), unit: 'g',
            }),
            React.createElement(GoalField, {
              label: 'Carbs', value: goals.carbs_g,
              onChange: (v: number) => setGoals({ ...goals, carbs_g: v }), unit: 'g',
            }),
            React.createElement(GoalField, {
              label: 'Fat', value: goals.fat_g,
              onChange: (v: number) => setGoals({ ...goals, fat_g: v }), unit: 'g',
            }),
          ),
          React.createElement(GoalField, {
            label: 'Water', value: goals.water_ml,
            onChange: (v: number) => setGoals({ ...goals, water_ml: v }), unit: 'ml',
          }),
        ),
      ),

      React.createElement(Card, null,
        React.createElement(CardHeader, { className: 'pb-2' },
          React.createElement(CardTitle, { className: 'text-sm' }, 'Profile'),
        ),
        React.createElement(CardContent, { className: 'space-y-3' },
          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Unit System'),
            React.createElement(Select, {
              value: profile.unit_system,
              onValueChange: (v: string) => setProfile({ ...profile, unit_system: v as 'metric' | 'imperial' }),
            },
              React.createElement(SelectTrigger, { className: 'h-8' },
                React.createElement(SelectValue, null),
              ),
              React.createElement(SelectContent, null,
                React.createElement(SelectItem, { value: 'metric' }, 'Metric (kg, cm)'),
                React.createElement(SelectItem, { value: 'imperial' }, 'Imperial (lbs, in)'),
              ),
            ),
          ),
          React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
            React.createElement('div', { className: 'space-y-1' },
              React.createElement(Label, { className: 'text-xs' }, 'Height (cm)'),
              React.createElement(Input, {
                type: 'number', min: 0, value: String(profile.height_cm ?? ''),
                onChange: (e: any) => setProfile({ ...profile, height_cm: parseFloat(e.target.value) || undefined }),
                className: 'h-8',
              }),
            ),
            React.createElement('div', { className: 'space-y-1' },
              React.createElement(Label, { className: 'text-xs' }, 'Sex'),
              React.createElement(Select, {
                value: profile.sex ?? '',
                onValueChange: (v: string) => setProfile({ ...profile, sex: v as any }),
              },
                React.createElement(SelectTrigger, { className: 'h-8' },
                  React.createElement(SelectValue, { placeholder: 'Select' }),
                ),
                React.createElement(SelectContent, null,
                  React.createElement(SelectItem, { value: 'male' }, 'Male'),
                  React.createElement(SelectItem, { value: 'female' }, 'Female'),
                  React.createElement(SelectItem, { value: 'other' }, 'Other'),
                ),
              ),
            ),
          ),
        ),
      ),

      React.createElement(Button, { onClick: save, className: 'w-full' },
        saved ? 'Saved!' : 'Save Settings',
      ),
    );
  };
}
