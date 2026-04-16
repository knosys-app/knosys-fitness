import type {
  SharedDependencies,
  Goals,
  UserProfile,
  WellnessGoals,
} from '../types';
import { getStorage, getApi } from '../hooks/use-fitness-store';
import { refreshCatalog } from '../api/exercise-catalog';
import { SIG_PALETTE } from '../theme';
import type { CatalogMeta } from '../store/storage';
import {
  createSignatureCard,
  createPageHeader,
  createSemanticBadge,
} from '../design-system/primitives';
import { createScopedShadcn } from '../design-system/scoped-shadcn';

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (little/no exercise)',
  light: 'Lightly Active (1–3 days/week)',
  moderate: 'Moderately Active (3–5 days/week)',
  active: 'Active (6–7 days/week)',
  very_active: 'Very Active (hard exercise daily)',
};

type WellnessGoalsState = {
  sleep_minutes: number;
  steps: number;
  resting_hr_bpm: number | undefined;
};

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

/**
 * Field row used across sections. Defined outside the main
 * component to preserve React identity and avoid focus loss
 * when parent state updates.
 */
function SigFieldRow({
  label,
  hint,
  Input,
  value,
  onChange,
  unit,
  type = 'number',
  step = 1,
  min = 0,
  placeholder,
  React,
}: any) {
  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
    React.createElement(
      'div',
      {
        className: 'knf-eyebrow',
        style: { fontSize: 10, letterSpacing: '0.16em' },
      },
      label,
    ),
    React.createElement(
      'div',
      { style: { position: 'relative' } },
      React.createElement(Input, {
        type,
        min,
        step,
        value: value ?? '',
        placeholder,
        onChange: (e: any) => {
          if (type === 'number') {
            onChange(
              e.target.value === ''
                ? undefined
                : parseFloat(e.target.value) || 0,
            );
          } else {
            onChange(e.target.value || undefined);
          }
        },
        className:
          'h-9 tabular-nums focus-visible:ring-offset-0 focus-visible:ring-1',
        style: {
          background: 'var(--knf-surface)',
          border: '1px solid var(--knf-hairline)',
          borderRadius: 'var(--knf-radius-sm)',
          color: 'var(--knf-ink)',
          fontFamily: 'var(--knf-font-mono)',
          paddingRight: unit ? 36 : undefined,
        },
      }),
      unit
        ? React.createElement(
            'span',
            {
              style: {
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 11,
                color: 'var(--knf-muted)',
                fontFamily: 'var(--knf-font-mono)',
                pointerEvents: 'none',
              },
            },
            unit,
          )
        : null,
    ),
    hint
      ? React.createElement(
          'div',
          {
            style: {
              fontSize: 11,
              color: 'var(--knf-muted)',
              fontFamily: 'var(--knf-font-mono)',
            },
          },
          hint,
        )
      : null,
  );
}

function SectionCard({
  SignatureCard,
  title,
  subtitle,
  children,
  React,
}: any) {
  return React.createElement(
    SignatureCard,
    { padding: 'lg' },
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          marginBottom: 18,
        },
      },
      React.createElement(
        'div',
        {
          className: 'knf-display',
          style: {
            fontFamily: 'var(--knf-font-display)',
            fontSize: 'var(--knf-text-h5)',
            fontWeight: 600,
            color: 'var(--knf-ink)',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
          },
        },
        title,
      ),
      subtitle
        ? React.createElement(
            'p',
            {
              style: {
                margin: 0,
                fontSize: 12,
                color: 'var(--knf-muted)',
              },
            },
            subtitle,
          )
        : null,
    ),
    children,
  );
}

export function createSettingsPanel(Shared: SharedDependencies) {
  const {
    React,
    Input,
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } = Shared;

  const SignatureCard = createSignatureCard(Shared);
  const PageHeader = createPageHeader(Shared);
  const SemanticBadge = createSemanticBadge(Shared);
  const Scoped = createScopedShadcn(Shared);
  const { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } =
    Scoped;

  return function SettingsPanel() {
    const [goals, setGoals] = React.useState<Goals>({
      calories: 2000,
      protein_g: 150,
      carbs_g: 250,
      fat_g: 65,
      water_ml: 2500,
    });
    const [profile, setProfile] = React.useState<UserProfile>({
      unit_system: 'metric',
    });
    const [wellness, setWellness] = React.useState<WellnessGoalsState>({
      sleep_minutes: 480,
      steps: 10000,
      resting_hr_bpm: undefined,
    });
    const [saved, setSaved] = React.useState(false);
    const [resetOpen, setResetOpen] = React.useState(false);
    const [resetting, setResetting] = React.useState(false);
    const [catalogMeta, setCatalogMeta] = React.useState<CatalogMeta | null>(null);
    const [catalogBusy, setCatalogBusy] = React.useState(false);
    const [rebuildBusy, setRebuildBusy] = React.useState(false);
    const [rebuildCount, setRebuildCount] = React.useState<number | null>(null);

    React.useEffect(() => {
      const s = getStorage();
      s.getGoals().then(setGoals);
      s.getProfile().then(setProfile);
      s.getCatalogMeta().then(setCatalogMeta);
      // Wellness goals folded into `goals` key; we probe for the extended shape.
      s.getGoals().then((g: any) => {
        if (
          g &&
          typeof g === 'object' &&
          'sleep_minutes' in g &&
          'steps' in g
        ) {
          setWellness({
            sleep_minutes: g.sleep_minutes ?? 480,
            steps: g.steps ?? 10000,
            resting_hr_bpm: g.resting_hr_bpm,
          });
        }
      });
    }, []);

    const save = async () => {
      const s = getStorage();
      const mergedGoals: any = {
        ...goals,
        sleep_minutes: wellness.sleep_minutes,
        steps: wellness.steps,
        resting_hr_bpm: wellness.resting_hr_bpm,
      };
      await Promise.all([s.setGoals(mergedGoals), s.setProfile(profile)]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      getApi().ui.showToast('Settings saved', 'success');
    };

    const resetAllData = async () => {
      setResetting(true);
      try {
        await getApi().storage.clear();
        getApi().ui.showToast('Plugin data cleared', 'success');
        setResetOpen(false);
        // Re-seed defaults so the settings page still renders
        const s = getStorage();
        s.getGoals().then(setGoals);
        s.getProfile().then(setProfile);
      } catch (err: any) {
        getApi().ui.showToast(
          `Reset failed: ${err?.message ?? 'unknown'}`,
          'error',
        );
      } finally {
        setResetting(false);
      }
    };

    const handleRefreshCatalog = async () => {
      setCatalogBusy(true);
      try {
        await refreshCatalog(getStorage());
        const meta = await getStorage().getCatalogMeta();
        setCatalogMeta(meta);
        getApi().ui.showToast('Catalog refreshed', 'success');
      } catch (err: any) {
        getApi().ui.showToast(`Refresh failed: ${err?.message ?? 'unknown'}`, 'error');
      } finally {
        setCatalogBusy(false);
      }
    };

    const handleRebuildIndex = async () => {
      setRebuildBusy(true);
      try {
        const count = await getStorage().rebuildExerciseHistoryIndex();
        setRebuildCount(count);
        getApi().ui.showToast(`History index rebuilt (${count} entries)`, 'success');
      } catch (err: any) {
        getApi().ui.showToast(`Rebuild failed: ${err?.message ?? 'unknown'}`, 'error');
      } finally {
        setRebuildBusy(false);
      }
    };

    const age = computeAge(profile.birth_date);

    const sleepHours = Math.max(0, wellness.sleep_minutes / 60);

    return React.createElement(
      'div',
      {
        className: 'knosys-fitness-root',
        style: {
          maxWidth: 640,
          margin: '0 auto',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: 'var(--knf-bg)',
          minHeight: '100%',
        },
      },

      // Header
      React.createElement(PageHeader, {
        eyebrow: 'PLUGIN',
        title: 'Fitness Settings',
        size: 'h1',
        trailing: React.createElement(
          'button',
          {
            type: 'button',
            onClick: save,
            style: {
              padding: '8px 18px',
              fontFamily: 'var(--knf-font-body)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--knf-hero-ink)',
              background: 'var(--knf-hero)',
              border: '1px solid var(--knf-hero-edge)',
              borderRadius: 'var(--knf-radius-pill)',
              cursor: 'pointer',
              boxShadow: 'var(--knf-shadow-sm)',
              transition: 'transform var(--knf-duration-1) var(--knf-ease)',
            },
          },
          saved ? 'Saved ✓' : 'Save changes',
        ),
      }),

      // ---------------- Goals ----------------
      React.createElement(
        SectionCard,
        {
          SignatureCard,
          React,
          title: 'Daily Goals',
          subtitle: 'Targets shown on the Today page and on widgets.',
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            },
          },
          React.createElement(SigFieldRow, {
            React,
            Input,
            label: 'CALORIES',
            value: goals.calories,
            unit: 'kcal',
            onChange: (v: number) => setGoals({ ...goals, calories: v ?? 0 }),
          }),
          React.createElement(SigFieldRow, {
            React,
            Input,
            label: 'WATER',
            value: goals.water_ml,
            unit: 'ml',
            onChange: (v: number) => setGoals({ ...goals, water_ml: v ?? 0 }),
          }),
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 12,
            },
          },
          React.createElement(SigFieldRow, {
            React,
            Input,
            label: 'PROTEIN',
            value: goals.protein_g,
            unit: 'g',
            onChange: (v: number) => setGoals({ ...goals, protein_g: v ?? 0 }),
          }),
          React.createElement(SigFieldRow, {
            React,
            Input,
            label: 'CARBS',
            value: goals.carbs_g,
            unit: 'g',
            onChange: (v: number) => setGoals({ ...goals, carbs_g: v ?? 0 }),
          }),
          React.createElement(SigFieldRow, {
            React,
            Input,
            label: 'FAT',
            value: goals.fat_g,
            unit: 'g',
            onChange: (v: number) => setGoals({ ...goals, fat_g: v ?? 0 }),
          }),
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              gap: 6,
              marginTop: 14,
              flexWrap: 'wrap',
            },
          },
          React.createElement(SemanticBadge, { accent: 'protein', variant: 'soft' }, 'Protein'),
          React.createElement(SemanticBadge, { accent: 'carbs', variant: 'soft' }, 'Carbs'),
          React.createElement(SemanticBadge, { accent: 'fat', variant: 'soft' }, 'Fat'),
          React.createElement(SemanticBadge, { accent: 'hydration', variant: 'soft' }, 'Water'),
        ),
      ),

      // ---------------- Wellness ----------------
      React.createElement(
        SectionCard,
        {
          SignatureCard,
          React,
          title: 'Wellness Goals',
          subtitle: 'Sleep, steps, and optional resting heart-rate target.',
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            },
          },
          React.createElement(SigFieldRow, {
            React,
            Input,
            label: 'SLEEP',
            value: Math.round(sleepHours * 10) / 10,
            unit: 'hours',
            step: 0.25,
            onChange: (v: number) =>
              setWellness({
                ...wellness,
                sleep_minutes: Math.max(0, Math.round((v ?? 0) * 60)),
              }),
          }),
          React.createElement(SigFieldRow, {
            React,
            Input,
            label: 'STEPS',
            value: wellness.steps,
            unit: 'steps',
            step: 500,
            onChange: (v: number) =>
              setWellness({ ...wellness, steps: v ?? 0 }),
          }),
          React.createElement(SigFieldRow, {
            React,
            Input,
            label: 'RESTING HR',
            value: wellness.resting_hr_bpm ?? '',
            unit: 'bpm',
            placeholder: 'optional',
            onChange: (v: number | undefined) =>
              setWellness({
                ...wellness,
                resting_hr_bpm: v === 0 ? undefined : v,
              }),
          }),
        ),
      ),

      // ---------------- Profile ----------------
      React.createElement(
        SectionCard,
        {
          SignatureCard,
          React,
          title: 'Profile',
          subtitle: 'Used to personalize goal suggestions.',
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            },
          },
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            React.createElement(
              'div',
              { className: 'knf-eyebrow', style: { fontSize: 10 } },
              age !== null ? `AGE · ${age}` : 'BIRTH DATE',
            ),
            React.createElement(Input, {
              type: 'date',
              value: profile.birth_date ?? '',
              onChange: (e: any) =>
                setProfile({
                  ...profile,
                  birth_date: e.target.value || undefined,
                }),
              className: 'h-9 tabular-nums',
              style: {
                background: 'var(--knf-surface)',
                border: '1px solid var(--knf-hairline)',
                borderRadius: 'var(--knf-radius-sm)',
              },
            }),
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            React.createElement(
              'div',
              { className: 'knf-eyebrow', style: { fontSize: 10 } },
              'SEX',
            ),
            React.createElement(
              Select,
              {
                value: profile.sex ?? '',
                onValueChange: (v: string) =>
                  setProfile({ ...profile, sex: (v || undefined) as any }),
              },
              React.createElement(
                SelectTrigger,
                {
                  className: 'h-9',
                  style: {
                    background: 'var(--knf-surface)',
                    border: '1px solid var(--knf-hairline)',
                    borderRadius: 'var(--knf-radius-sm)',
                  },
                },
                React.createElement(SelectValue, { placeholder: 'Select' }),
              ),
              React.createElement(
                SelectContent,
                { className: 'knosys-fitness-root' },
                React.createElement(SelectItem, { value: 'male' }, 'Male'),
                React.createElement(SelectItem, { value: 'female' }, 'Female'),
                React.createElement(SelectItem, { value: 'other' }, 'Other'),
              ),
            ),
          ),
        ),
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginTop: 12,
            },
          },
          React.createElement(SigFieldRow, {
            React,
            Input,
            label: 'HEIGHT',
            value: profile.height_cm ?? '',
            unit: 'cm',
            onChange: (v: number | undefined) =>
              setProfile({
                ...profile,
                height_cm: v === 0 ? undefined : v,
              }),
          }),
          React.createElement(SigFieldRow, {
            React,
            Input,
            label: 'GOAL WEIGHT',
            value: profile.goal_weight_kg ?? '',
            unit: 'kg',
            step: 0.1,
            onChange: (v: number | undefined) =>
              setProfile({
                ...profile,
                goal_weight_kg: v === 0 ? undefined : v,
              }),
          }),
        ),
        React.createElement(
          'div',
          { style: { marginTop: 12 } },
          React.createElement(
            'div',
            { className: 'knf-eyebrow', style: { fontSize: 10 } },
            'ACTIVITY LEVEL',
          ),
          React.createElement(
            Select,
            {
              value: profile.activity_level ?? 'moderate',
              onValueChange: (v: string) =>
                setProfile({ ...profile, activity_level: v as any }),
            },
            React.createElement(
              SelectTrigger,
              {
                className: 'h-9 mt-1.5',
                style: {
                  background: 'var(--knf-surface)',
                  border: '1px solid var(--knf-hairline)',
                  borderRadius: 'var(--knf-radius-sm)',
                },
              },
              React.createElement(SelectValue, null),
            ),
            React.createElement(
              SelectContent,
              { className: 'knosys-fitness-root' },
              ...Object.entries(ACTIVITY_LABELS).map(([key, label]) =>
                React.createElement(SelectItem, { key, value: key }, label),
              ),
            ),
          ),
        ),
      ),

      // ---------------- Units ----------------
      React.createElement(
        SectionCard,
        {
          SignatureCard,
          React,
          title: 'Units',
          subtitle: 'Switch between metric and imperial.',
        },
        React.createElement(
          'div',
          { style: { display: 'flex', gap: 6 } },
          ...[
            { value: 'metric', label: 'Metric · kg / cm' },
            { value: 'imperial', label: 'Imperial · lbs / in' },
          ].map((opt) => {
            const active = profile.unit_system === opt.value;
            return React.createElement(
              'button',
              {
                key: opt.value,
                type: 'button',
                onClick: () =>
                  setProfile({ ...profile, unit_system: opt.value as any }),
                style: {
                  flex: 1,
                  padding: '10px 12px',
                  fontFamily: 'var(--knf-font-body)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--knf-hero-ink)' : 'var(--knf-ink)',
                  background: active
                    ? 'var(--knf-hero-wash)'
                    : 'var(--knf-surface)',
                  border: `1px solid ${active ? 'var(--knf-hero-edge)' : 'var(--knf-hairline)'}`,
                  borderRadius: 'var(--knf-radius-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--knf-duration-1) var(--knf-ease)',
                },
              },
              opt.label,
            );
          }),
        ),
      ),

      // ---------------- API Keys ----------------
      React.createElement(
        SectionCard,
        {
          SignatureCard,
          React,
          title: 'API Keys',
          subtitle:
            'USDA FoodData is optional but gives far better nutrition coverage.',
        },
        React.createElement(
          'div',
          {
            style: {
              fontSize: 12,
              color: 'var(--knf-muted)',
              lineHeight: 1.5,
            },
          },
          'Add a free USDA key in Knosys → Settings → API Keys, then grant it to ',
          React.createElement(
            'span',
            {
              style: {
                fontFamily: 'var(--knf-font-mono)',
                color: 'var(--knf-ink)',
              },
            },
            'knosys-fitness',
          ),
          '.',
        ),
      ),

      // ---------------- Display ----------------
      React.createElement(
        SectionCard,
        {
          SignatureCard,
          React,
          title: 'Display',
          subtitle: 'Choose what shows by default.',
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 12,
            },
          },
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            React.createElement(
              'div',
              { className: 'knf-eyebrow', style: { fontSize: 10 } },
              'DEFAULT MEAL SECTION',
            ),
            React.createElement(
              Select,
              {
                value: 'breakfast',
                onValueChange: () => {},
              },
              React.createElement(
                SelectTrigger,
                {
                  className: 'h-9',
                  style: {
                    background: 'var(--knf-surface)',
                    border: '1px solid var(--knf-hairline)',
                    borderRadius: 'var(--knf-radius-sm)',
                  },
                },
                React.createElement(SelectValue, null),
              ),
              React.createElement(
                SelectContent,
                { className: 'knosys-fitness-root' },
                React.createElement(SelectItem, { value: 'breakfast' }, 'Breakfast'),
                React.createElement(SelectItem, { value: 'lunch' }, 'Lunch'),
                React.createElement(SelectItem, { value: 'dinner' }, 'Dinner'),
                React.createElement(SelectItem, { value: 'snacks' }, 'Snacks'),
              ),
            ),
            React.createElement(
              'div',
              {
                style: {
                  fontSize: 11,
                  color: 'var(--knf-muted)',
                  fontFamily: 'var(--knf-font-mono)',
                },
              },
              'Opened first when logging food.',
            ),
          ),
        ),
      ),

      // ---------------- Exercise catalog ----------------
      React.createElement(
        SectionCard,
        {
          SignatureCard,
          React,
          title: 'Exercise catalog',
          subtitle: 'Strength + cardio data sources and tools.',
        },
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          React.createElement(
            'div',
            {
              style: {
                fontSize: 12,
                color: 'var(--knf-muted)',
                fontFamily: 'var(--knf-font-mono)',
              },
            },
            catalogMeta
              ? `Catalog cached: ${catalogMeta.count} exercises \u00B7 fetched ${new Date(catalogMeta.fetched_at).toLocaleDateString()}`
              : 'Catalog has not been loaded yet. Open the Workouts tab to load it.',
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
            React.createElement(
              Button,
              {
                variant: 'outline',
                size: 'sm',
                onClick: handleRefreshCatalog,
                disabled: catalogBusy,
              },
              catalogBusy ? 'Refreshing\u2026' : 'Refresh catalog',
            ),
            React.createElement(
              Button,
              {
                variant: 'outline',
                size: 'sm',
                onClick: handleRebuildIndex,
                disabled: rebuildBusy,
              },
              rebuildBusy ? 'Rebuilding\u2026' : 'Rebuild history index',
            ),
          ),
          rebuildCount != null &&
            React.createElement(
              'div',
              {
                style: {
                  fontSize: 11,
                  color: 'var(--knf-muted)',
                  fontFamily: 'var(--knf-font-mono)',
                },
              },
              `Last rebuild: ${rebuildCount} entries indexed.`,
            ),
          React.createElement(
            'div',
            {
              style: {
                marginTop: 4,
                paddingTop: 10,
                borderTop: '1px solid var(--knf-hairline)',
                fontSize: 11,
                color: 'var(--knf-muted)',
                fontFamily: 'var(--knf-font-body)',
                lineHeight: 1.55,
              },
            },
            'Exercise data sourced from ',
            React.createElement(
              'a',
              {
                href: 'https://github.com/yuhonas/free-exercise-db',
                target: '_blank',
                rel: 'noreferrer',
                style: { color: 'var(--knf-ink-2)', textDecoration: 'underline' },
              },
              'yuhonas/free-exercise-db',
            ),
            ' (Unlicense) and ',
            React.createElement(
              'a',
              {
                href: 'https://wger.de',
                target: '_blank',
                rel: 'noreferrer',
                style: { color: 'var(--knf-ink-2)', textDecoration: 'underline' },
              },
              'wger.de',
            ),
            ' (CC-BY-SA 4.0). Optional fallback via ',
            React.createElement(
              'a',
              {
                href: 'https://api-ninjas.com',
                target: '_blank',
                rel: 'noreferrer',
                style: { color: 'var(--knf-ink-2)', textDecoration: 'underline' },
              },
              'API-Ninjas',
            ),
            '.',
          ),
        ),
      ),

      // ---------------- Danger zone ----------------
      React.createElement(
        'div',
        {
          style: {
            marginTop: 4,
            padding: 16,
            background: 'var(--knf-surface)',
            border: '1px solid rgba(255,59,48,0.25)',
            borderLeft: '3px solid var(--knf-alert)',
            borderRadius: 'var(--knf-radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          },
        },
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
          React.createElement(
            'div',
            {
              className: 'knf-display',
              style: {
                fontFamily: 'var(--knf-font-display)',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--knf-alert)',
              },
            },
            'Reset plugin data',
          ),
          React.createElement(
            'p',
            {
              style: {
                margin: 0,
                fontSize: 12,
                color: 'var(--knf-muted)',
                lineHeight: 1.5,
              },
            },
            'Deletes all meals, weights, exercises, recipes, templates, and settings. Cannot be undone.',
          ),
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => setResetOpen(true),
            style: {
              padding: '8px 14px',
              fontFamily: 'var(--knf-font-body)',
              fontSize: 12,
              fontWeight: 600,
              color: '#FFFFFF',
              background: 'var(--knf-alert)',
              border: '1px solid var(--knf-alert)',
              borderRadius: 'var(--knf-radius-pill)',
              cursor: 'pointer',
              flexShrink: 0,
            },
          },
          'Reset data',
        ),
      ),

      // Confirm dialog (scoped)
      React.createElement(
        Dialog,
        { open: resetOpen, onOpenChange: setResetOpen },
        React.createElement(
          DialogContent,
          { style: { maxWidth: 440 } },
          React.createElement(
            DialogHeader,
            null,
            React.createElement(
              DialogTitle,
              { style: { color: 'var(--knf-alert)' } },
              'Reset all plugin data?',
            ),
          ),
          React.createElement(
            'p',
            {
              style: {
                fontSize: 13,
                color: 'var(--knf-ink-2)',
                lineHeight: 1.55,
                margin: '4px 0 0',
              },
            },
            'This deletes every meal, weight, exercise, recipe, and template stored by knosys-fitness. Your host vault is untouched. This cannot be undone.',
          ),
          React.createElement(
            DialogFooter,
            null,
            React.createElement(
              Button,
              {
                variant: 'outline',
                onClick: () => setResetOpen(false),
                disabled: resetting,
              },
              'Cancel',
            ),
            React.createElement(
              Button,
              {
                onClick: resetAllData,
                disabled: resetting,
                style: {
                  background: 'var(--knf-alert)',
                  color: '#fff',
                  borderColor: 'var(--knf-alert)',
                },
              },
              resetting ? 'Clearing…' : 'Yes, delete everything',
            ),
          ),
        ),
      ),
    );
  };
}
