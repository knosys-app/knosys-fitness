import type {
  PluginAPI,
  SharedDependencies,
  HostPluginAPI,
  HostSharedDependencies,
} from './types';
import { initStore } from './hooks/use-fitness-store';
import { createFitnessPage } from './components/fitness-page';
import { createSettingsPanel } from './components/settings';
import { createDashboardWidgets } from './components/dashboard-widget';

/**
 * Knosys API v2 hands us a namespaced Shared object — primitives live
 * under `Shared.shadcn.*`. Plugin internals here still consume a flat
 * Shared (e.g. `const { Button } = Shared`), so we collapse the v2
 * shape back to flat at the activation boundary. No internal code
 * changes; the Signature design system stays exactly as-is because we
 * keep using the same shadcn primitives underneath.
 */
function flattenShared(host: HostSharedDependencies): SharedDependencies {
  return {
    ...host.shadcn,
    React: host.React,
    dateFns: host.dateFns,
    recharts: host.recharts,
    ChartContainer: host.ChartContainer,
    ChartTooltip: host.ChartTooltip,
    ChartTooltipContent: host.ChartTooltipContent,
    ChartLegend: host.ChartLegend,
    ChartLegendContent: host.ChartLegendContent,
    useAppData: host.hooks.useAppData,
    useNavigate: host.useNavigate,
    useState: host.useState,
    useEffect: host.useEffect,
    useCallback: host.useCallback,
    useMemo: host.useMemo,
    useRef: host.useRef,
    cn: host.cn,
    lucideIcons: host.lucideIcons,
  };
}

/**
 * v2 dropped `api.ui.showToast(message, type)` in favor of typed
 * `api.ui.toast({...})`. Wrap the host so the ~17 internal call sites
 * across this plugin can keep using the shorter signature.
 */
function adaptApi(host: HostPluginAPI): PluginAPI {
  return {
    pluginId: host.pluginId,
    permissions: host.permissions,
    hasPermission: host.hasPermission,
    storage: host.storage,
    core: host.core,
    ui: {
      registerRoute: host.ui.registerRoute,
      registerSidebarItem: host.ui.registerSidebarItem,
      registerWidget: host.ui.registerWidget,
      registerSettingsPanel: host.ui.registerSettingsPanel,
      showToast: (message, type) => host.ui.toast({ message, type }),
    },
  };
}

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

export function activate(hostApi: HostPluginAPI, hostShared: HostSharedDependencies) {
  const api = adaptApi(hostApi);
  const Shared = flattenShared(hostShared);
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
