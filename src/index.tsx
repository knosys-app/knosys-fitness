import type { PluginAPI, SharedDependencies } from './types';
import { initStore } from './hooks/use-fitness-store';
import { createFitnessPage } from './components/fitness-page';
import { createSettingsPanel } from './components/settings';
import { createDashboardWidget } from './components/dashboard-widget';

export function activate(api: PluginAPI, Shared: SharedDependencies) {
  // Initialize the storage layer
  initStore(api);

  // Create components
  const FitnessPage = createFitnessPage(Shared);
  const SettingsPanel = createSettingsPanel(Shared);
  const DashboardWidget = createDashboardWidget(Shared);

  // Register route
  api.ui.registerRoute({
    path: '/fitness',
    component: FitnessPage,
  });

  // Register sidebar item
  api.ui.registerSidebarItem({
    id: 'fitness',
    title: 'Fitness',
    icon: 'Dumbbell',
    route: '/fitness',
    order: 50,
  });

  // Register settings panel
  api.ui.registerSettingsPanel({
    id: 'fitness-settings',
    component: SettingsPanel,
    order: 50,
  });

  // Register dashboard widget
  api.ui.registerWidget({
    id: 'fitness-today',
    title: 'Today\'s Nutrition',
    component: DashboardWidget,
    defaultSize: 'small',
  });
}

export function deactivate() {
  // Cleanup if needed
}
