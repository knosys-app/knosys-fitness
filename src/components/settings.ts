import type { SharedDependencies, Goals, UserProfile } from '../types';
import { getStorage } from '../hooks/use-fitness-store';

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (little/no exercise)',
  light: 'Lightly Active (1–3 days/week)',
  moderate: 'Moderately Active (3–5 days/week)',
  active: 'Active (6–7 days/week)',
  very_active: 'Very Active (hard exercise daily)',
};

// Declared outside component for stable reference (avoids input focus loss)
function GoalField({ label, value, onChange, unit, React, Input, Label }: any) {
  return React.createElement('div', { className: 'space-y-1' },
    React.createElement(Label, { className: 'text-xs' }, label),
    React.createElement('div', { className: 'relative' },
      React.createElement(Input, {
        type: 'number', min: 0, value: String(value),
        onChange: (e: any) => onChange(parseFloat(e.target.value) || 0),
        className: 'h-8 pr-8 tabular-nums',
      }),
      React.createElement('span', {
        className: 'absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground',
      }, unit),
    ),
  );
}

function computeAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function createSettingsPanel(Shared: SharedDependencies) {
  const {
    React, Input, Label, Button,
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

    const age = computeAge(profile.birth_date);

    return React.createElement('div', { className: 'space-y-4 p-4 max-w-md' },
      // Daily Goals
      React.createElement(Card, null,
        React.createElement(CardHeader, { className: 'pb-2' },
          React.createElement(CardTitle, { className: 'text-sm' }, 'Daily Goals'),
        ),
        React.createElement(CardContent, { className: 'space-y-3' },
          React.createElement(GoalField, {
            label: 'Calories', value: goals.calories, unit: 'kcal',
            onChange: (v: number) => setGoals({ ...goals, calories: v }),
            React, Input, Label,
          }),
          React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
            React.createElement(GoalField, {
              label: 'Protein', value: goals.protein_g, unit: 'g',
              onChange: (v: number) => setGoals({ ...goals, protein_g: v }),
              React, Input, Label,
            }),
            React.createElement(GoalField, {
              label: 'Carbs', value: goals.carbs_g, unit: 'g',
              onChange: (v: number) => setGoals({ ...goals, carbs_g: v }),
              React, Input, Label,
            }),
            React.createElement(GoalField, {
              label: 'Fat', value: goals.fat_g, unit: 'g',
              onChange: (v: number) => setGoals({ ...goals, fat_g: v }),
              React, Input, Label,
            }),
          ),
          React.createElement(GoalField, {
            label: 'Water', value: goals.water_ml, unit: 'ml',
            onChange: (v: number) => setGoals({ ...goals, water_ml: v }),
            React, Input, Label,
          }),
        ),
      ),

      // Profile
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
              React.createElement(Label, { className: 'text-xs' },
                age !== null ? `Age (${age})` : 'Age'),
              React.createElement(Input, {
                type: 'date', value: profile.birth_date ?? '',
                onChange: (e: any) => setProfile({ ...profile, birth_date: e.target.value || undefined }),
                className: 'h-8 tabular-nums',
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

          React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
            React.createElement('div', { className: 'space-y-1' },
              React.createElement(Label, { className: 'text-xs' }, 'Height (cm)'),
              React.createElement(Input, {
                type: 'number', min: 0, value: String(profile.height_cm ?? ''),
                onChange: (e: any) => setProfile({ ...profile, height_cm: parseFloat(e.target.value) || undefined }),
                className: 'h-8 tabular-nums',
              }),
            ),
            React.createElement('div', { className: 'space-y-1' },
              React.createElement(Label, { className: 'text-xs' }, 'Goal Weight (kg)'),
              React.createElement(Input, {
                type: 'number', min: 0, step: 0.1, value: String(profile.goal_weight_kg ?? ''),
                onChange: (e: any) => setProfile({ ...profile, goal_weight_kg: parseFloat(e.target.value) || undefined }),
                className: 'h-8 tabular-nums',
              }),
            ),
          ),

          React.createElement('div', { className: 'space-y-1' },
            React.createElement(Label, { className: 'text-xs' }, 'Activity Level'),
            React.createElement(Select, {
              value: profile.activity_level ?? 'moderate',
              onValueChange: (v: string) => setProfile({ ...profile, activity_level: v as any }),
            },
              React.createElement(SelectTrigger, { className: 'h-8' },
                React.createElement(SelectValue, null),
              ),
              React.createElement(SelectContent, null,
                ...Object.entries(ACTIVITY_LABELS).map(([key, label]) =>
                  React.createElement(SelectItem, { key, value: key }, label),
                ),
              ),
            ),
          ),
        ),
      ),

      React.createElement(Button, { onClick: save, className: 'w-full' },
        saved ? 'Saved' : 'Save Settings',
      ),
    );
  };
}
