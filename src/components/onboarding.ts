import type { SharedDependencies, UserProfile, Goals } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey } from '../utils/date-helpers';
import { kgToLbs, lbsToKg } from '../utils/nutrients';

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (little or no exercise)',
  light: 'Lightly Active (1-3 days/week)',
  moderate: 'Moderately Active (3-5 days/week)',
  active: 'Active (6-7 days/week)',
  very_active: 'Very Active (hard exercise daily)',
};

/** Estimate TDEE using Mifflin-St Jeor */
function estimateCalories(
  sex: 'male' | 'female' | 'other',
  weight_kg: number,
  height_cm: number,
  age: number,
  activity: string,
  goal_weight_kg: number,
): number {
  let bmr: number;
  if (sex === 'female') {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  } else {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  }
  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  const tdee = bmr * (multipliers[activity] ?? 1.55);
  if (goal_weight_kg < weight_kg) return Math.round(tdee - 500);
  if (goal_weight_kg > weight_kg) return Math.round(tdee + 300);
  return Math.round(tdee);
}

function estimateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function createOnboarding(Shared: SharedDependencies) {
  const {
    React, Button, Input, Label, Card, CardContent, CardHeader, CardTitle,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Popover, PopoverContent, PopoverTrigger, Calendar,
    Separator, lucideIcons, dateFns, cn,
  } = Shared;
  const { ChevronRight, ChevronLeft, Dumbbell, Target, User, Activity } = lucideIcons;

  return function Onboarding({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = React.useState(0);
    const [direction, setDirection] = React.useState<'forward' | 'back'>('forward');
    const [animating, setAnimating] = React.useState(false);
    const [visible, setVisible] = React.useState(true);

    // Form state
    const [sex, setSex] = React.useState<'male' | 'female' | 'other'>('male');
    const [birthDate, setBirthDate] = React.useState<Date | undefined>(undefined);
    const [heightCm, setHeightCm] = React.useState('');
    const [currentWeight, setCurrentWeight] = React.useState('');
    const [goalWeight, setGoalWeight] = React.useState('');
    const [activity, setActivity] = React.useState('moderate');
    const [units, setUnits] = React.useState<'metric' | 'imperial'>('imperial');
    const [saving, setSaving] = React.useState(false);
    const [calendarOpen, setCalendarOpen] = React.useState(false);

    const steps = [
      { title: 'About You', icon: User },
      { title: 'Your Body', icon: Activity },
      { title: 'Your Goal', icon: Target },
    ];

    const weightLabel = units === 'metric' ? 'kg' : 'lbs';
    const heightLabel = units === 'metric' ? 'cm' : 'in';

    const toKg = (val: string) => {
      const n = parseFloat(val);
      if (isNaN(n)) return 0;
      return units === 'imperial' ? lbsToKg(n) : n;
    };
    const toCm = (val: string) => {
      const n = parseFloat(val);
      if (isNaN(n)) return 0;
      return units === 'imperial' ? Math.round(n * 2.54) : n;
    };

    const birthDateStr = birthDate ? dateFns.format(birthDate, 'yyyy-MM-dd') : '';

    const canAdvance = () => {
      if (step === 0) return sex && birthDate;
      if (step === 1) return heightCm && currentWeight;
      if (step === 2) return goalWeight && activity;
      return false;
    };

    const animateStep = (newStep: number) => {
      setDirection(newStep > step ? 'forward' : 'back');
      setVisible(false);
      setAnimating(true);
      setTimeout(() => {
        setStep(newStep);
        setVisible(true);
        setTimeout(() => setAnimating(false), 300);
      }, 200);
    };

    const handleFinish = async () => {
      setSaving(true);
      const s = getStorage();

      const weightKg = toKg(currentWeight);
      const goalKg = toKg(goalWeight);
      const height = toCm(heightCm);
      const age = birthDateStr ? estimateAge(birthDateStr) : 30;

      const profile: UserProfile = {
        setup_complete: true,
        height_cm: height,
        current_weight_kg: weightKg,
        goal_weight_kg: goalKg,
        birth_date: birthDateStr,
        sex,
        activity_level: activity as any,
        unit_system: units,
      };
      await s.setProfile(profile);
      await s.setWeight(toDateKey(new Date()), { weight_kg: weightKg });

      const calories = estimateCalories(sex, weightKg, height, age, activity, goalKg);
      const proteinG = Math.round(weightKg * 1.8);
      const fatG = Math.round((calories * 0.25) / 9);
      const carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4);

      const goals: Goals = {
        calories,
        protein_g: proteinG,
        carbs_g: carbsG,
        fat_g: fatG,
        water_ml: 2500,
      };
      await s.setGoals(goals);

      setSaving(false);
      onComplete();
    };

    // Default month for DOB calendar — start at year 2000
    const defaultMonth = React.useMemo(() => new Date(2000, 0), []);

    // Transition styles
    const contentStyle: Record<string, string> = {
      transition: 'opacity 200ms ease, transform 200ms ease',
      opacity: visible ? '1' : '0',
      transform: visible
        ? 'translateX(0)'
        : direction === 'forward' ? 'translateX(24px)' : 'translateX(-24px)',
    };

    return React.createElement('div', {
      className: 'flex justify-center pt-[8vh] h-full p-4',
    },
      React.createElement(Card, { className: 'w-full max-w-md h-fit' },
        React.createElement(CardHeader, { className: 'text-center pb-2' },
          React.createElement('div', { className: 'flex justify-center mb-3' },
            React.createElement(Dumbbell, { className: 'h-10 w-10 text-primary' }),
          ),
          React.createElement(CardTitle, { className: 'text-xl' }, 'Set Up Your Profile'),
          React.createElement('p', { className: 'text-sm text-muted-foreground mt-1' },
            'Let\'s personalize your fitness tracking'),
        ),

        // Step indicators
        React.createElement('div', { className: 'flex justify-center gap-6 px-6 pb-2' },
          ...steps.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return React.createElement('div', {
              key: i,
              className: cn(
                'flex flex-col items-center gap-1 transition-colors duration-300',
                active ? 'text-primary' : done ? 'text-primary/60' : 'text-muted-foreground/40',
              ),
            },
              React.createElement('div', {
                className: cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all duration-300',
                  active ? 'border-primary bg-primary text-primary-foreground scale-110' :
                  done ? 'border-primary/60 bg-primary/10' : 'border-muted',
                ),
              }, done ? '\u2713' : React.createElement(Icon, { className: 'h-3.5 w-3.5' })),
              React.createElement('span', { className: 'text-[10px] font-medium' }, s.title),
            );
          }),
        ),

        React.createElement(Separator, null),

        React.createElement(CardContent, { className: 'pt-4' },
          // Animated content wrapper
          React.createElement('div', { style: contentStyle },
            React.createElement('div', { className: 'space-y-4' },

              // Step 1: About You
              step === 0 && React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'space-y-1' },
                  React.createElement(Label, { className: 'text-xs' }, 'Unit System'),
                  React.createElement(Select, { value: units, onValueChange: (v: string) => setUnits(v as any) },
                    React.createElement(SelectTrigger, { className: 'h-9' }, React.createElement(SelectValue, null)),
                    React.createElement(SelectContent, null,
                      React.createElement(SelectItem, { value: 'imperial' }, 'Imperial (lbs, in)'),
                      React.createElement(SelectItem, { value: 'metric' }, 'Metric (kg, cm)'),
                    ),
                  ),
                ),
                React.createElement('div', { className: 'space-y-1' },
                  React.createElement(Label, { className: 'text-xs' }, 'Sex'),
                  React.createElement(Select, { value: sex, onValueChange: (v: string) => setSex(v as any) },
                    React.createElement(SelectTrigger, { className: 'h-9' }, React.createElement(SelectValue, null)),
                    React.createElement(SelectContent, null,
                      React.createElement(SelectItem, { value: 'male' }, 'Male'),
                      React.createElement(SelectItem, { value: 'female' }, 'Female'),
                      React.createElement(SelectItem, { value: 'other' }, 'Other'),
                    ),
                  ),
                ),
                React.createElement('div', { className: 'space-y-1' },
                  React.createElement(Label, { className: 'text-xs' }, 'Date of Birth'),
                  React.createElement(Popover, { open: calendarOpen, onOpenChange: setCalendarOpen },
                    React.createElement(PopoverTrigger, { asChild: true },
                      React.createElement(Button, {
                        variant: 'outline',
                        className: cn('w-full h-9 justify-start text-left font-normal', !birthDate && 'text-muted-foreground'),
                      },
                        birthDate ? dateFns.format(birthDate, 'MMMM d, yyyy') : 'Pick your date of birth',
                      ),
                    ),
                    React.createElement(PopoverContent, { className: 'w-auto p-0', align: 'start' },
                      React.createElement(Calendar, {
                        mode: 'single',
                        selected: birthDate,
                        onSelect: (date: Date | undefined) => { setBirthDate(date); setCalendarOpen(false); },
                        defaultMonth: birthDate || defaultMonth,
                        captionLayout: 'dropdown',
                        fromYear: 1940,
                        toYear: new Date().getFullYear() - 10,
                        disabled: { after: new Date() },
                      }),
                    ),
                  ),
                ),
              ),

              // Step 2: Body measurements
              step === 1 && React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'space-y-1' },
                  React.createElement(Label, { className: 'text-xs' }, `Height (${heightLabel})`),
                  React.createElement(Input, {
                    type: 'number', min: 0, step: 'any', value: heightCm,
                    onChange: (e: any) => setHeightCm(e.target.value),
                    placeholder: units === 'metric' ? 'e.g. 175' : 'e.g. 69',
                    className: 'h-9',
                  }),
                ),
                React.createElement('div', { className: 'space-y-1' },
                  React.createElement(Label, { className: 'text-xs' }, `Current Weight (${weightLabel})`),
                  React.createElement(Input, {
                    type: 'number', min: 0, step: 'any', value: currentWeight,
                    onChange: (e: any) => setCurrentWeight(e.target.value),
                    placeholder: units === 'metric' ? 'e.g. 80' : 'e.g. 176',
                    className: 'h-9',
                  }),
                ),
              ),

              // Step 3: Goals
              step === 2 && React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'space-y-1' },
                  React.createElement(Label, { className: 'text-xs' }, `Goal Weight (${weightLabel})`),
                  React.createElement(Input, {
                    type: 'number', min: 0, step: 'any', value: goalWeight,
                    onChange: (e: any) => setGoalWeight(e.target.value),
                    placeholder: units === 'metric' ? 'e.g. 75' : 'e.g. 165',
                    className: 'h-9',
                  }),
                ),
                React.createElement('div', { className: 'space-y-1' },
                  React.createElement(Label, { className: 'text-xs' }, 'Activity Level'),
                  React.createElement(Select, { value: activity, onValueChange: setActivity },
                    React.createElement(SelectTrigger, { className: 'h-9' }, React.createElement(SelectValue, null)),
                    React.createElement(SelectContent, null,
                      ...Object.entries(ACTIVITY_LABELS).map(([key, label]) =>
                        React.createElement(SelectItem, { key, value: key }, label),
                      ),
                    ),
                  ),
                ),

                // Preview calorie target
                currentWeight && goalWeight && birthDate && React.createElement(React.Fragment, null,
                  React.createElement(Separator, null),
                  React.createElement('div', { className: 'text-center space-y-1' },
                    React.createElement('div', { className: 'text-xs text-muted-foreground' }, 'Recommended daily calories'),
                    React.createElement('div', { className: 'text-2xl font-bold text-primary' },
                      estimateCalories(
                        sex,
                        parseFloat(currentWeight) ? (units === 'imperial' ? lbsToKg(parseFloat(currentWeight)) : parseFloat(currentWeight)) : 70,
                        parseFloat(heightCm) ? (units === 'imperial' ? Math.round(parseFloat(heightCm) * 2.54) : parseFloat(heightCm)) : 170,
                        estimateAge(dateFns.format(birthDate, 'yyyy-MM-dd')),
                        activity,
                        parseFloat(goalWeight) ? (units === 'imperial' ? lbsToKg(parseFloat(goalWeight)) : parseFloat(goalWeight)) : 70,
                      ).toLocaleString(),
                    ),
                    React.createElement('div', { className: 'text-[10px] text-muted-foreground' },
                      'Based on Mifflin-St Jeor equation. You can adjust this later in settings.'),
                  ),
                ),
              ),
            ),
          ),

          // Navigation buttons
          React.createElement('div', { className: 'flex gap-2 pt-4' },
            step > 0 && React.createElement(Button, {
              variant: 'outline', className: 'flex-1',
              disabled: animating,
              onClick: () => animateStep(step - 1),
            }, React.createElement(ChevronLeft, { className: 'h-4 w-4 mr-1' }), 'Back'),

            step < 2
              ? React.createElement(Button, {
                  className: 'flex-1',
                  disabled: !canAdvance() || animating,
                  onClick: () => animateStep(step + 1),
                }, 'Continue', React.createElement(ChevronRight, { className: 'h-4 w-4 ml-1' }))
              : React.createElement(Button, {
                  className: 'flex-1',
                  disabled: !canAdvance() || saving || animating,
                  onClick: handleFinish,
                }, saving ? 'Setting up...' : 'Get Started'),
          ),
        ),
      ),
    );
  };
}
