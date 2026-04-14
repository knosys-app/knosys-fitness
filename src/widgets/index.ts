import type { SharedDependencies } from '../types';
import { createNutritionWidget } from './nutrition-widget';
import { createWaterWidget } from './water-widget';
import { createWeightWidget } from './weight-widget';
import { createStreakWidget } from './streak-widget';

/**
 * Builds the four dashboard widgets the host's widget surface expects.
 * Each widget wraps itself in `.knosys-fitness-root.knosys-fitness-widget`
 * so the signature theme applies even when rendered outside the /fitness
 * route (host dashboard context) in a monochromatic variant.
 */
export function createDashboardWidgets(Shared: SharedDependencies) {
  return {
    NutritionWidget: createNutritionWidget(Shared),
    WaterWidget: createWaterWidget(Shared),
    WeightWidget: createWeightWidget(Shared),
    StreakWidget: createStreakWidget(Shared),
  };
}

export { createNutritionWidget } from './nutrition-widget';
export { createWaterWidget } from './water-widget';
export { createWeightWidget } from './weight-widget';
export { createStreakWidget } from './streak-widget';
