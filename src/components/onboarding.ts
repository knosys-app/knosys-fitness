import type { SharedDependencies, UserProfile, Goals } from '../types';
import { getStorage } from '../hooks/use-fitness-store';
import { toDateKey } from '../utils/date-helpers';
import { kgToLbs, lbsToKg } from '../utils/nutrients';
import { createPageHeader } from '../design-system/primitives';
import { createScopedShadcn } from '../design-system/scoped-shadcn';

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (little or no exercise)',
  light: 'Lightly Active (1–3 days/week)',
  moderate: 'Moderately Active (3–5 days/week)',
  active: 'Active (6–7 days/week)',
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
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
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
    React,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Calendar,
    lucideIcons,
    dateFns,
    cn,
  } = Shared;
  const { ChevronRight, ChevronLeft, User, Activity, Target } = lucideIcons;

  const scoped = createScopedShadcn(Shared);
  const PageHeader = createPageHeader(Shared);

  return function Onboarding({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = React.useState(0);
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
      { title: 'About you', icon: User, eyebrow: 'STEP 1 OF 3' },
      { title: 'Your body', icon: Activity, eyebrow: 'STEP 2 OF 3' },
      { title: 'Your goal', icon: Target, eyebrow: 'STEP 3 OF 3' },
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
      if (step === 0) return !!sex && !!birthDate;
      if (step === 1) return !!heightCm && !!currentWeight;
      if (step === 2) return !!goalWeight && !!activity;
      return false;
    };

    const animateStep = (newStep: number) => {
      setVisible(false);
      window.setTimeout(() => {
        setStep(newStep);
        setVisible(true);
      }, 180);
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

      const calories = estimateCalories(
        sex,
        weightKg,
        height,
        age,
        activity,
        goalKg,
      );
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

    // Default month for DOB calendar
    const defaultMonth = React.useMemo(() => new Date(2000, 0), []);

    const currentStep = steps[step];

    return React.createElement(
      'div',
      {
        style: {
          minHeight: '100%',
          background: 'var(--knf-bg)',
          padding: '56px 24px',
          display: 'flex',
          justifyContent: 'center',
          overflow: 'auto',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: '100%',
            maxWidth: 520,
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
          },
        },
        // -------- Progress dots --------
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            },
          },
          ...[0, 1, 2].map((i) => {
            const active = i === step;
            const done = i < step;
            return React.createElement('div', {
              key: `dot-${i}`,
              'aria-label': `Step ${i + 1}`,
              style: {
                width: active ? 28 : 10,
                height: 10,
                borderRadius: 'var(--knf-radius-pill)',
                background: active
                  ? 'var(--knf-hero)'
                  : done
                    ? 'var(--knf-hero-wash)'
                    : 'transparent',
                border: done
                  ? '1px solid var(--knf-hero-edge)'
                  : active
                    ? '1px solid var(--knf-hero-edge)'
                    : '1px solid var(--knf-hairline)',
                transition:
                  'width var(--knf-duration-1) var(--knf-ease), background-color var(--knf-duration-1) var(--knf-ease)',
              },
            });
          }),
        ),
        // -------- Header --------
        React.createElement(
          'div',
          {
            className: 'knf-reveal',
            style: {
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition:
                'opacity var(--knf-duration-1) var(--knf-ease), transform var(--knf-duration-1) var(--knf-ease)',
            },
          },
          React.createElement(PageHeader, {
            eyebrow: currentStep.eyebrow,
            title: currentStep.title,
            size: 'h1',
          }),
        ),
        // -------- Form body --------
        React.createElement(
          'div',
          {
            style: {
              background: 'var(--knf-surface)',
              borderRadius: 'var(--knf-radius-lg)',
              border: '1px solid var(--knf-hairline)',
              boxShadow: 'var(--knf-shadow-sm)',
              padding: 28,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition:
                'opacity var(--knf-duration-1) var(--knf-ease), transform var(--knf-duration-1) var(--knf-ease)',
            },
          },
          // Step 1: About you
          step === 0 &&
            React.createElement(
              React.Fragment,
              null,
              formField(React, Label, 'Unit system', React.createElement(
                Select,
                {
                  value: units,
                  onValueChange: (v: string) => setUnits(v as any),
                },
                React.createElement(
                  SelectTrigger,
                  { className: 'h-10' },
                  React.createElement(SelectValue, null),
                ),
                React.createElement(
                  SelectContent,
                  null,
                  React.createElement(SelectItem, { value: 'imperial' }, 'Imperial (lbs, in)'),
                  React.createElement(SelectItem, { value: 'metric' }, 'Metric (kg, cm)'),
                ),
              )),
              formField(React, Label, 'Sex', React.createElement(
                Select,
                {
                  value: sex,
                  onValueChange: (v: string) => setSex(v as any),
                },
                React.createElement(
                  SelectTrigger,
                  { className: 'h-10' },
                  React.createElement(SelectValue, null),
                ),
                React.createElement(
                  SelectContent,
                  null,
                  React.createElement(SelectItem, { value: 'male' }, 'Male'),
                  React.createElement(SelectItem, { value: 'female' }, 'Female'),
                  React.createElement(SelectItem, { value: 'other' }, 'Other'),
                ),
              )),
              formField(
                React,
                Label,
                'Date of birth',
                React.createElement(
                  scoped.Popover,
                  { open: calendarOpen, onOpenChange: setCalendarOpen },
                  React.createElement(
                    scoped.PopoverTrigger,
                    { asChild: true },
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        style: {
                          height: 40,
                          padding: '0 12px',
                          background: 'var(--knf-surface)',
                          border: '1px solid var(--knf-hairline)',
                          borderRadius: 'var(--knf-radius-sm)',
                          textAlign: 'left',
                          fontSize: 14,
                          fontFamily: 'var(--knf-font-body)',
                          color: birthDate
                            ? 'var(--knf-ink)'
                            : 'var(--knf-muted)',
                          width: '100%',
                          cursor: 'pointer',
                        },
                      },
                      birthDate
                        ? dateFns.format(birthDate, 'MMMM d, yyyy')
                        : 'Pick your date of birth',
                    ),
                  ),
                  React.createElement(
                    scoped.PopoverContent,
                    { className: 'w-auto p-0', align: 'start' },
                    React.createElement(Calendar, {
                      mode: 'single',
                      selected: birthDate,
                      onSelect: (date: Date | undefined) => {
                        setBirthDate(date);
                        setCalendarOpen(false);
                      },
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
          // Step 2: Body
          step === 1 &&
            React.createElement(
              React.Fragment,
              null,
              formField(
                React,
                Label,
                `Height (${heightLabel})`,
                React.createElement(Input, {
                  type: 'number',
                  min: 0,
                  step: 'any',
                  value: heightCm,
                  onChange: (e: any) => setHeightCm(e.target.value),
                  placeholder: units === 'metric' ? 'e.g. 175' : 'e.g. 69',
                  className: 'h-10',
                }),
              ),
              formField(
                React,
                Label,
                `Current weight (${weightLabel})`,
                React.createElement(Input, {
                  type: 'number',
                  min: 0,
                  step: 'any',
                  value: currentWeight,
                  onChange: (e: any) => setCurrentWeight(e.target.value),
                  placeholder: units === 'metric' ? 'e.g. 80' : 'e.g. 176',
                  className: 'h-10',
                }),
              ),
            ),
          // Step 3: Goal
          step === 2 &&
            React.createElement(
              React.Fragment,
              null,
              formField(
                React,
                Label,
                `Goal weight (${weightLabel})`,
                React.createElement(Input, {
                  type: 'number',
                  min: 0,
                  step: 'any',
                  value: goalWeight,
                  onChange: (e: any) => setGoalWeight(e.target.value),
                  placeholder: units === 'metric' ? 'e.g. 75' : 'e.g. 165',
                  className: 'h-10',
                }),
              ),
              formField(
                React,
                Label,
                'Activity level',
                React.createElement(
                  Select,
                  { value: activity, onValueChange: setActivity },
                  React.createElement(
                    SelectTrigger,
                    { className: 'h-10' },
                    React.createElement(SelectValue, null),
                  ),
                  React.createElement(
                    SelectContent,
                    null,
                    ...Object.entries(ACTIVITY_LABELS).map(([key, label]) =>
                      React.createElement(SelectItem, { key, value: key }, label),
                    ),
                  ),
                ),
              ),
              // Calorie preview
              currentWeight &&
                goalWeight &&
                birthDate &&
                React.createElement(
                  'div',
                  {
                    style: {
                      marginTop: 20,
                      padding: '20px 24px',
                      background: 'var(--knf-hero-wash)',
                      border: '1px solid var(--knf-hero-edge)',
                      borderRadius: 'var(--knf-radius-md)',
                      textAlign: 'center',
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      className: 'knf-eyebrow',
                      style: { color: 'var(--knf-hero-ink)', marginBottom: 6 },
                    },
                    'RECOMMENDED DAILY CALORIES',
                  ),
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontFamily: 'var(--knf-font-display)',
                        fontSize: 48,
                        fontWeight: 700,
                        color: 'var(--knf-hero-ink)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                      },
                    },
                    estimateCalories(
                      sex,
                      parseFloat(currentWeight)
                        ? units === 'imperial'
                          ? lbsToKg(parseFloat(currentWeight))
                          : parseFloat(currentWeight)
                        : 70,
                      parseFloat(heightCm)
                        ? units === 'imperial'
                          ? Math.round(parseFloat(heightCm) * 2.54)
                          : parseFloat(heightCm)
                        : 170,
                      estimateAge(dateFns.format(birthDate, 'yyyy-MM-dd')),
                      activity,
                      parseFloat(goalWeight)
                        ? units === 'imperial'
                          ? lbsToKg(parseFloat(goalWeight))
                          : parseFloat(goalWeight)
                        : 70,
                    ).toLocaleString(),
                  ),
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: 11,
                        color: 'var(--knf-ink-2)',
                        marginTop: 8,
                        lineHeight: 1.5,
                      },
                    },
                    'Based on Mifflin–St Jeor. Adjust later in Settings.',
                  ),
                ),
            ),
        ),
        // -------- Navigation --------
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              gap: 10,
            },
          },
          step > 0 &&
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => animateStep(step - 1),
                style: {
                  flex: 1,
                  padding: '14px 20px',
                  background: 'transparent',
                  border: '1px solid var(--knf-hairline)',
                  color: 'var(--knf-ink)',
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: 'var(--knf-font-body)',
                  borderRadius: 'var(--knf-radius-sm)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'border-color var(--knf-duration-1) var(--knf-ease)',
                },
              },
              React.createElement(ChevronLeft, { style: { width: 14, height: 14 } }),
              'Back',
            ),
          step < 2
            ? React.createElement(
                'button',
                {
                  type: 'button',
                  disabled: !canAdvance(),
                  onClick: () => animateStep(step + 1),
                  style: {
                    flex: step === 0 ? 1 : 2,
                    padding: '14px 20px',
                    background: canAdvance()
                      ? 'var(--knf-hero)'
                      : 'var(--knf-surface-2)',
                    color: canAdvance()
                      ? 'var(--knf-hero-ink)'
                      : 'var(--knf-muted)',
                    border: `1px solid ${canAdvance() ? 'var(--knf-hero-edge)' : 'var(--knf-hairline)'}`,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'var(--knf-font-body)',
                    borderRadius: 'var(--knf-radius-sm)',
                    cursor: canAdvance() ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition:
                      'background-color var(--knf-duration-1) var(--knf-ease), color var(--knf-duration-1) var(--knf-ease)',
                  },
                },
                'Continue',
                React.createElement(ChevronRight, { style: { width: 14, height: 14 } }),
              )
            : React.createElement(
                'button',
                {
                  type: 'button',
                  disabled: !canAdvance() || saving,
                  onClick: handleFinish,
                  style: {
                    flex: 2,
                    padding: '14px 20px',
                    background:
                      canAdvance() && !saving
                        ? 'var(--knf-hero)'
                        : 'var(--knf-surface-2)',
                    color:
                      canAdvance() && !saving
                        ? 'var(--knf-hero-ink)'
                        : 'var(--knf-muted)',
                    border: `1px solid ${canAdvance() && !saving ? 'var(--knf-hero-edge)' : 'var(--knf-hairline)'}`,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'var(--knf-font-body)',
                    borderRadius: 'var(--knf-radius-sm)',
                    cursor: canAdvance() && !saving ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'background-color var(--knf-duration-1) var(--knf-ease)',
                  },
                },
                saving ? 'Setting up…' : 'Get started',
              ),
        ),
      ),
    );
  };
}

// Local helper to keep field markup consistent
function formField(React: any, Label: any, label: string, control: any) {
  return React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        marginBottom: 16,
      },
    },
    React.createElement(
      Label,
      {
        className: 'knf-eyebrow',
        style: {
          fontFamily: 'var(--knf-font-mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'var(--knf-muted)',
          fontWeight: 500,
        },
      },
      label,
    ),
    control,
  );
}
