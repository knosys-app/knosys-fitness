import type { SharedDependencies } from '../types';
import { createDailyDiary } from './daily-diary';
import { createWeightTracker } from './weight-tracker';
import { createProgressCharts } from './progress-charts';
import { createRecipeBuilder } from './recipe-builder';
import { createMealTemplates } from './meal-templates';

export function createFitnessPage(Shared: SharedDependencies) {
  const { React, Tabs, TabsContent, TabsList, TabsTrigger, ScrollArea, lucideIcons } = Shared;
  const { Utensils, Scale, BarChart3, ChefHat, BookmarkPlus } = lucideIcons;

  const DailyDiary = createDailyDiary(Shared);
  const WeightTracker = createWeightTracker(Shared);
  const ProgressCharts = createProgressCharts(Shared);
  const RecipeBuilder = createRecipeBuilder(Shared);
  const MealTemplates = createMealTemplates(Shared);

  return function FitnessPage() {
    return React.createElement('div', { className: 'flex flex-col h-full' },
      React.createElement(Tabs, { defaultValue: 'diary', className: 'flex flex-col h-full' },
        React.createElement(TabsList, { className: 'mx-4 mt-2 w-auto self-start' },
          React.createElement(TabsTrigger, { value: 'diary', className: 'gap-1.5' },
            React.createElement(Utensils, { className: 'h-3.5 w-3.5' }),
            'Diary',
          ),
          React.createElement(TabsTrigger, { value: 'weight', className: 'gap-1.5' },
            React.createElement(Scale, { className: 'h-3.5 w-3.5' }),
            'Weight',
          ),
          React.createElement(TabsTrigger, { value: 'progress', className: 'gap-1.5' },
            React.createElement(BarChart3, { className: 'h-3.5 w-3.5' }),
            'Progress',
          ),
          React.createElement(TabsTrigger, { value: 'recipes', className: 'gap-1.5' },
            React.createElement(ChefHat, { className: 'h-3.5 w-3.5' }),
            'Recipes',
          ),
          React.createElement(TabsTrigger, { value: 'templates', className: 'gap-1.5' },
            React.createElement(BookmarkPlus, { className: 'h-3.5 w-3.5' }),
            'Templates',
          ),
        ),

        React.createElement(TabsContent, { value: 'diary', className: 'flex-1 mt-0' },
          React.createElement(DailyDiary, null),
        ),
        React.createElement(TabsContent, { value: 'weight', className: 'flex-1 mt-0 p-4' },
          React.createElement('div', { className: 'max-w-2xl mx-auto' },
            React.createElement(WeightTracker, null),
          ),
        ),
        React.createElement(TabsContent, { value: 'progress', className: 'flex-1 mt-0 p-4' },
          React.createElement('div', { className: 'max-w-2xl mx-auto' },
            React.createElement(ProgressCharts, null),
          ),
        ),
        React.createElement(TabsContent, { value: 'recipes', className: 'flex-1 mt-0 p-4' },
          React.createElement('div', { className: 'max-w-2xl mx-auto' },
            React.createElement(RecipeBuilder, null),
          ),
        ),
        React.createElement(TabsContent, { value: 'templates', className: 'flex-1 mt-0 p-4' },
          React.createElement('div', { className: 'max-w-2xl mx-auto' },
            React.createElement(MealTemplates, null),
          ),
        ),
      ),
    );
  };
}
