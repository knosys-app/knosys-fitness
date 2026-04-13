import type { ComponentType } from 'react';

// ============================================================
// Plugin System Types (mirrors Knosys plugin API)
// ============================================================

export interface PluginStorageAPI {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  keys: () => Promise<string[]>;
}

export interface PluginCoreAPI {
  getLocations: () => Promise<any[]>;
  getVaultPath: () => Promise<string>;
  getApiKey: (keyId: string) => Promise<string | null>;
}

export interface PluginUIAPI {
  registerRoute: (route: { path: string; component: ComponentType<any>; children?: any[] }) => void;
  registerSidebarItem: (item: { id: string; title: string; icon: string; route: string; order: number }) => void;
  registerWidget: (widget: { id: string; title: string; component: ComponentType<any>; defaultSize: 'small' | 'medium' | 'large' }) => void;
  registerSettingsPanel: (panel: { id: string; component: ComponentType<any>; order?: number }) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export interface PluginAPI {
  pluginId: string;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  storage: PluginStorageAPI;
  core: PluginCoreAPI;
  ui: PluginUIAPI;
}

export interface SharedDependencies {
  React: typeof import('react');
  // UI Components
  Badge: ComponentType<any>;
  Button: ComponentType<any>;
  Calendar: ComponentType<any>;
  Card: ComponentType<any>;
  CardContent: ComponentType<any>;
  CardDescription: ComponentType<any>;
  CardFooter: ComponentType<any>;
  CardHeader: ComponentType<any>;
  CardTitle: ComponentType<any>;
  Checkbox: ComponentType<any>;
  Dialog: ComponentType<any>;
  DialogContent: ComponentType<any>;
  DialogDescription: ComponentType<any>;
  DialogFooter: ComponentType<any>;
  DialogHeader: ComponentType<any>;
  DialogTitle: ComponentType<any>;
  DialogTrigger: ComponentType<any>;
  DropdownMenu: ComponentType<any>;
  DropdownMenuContent: ComponentType<any>;
  DropdownMenuItem: ComponentType<any>;
  DropdownMenuLabel: ComponentType<any>;
  DropdownMenuSeparator: ComponentType<any>;
  DropdownMenuTrigger: ComponentType<any>;
  Input: ComponentType<any>;
  Label: ComponentType<any>;
  Popover: ComponentType<any>;
  PopoverContent: ComponentType<any>;
  PopoverTrigger: ComponentType<any>;
  Progress: ComponentType<any>;
  ScrollArea: ComponentType<any>;
  ScrollBar: ComponentType<any>;
  Select: ComponentType<any>;
  SelectContent: ComponentType<any>;
  SelectItem: ComponentType<any>;
  SelectTrigger: ComponentType<any>;
  SelectValue: ComponentType<any>;
  Separator: ComponentType<any>;
  Sheet: ComponentType<any>;
  SheetContent: ComponentType<any>;
  SheetDescription: ComponentType<any>;
  SheetFooter: ComponentType<any>;
  SheetHeader: ComponentType<any>;
  SheetTitle: ComponentType<any>;
  SheetTrigger: ComponentType<any>;
  Skeleton: ComponentType<any>;
  Slider: ComponentType<any>;
  Switch: ComponentType<any>;
  Tabs: ComponentType<any>;
  TabsContent: ComponentType<any>;
  TabsList: ComponentType<any>;
  TabsTrigger: ComponentType<any>;
  Textarea: ComponentType<any>;
  Tooltip: ComponentType<any>;
  TooltipContent: ComponentType<any>;
  TooltipProvider: ComponentType<any>;
  TooltipTrigger: ComponentType<any>;
  // Date utilities
  dateFns: {
    format: (...args: any[]) => string;
    addDays: (date: Date, amount: number) => Date;
    subDays: (date: Date, amount: number) => Date;
    startOfWeek: (date: Date) => Date;
    endOfWeek: (date: Date) => Date;
    startOfMonth: (date: Date) => Date;
    endOfMonth: (date: Date) => Date;
    isToday: (date: Date) => boolean;
    isSameDay: (a: Date, b: Date) => boolean;
    differenceInDays: (a: Date, b: Date) => number;
    parseISO: (str: string) => Date;
  };
  // Charting
  recharts: any;
  ChartContainer: ComponentType<any>;
  ChartTooltip: ComponentType<any>;
  ChartTooltipContent: ComponentType<any>;
  ChartLegend: ComponentType<any>;
  ChartLegendContent: ComponentType<any>;
  // App hooks
  useAppData: () => any;
  useNavigate: () => any;
  // React hooks
  useState: typeof import('react').useState;
  useEffect: typeof import('react').useEffect;
  useCallback: typeof import('react').useCallback;
  useMemo: typeof import('react').useMemo;
  useRef: typeof import('react').useRef;
  // Utilities
  cn: (...args: any[]) => string;
  lucideIcons: Record<string, ComponentType<any>>;
}

// ============================================================
// Fitness Domain Types
// ============================================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export type FoodSource = 'openfoodfacts' | 'usda' | 'custom' | 'recipe';

/** Unified food representation across all sources */
export interface NormalizedFood {
  id: string;
  source: FoodSource;
  name: string;
  brand?: string;
  serving_size_g: number;
  serving_label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
  saturated_fat_g?: number;
  potassium_mg?: number;
  vitamin_a_mcg?: number;
  vitamin_c_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
}

/** A food entry in a meal log */
export interface FoodEntry {
  id: string;
  food: NormalizedFood;
  servings: number;
}

/** A single meal within a day (stored per-meal for sync safety) */
export interface MealLog {
  entries: FoodEntry[];
}

/** Exercise entry */
export interface ExerciseEntry {
  id: string;
  name: string;
  duration_min: number;
  calories_burned: number;
}

/** Exercise log for a day */
export interface ExerciseLog {
  entries: ExerciseEntry[];
}

/** Weight entry for a day */
export interface WeightEntry {
  weight_kg: number;
  notes?: string;
}

/** Water intake for a day */
export interface WaterEntry {
  ml: number;
}

/** User goals */
export interface Goals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}

/** User profile */
export interface UserProfile {
  setup_complete?: boolean;
  height_cm?: number;
  current_weight_kg?: number;
  goal_weight_kg?: number;
  birth_date?: string;
  sex?: 'male' | 'female' | 'other';
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  unit_system: 'metric' | 'imperial';
}

/** Recipe */
export interface Recipe {
  id: string;
  name: string;
  servings: number;
  ingredients: {
    food: NormalizedFood;
    servings: number;
  }[];
  notes?: string;
}

/** Meal template */
export interface MealTemplate {
  id: string;
  name: string;
  items: {
    food: NormalizedFood;
    servings: number;
  }[];
}

/** Frequent food entry */
export interface FrequentFood {
  food: NormalizedFood;
  count: number;
  last_used: string;
}

/** Pre-aggregated daily summary for charts */
export interface DailySummary {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  exercise_calories: number;
  weight_kg?: number;
}

/** Monthly summary cache */
export interface MonthlySummary {
  days: Record<string, DailySummary>;
}

/** Plugin settings */
export interface FitnessSettings {
  default_meal: MealType;
  show_micros: boolean;
  chart_range: '7d' | '30d' | '90d';
}
