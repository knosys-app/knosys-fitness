import type { SharedDependencies } from '../types';

/**
 * Signature skeletons — hairline borders, chartreuse-wash pulse.
 *
 * Exports three factory-returning skeletons:
 *  - createDiarySkeleton(Shared)  → meal-card skeleton stack
 *  - createChartSkeleton(Shared)  → chart card skeleton
 *  - createTileSkeleton(Shared)   → stat-tile skeleton
 *
 * Also keeps the previous `createSkeletonComponents(Shared)` entry point
 * (returning Pulse / DiarySkeleton / ChartSkeleton) for back-compat with
 * any consumers still importing that shape. All pulses use the `knf-pulse`
 * utility from styles.css so animation scopes to plugin root.
 */
export function createSkeletonComponents(Shared: SharedDependencies) {
  const { React, cn } = Shared;

  function Pulse({
    width,
    height,
    radius,
    style,
    className,
  }: {
    width?: string | number;
    height?: string | number;
    radius?: string | number;
    style?: any;
    className?: string;
  }) {
    return React.createElement('div', {
      className: cn('knf-pulse', className),
      style: {
        width: typeof width === 'number' ? `${width}px` : width ?? '100%',
        height: typeof height === 'number' ? `${height}px` : height ?? '14px',
        background:
          'linear-gradient(90deg, var(--knf-surface-2) 0%, var(--knf-hero-wash) 50%, var(--knf-surface-2) 100%)',
        backgroundSize: '200% 100%',
        borderRadius:
          typeof radius === 'number'
            ? `${radius}px`
            : radius ?? 'var(--knf-radius-sm)',
        ...style,
      },
    });
  }

  function TileSkeleton() {
    return React.createElement(
      'div',
      {
        style: {
          background: 'var(--knf-surface)',
          border: '1px solid var(--knf-hairline)',
          borderRadius: 'var(--knf-radius-md)',
          padding: '12px 14px',
          minHeight: 82,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          boxShadow: 'var(--knf-shadow-sm)',
        },
      },
      React.createElement(Pulse, { height: 11, width: '45%' }),
      React.createElement(Pulse, { height: 24, width: '70%' }),
      React.createElement(Pulse, { height: 10, width: '35%' }),
    );
  }

  function ChartSkeleton({ height = 200 }: { height?: number }) {
    return React.createElement(
      'div',
      {
        style: {
          background: 'var(--knf-surface)',
          border: '1px solid var(--knf-hairline)',
          borderRadius: 'var(--knf-radius-lg)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: 'var(--knf-shadow-sm)',
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between' } },
        React.createElement(Pulse, { height: 12, width: 100 }),
        React.createElement(Pulse, { height: 12, width: 60 }),
      ),
      React.createElement(Pulse, { height, radius: 'var(--knf-radius-md)' }),
    );
  }

  function DiarySkeleton() {
    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxWidth: 720,
          margin: '0 auto',
          padding: 16,
        },
      },
      // Macro header
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 16,
            background: 'var(--knf-surface)',
            border: '1px solid var(--knf-hairline)',
            borderRadius: 'var(--knf-radius-lg)',
            boxShadow: 'var(--knf-shadow-sm)',
          },
        },
        React.createElement(Pulse, {
          width: 96,
          height: 96,
          radius: '9999px',
        }),
        React.createElement(
          'div',
          { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 8 } },
          React.createElement(Pulse, { height: 14, width: '50%' }),
          React.createElement(Pulse, { height: 14, width: '80%' }),
          React.createElement(Pulse, { height: 14, width: '60%' }),
        ),
      ),
      // Meal cards
      ...[0, 1, 2, 3].map((i) =>
        React.createElement(
          'div',
          {
            key: i,
            style: {
              background: 'var(--knf-surface)',
              border: '1px solid var(--knf-hairline)',
              borderRadius: 'var(--knf-radius-lg)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: 'var(--knf-shadow-sm)',
            },
          },
          React.createElement(Pulse, { height: 14, width: '35%' }),
          React.createElement(Pulse, { height: 10, width: '22%' }),
        ),
      ),
    );
  }

  return { Pulse, DiarySkeleton, ChartSkeleton, TileSkeleton };
}

// Convenience standalone factories -----------------------------------------

export function createDiarySkeleton(Shared: SharedDependencies) {
  return createSkeletonComponents(Shared).DiarySkeleton;
}

export function createChartSkeleton(Shared: SharedDependencies) {
  return createSkeletonComponents(Shared).ChartSkeleton;
}

export function createTileSkeleton(Shared: SharedDependencies) {
  return createSkeletonComponents(Shared).TileSkeleton;
}
