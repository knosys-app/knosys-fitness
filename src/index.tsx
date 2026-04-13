import type { PluginAPI, SharedDependencies } from './types';
import { initStore } from './hooks/use-fitness-store';
import { createFitnessPage } from './components/fitness-page';
import { createSettingsPanel } from './components/settings';
import { createDashboardWidgets } from './components/dashboard-widget';

export function activate(api: PluginAPI, Shared: SharedDependencies) {
  initStore(api);

  const FitnessPage = createFitnessPage(Shared);
  const SettingsPanel = createSettingsPanel(Shared);
  const { NutritionWidget, WaterWidget, WeightWidget, StreakWidget } = createDashboardWidgets(Shared);

  // Route
  api.ui.registerRoute({
    path: '/fitness',
    component: FitnessPage,
  });

  // Sidebar
  api.ui.registerSidebarItem({
    id: 'fitness',
    title: 'Fitness',
    icon: 'Dumbbell',
    route: '/fitness',
    order: 50,
  });

  // Settings
  api.ui.registerSettingsPanel({
    id: 'fitness-settings',
    component: SettingsPanel,
    order: 50,
  });

  // Dashboard widgets — four registerable widgets
  api.ui.registerWidget({
    id: 'fitness-today',
    title: 'Today\'s Nutrition',
    component: NutritionWidget,
    defaultSize: 'small',
  });
  api.ui.registerWidget({
    id: 'fitness-water',
    title: 'Water Today',
    component: WaterWidget,
    defaultSize: 'small',
  });
  api.ui.registerWidget({
    id: 'fitness-weight',
    title: 'Weight Trend',
    component: WeightWidget,
    defaultSize: 'small',
  });
  api.ui.registerWidget({
    id: 'fitness-streak',
    title: 'Logging Streak',
    component: StreakWidget,
    defaultSize: 'small',
  });
}

export function deactivate() {
  // Cleanup if needed
}
