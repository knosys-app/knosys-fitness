/**
 * Barrel export for knosys-fitness design system primitives.
 *
 * Every primitive follows the `createFoo(Shared)` factory pattern —
 * this file re-exports those factories plus their prop interfaces
 * for downstream consumers.
 */

export { createSignatureCard } from './signature-card';
export type { SignatureCardProps } from './signature-card';

export { createStatTile } from './stat-tile';
export type { StatTileProps } from './stat-tile';

export { createMetricRing } from './metric-ring';
export type { MetricRingProps, MetricRingSegment } from './metric-ring';

export { createSparkline } from './sparkline';
export type { SparklineProps } from './sparkline';

export { createSemanticBadge } from './semantic-badge';
export type { SemanticBadgeProps } from './semantic-badge';

export { createDataBar } from './data-bar';
export type { DataBarProps } from './data-bar';

export { createNumericReadout } from './numeric-readout';
export type { NumericReadoutProps } from './numeric-readout';

export { createSegmentedControl } from './segmented-control';
export type {
  SegmentedControlProps,
  SegmentedOption,
} from './segmented-control';

export { createPageHeader } from './page-header';
export type { PageHeaderProps } from './page-header';
