import type { PluginAPI, SharedDependencies } from './types';
import { initStore } from './hooks/use-fitness-store';
import { createFitnessPage } from './components/fitness-page';
import { createSettingsPanel } from './components/settings';
import { createDashboardWidgets } from './components/dashboard-widget';

/**
 * Inject Google Fonts for the signature design system.
 * - Bricolage Grotesque (display, variable)
 * - JetBrains Mono (numeric, variable)
 * Body uses system-ui so there is no FOUT on base copy; display
 * headlines swap in once Bricolage arrives. `display=swap` prevents
 * render-blocking.
 */
function injectSignatureFonts() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('knf-fonts-preconnect')) return;

  const pre1 = document.createElement('link');
  pre1.id = 'knf-fonts-preconnect';
  pre1.rel = 'preconnect';
  pre1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(pre1);

  const pre2 = document.createElement('link');
  pre2.rel = 'preconnect';
  pre2.href = 'https://fonts.gstatic.com';
  pre2.crossOrigin = 'anonymous';
  document.head.appendChild(pre2);

  const sheet = document.createElement('link');
  sheet.id = 'knf-fonts-sheet';
  sheet.rel = 'stylesheet';
  sheet.href =
    'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=JetBrains+Mono:wght@100..800&display=swap';
  document.head.appendChild(sheet);
}

export function activate(api: PluginAPI, Shared: SharedDependencies) {
  injectSignatureFonts();
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
