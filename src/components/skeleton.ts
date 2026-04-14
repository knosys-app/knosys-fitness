import type { SharedDependencies } from '../types';

export function createSkeletonComponents(Shared: SharedDependencies) {
  const { React } = Shared;

  function Pulse({ width, height, style }: { width?: string | number; height?: string | number; style?: any }) {
    return React.createElement('div', {
      style: {
        width: typeof width === 'number' ? `${width}px` : width ?? '100%',
        height: typeof height === 'number' ? `${height}px` : height ?? '16px',
        backgroundColor: 'hsl(var(--muted))',
        borderRadius: '6px',
        animation: 'fitnessPulse 1.6s ease-in-out infinite',
        ...style,
      },
    });
  }

  // CSS for the pulse animation — injected once on first use
  let injected = false;
  function ensureCss() {
    if (injected || typeof document === 'undefined') return;
    injected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fitnessPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }

  function DiarySkeleton() {
    ensureCss();
    return React.createElement('div', { className: 'p-4 space-y-4 max-w-2xl mx-auto' },
      // Macro ring + bars skeleton
      React.createElement('div', { className: 'space-y-3' },
        React.createElement('div', { className: 'flex items-center gap-4' },
          React.createElement(Pulse, { width: 104, height: 104, style: { borderRadius: '9999px' } }),
          React.createElement('div', { className: 'flex-1 space-y-2' },
            React.createElement(Pulse, { height: 14 }),
            React.createElement(Pulse, { height: 14, width: '80%' }),
            React.createElement(Pulse, { height: 14, width: '60%' }),
          ),
        ),
        React.createElement(Pulse, { height: 8 }),
        React.createElement(Pulse, { height: 8 }),
        React.createElement(Pulse, { height: 8 }),
      ),
      // Meal section skeletons
      ...[0, 1, 2, 3].map(i =>
        React.createElement('div', { key: i, className: 'rounded-lg border p-3 space-y-2' },
          React.createElement(Pulse, { height: 16, width: '40%' }),
          React.createElement(Pulse, { height: 12, width: '25%' }),
        ),
      ),
    );
  }

  function ChartSkeleton({ height }: { height?: number }) {
    ensureCss();
    return React.createElement('div', { className: 'space-y-2' },
      React.createElement(Pulse, { height: 14, width: '30%' }),
      React.createElement(Pulse, { height: height ?? 200 }),
    );
  }

  return { Pulse, DiarySkeleton, ChartSkeleton };
}
