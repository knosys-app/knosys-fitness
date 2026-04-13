import type { SharedDependencies, MealType, MealTemplate, NormalizedFood } from '../types';
import { MEAL_TYPES, MEAL_LABELS } from '../types';
import { dayTotals } from '../utils/nutrients';
import { toDateKey, uuid } from '../utils/date-helpers';
import { createUseDiary, getStorage, getApi } from '../hooks/use-fitness-store';
import { createDateNavigator } from './date-navigator';
import { createMacroProgress } from './macro-progress';
import { createMealSection } from './meal-section';
import { createFoodSearchDialog } from './food-search';
import { createFoodEntryForm } from './food-entry-form';
import { createWaterTracker } from './water-tracker';
import { createExerciseLog } from './exercise-log';

export function createDailyDiary(Shared: SharedDependencies) {
  const { React, ScrollArea, Button, lucideIcons, dateFns, cn } = Shared;

  // Staggered fade-in wrapper
  function AnimatedItem({ delay, children }: { delay: number; children: any }) {
    const [visible, setVisible] = React.useState(false);
    React.useEffect(() => {
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    }, [delay]);
    return React.createElement('div', {
      style: {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 400ms ease, transform 400ms ease',
      },
    }, children);
  }
  const { Plus } = lucideIcons;

  const DateNavigator = createDateNavigator(Shared);
  const MacroProgress = createMacroProgress(Shared);
  const MealSection = createMealSection(Shared);
  const FoodSearchDialog = createFoodSearchDialog(Shared);
  const FoodEntryForm = createFoodEntryForm(Shared);
  const WaterTracker = createWaterTracker(Shared);
  const ExerciseLog = createExerciseLog(Shared);
  const useDiary = createUseDiary(Shared);

  return function DailyDiary() {
    const api = getApi();
    const [date, setDate] = React.useState(new Date());
    const dateKey = toDateKey(date);
    const diary = useDiary(dateKey);

    const [searchOpen, setSearchOpen] = React.useState(false);
    const [customFoodOpen, setCustomFoodOpen] = React.useState(false);
    const [activeMeal, setActiveMeal] = React.useState<MealType>('breakfast');

    const totals = dayTotals(diary.meals);

    const handleAddFood = (mealType: MealType) => {
      setActiveMeal(mealType);
      setSearchOpen(true);
    };

    const handleFoodSelected = async (food: NormalizedFood, servings: number) => {
      await diary.addFoodEntry(activeMeal, food, servings);
    };

    const handleCustomFoodSaved = (food: NormalizedFood) => {
      // After saving a custom food, open search dialog so user can add it
      setSearchOpen(true);
    };

    const handleSaveAsTemplate = async (mealType: MealType) => {
      const meal = diary.meals[mealType];
      if (meal.entries.length === 0) return;
      const template: MealTemplate = {
        id: uuid(),
        name: `${MEAL_LABELS[mealType]} — ${dateFns.format(date, 'MMM d')}`,
        items: meal.entries.map(e => ({ food: e.food, servings: e.servings })),
      };
      await getStorage().setTemplate(template);
      api.ui.showToast(`Saved "${template.name}" as template`, 'success');
    };

    if (diary.loading) {
      return React.createElement('div', {
        className: 'flex items-center justify-center h-full text-muted-foreground',
      }, 'Loading...');
    }

    return React.createElement('div', { className: 'flex flex-col h-full' },
      // Header with date navigation
      React.createElement('div', { className: 'flex items-center justify-between px-4 py-3 border-b' },
        React.createElement(DateNavigator, { date, onDateChange: setDate }),
        React.createElement(Button, {
          variant: 'outline', size: 'sm',
          onClick: () => setCustomFoodOpen(true),
        },
          React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
          'Custom Food',
        ),
      ),

      // Scrollable content
      React.createElement(ScrollArea, { className: 'flex-1' },
        React.createElement('div', { className: 'p-4 space-y-4 max-w-2xl mx-auto' },
          // Calorie & macro summary (has its own animations)
          React.createElement(MacroProgress, {
            calories: totals.calories,
            protein_g: totals.protein_g,
            carbs_g: totals.carbs_g,
            fat_g: totals.fat_g,
            goals: diary.goals,
          }),

          // Meal sections — staggered
          ...MEAL_TYPES.map((mealType, i) =>
            React.createElement(AnimatedItem, { key: mealType, delay: 150 + i * 100 },
              React.createElement(MealSection, {
                mealType,
                meal: diary.meals[mealType],
                onAddFood: () => handleAddFood(mealType),
                onRemoveEntry: (id: string) => diary.removeFoodEntry(mealType, id),
                onUpdateServings: (id: string, servings: number) => diary.updateFoodEntry(mealType, id, servings),
                onSaveAsTemplate: () => handleSaveAsTemplate(mealType),
              }),
            ),
          ),

          // Exercise
          React.createElement(AnimatedItem, { delay: 550 },
            React.createElement(ExerciseLog, {
              exercise: diary.exercise,
              onAddExercise: diary.addExercise,
              onRemoveExercise: diary.removeExercise,
            }),
          ),

          // Water
          React.createElement(AnimatedItem, { delay: 650 },
            React.createElement(WaterTracker, {
              water: diary.water,
              goals: diary.goals,
              onAddWater: diary.addWater,
              onSetWater: diary.setWaterAmount,
            }),
          ),
        ),
      ),

      // Dialogs
      React.createElement(FoodSearchDialog, {
        open: searchOpen,
        onOpenChange: setSearchOpen,
        mealType: activeMeal,
        onAddFood: handleFoodSelected,
        onCreateCustom: () => setCustomFoodOpen(true),
      }),
      React.createElement(FoodEntryForm, {
        open: customFoodOpen,
        onOpenChange: setCustomFoodOpen,
        onSave: handleCustomFoodSaved,
      }),
    );
  };
}
