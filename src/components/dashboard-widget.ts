/**
 * Barrel re-export so `src/index.tsx` continues to import
 * `createDashboardWidgets` from this path without modification.
 * The real implementations now live in `src/widgets/*.ts`.
 */
export { createDashboardWidgets } from '../widgets';
