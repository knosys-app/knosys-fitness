import type { SharedDependencies } from '../types';

/**
 * Portal scoping wrapper.
 *
 * Radix primitives (Dialog, Popover, Sheet, DropdownMenu, Tooltip,
 * ContextMenu) portal their content to `document.body`, which lives
 * OUTSIDE `.knosys-fitness-root`. That means the signature CSS
 * variables don't cascade into portaled content — dialogs render in
 * host theme instead.
 *
 * This module exports a factory `createScopedShadcn(Shared)` that
 * returns the same surface as `Shared` for portaled primitives,
 * except each `*Content` component is wrapped so `className` is
 * merged with `'knosys-fitness-root'`. Radix forwards className to
 * the portaled content's outermost element, so our scoping class
 * lands inside the portal and re-establishes the signature tokens.
 *
 * Usage (from a page):
 * ```ts
 * const S = createScopedShadcn(Shared);
 * React.createElement(S.Dialog, { open }, ...
 *   React.createElement(S.DialogContent, ...)); // picks up signature
 * ```
 */

export function createScopedShadcn(Shared: SharedDependencies) {
  const { React, cn } = Shared;

  const {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetTrigger,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } = Shared;

  const SCOPE_CLASS = 'knosys-fitness-root';

  const wrap = (Comp: any, extraClass?: string) => {
    const Wrapped = (props: any) => {
      const merged = cn(SCOPE_CLASS, extraClass, props?.className);
      return React.createElement(Comp, { ...props, className: merged });
    };
    // Copy display name for DX if available.
    const name = (Comp as any).displayName || (Comp as any).name || 'ScopedComponent';
    (Wrapped as any).displayName = `Scoped(${name})`;
    return Wrapped;
  };

  return {
    // Dialog
    Dialog,
    DialogContent: wrap(DialogContent),
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,

    // Popover
    Popover,
    PopoverContent: wrap(PopoverContent),
    PopoverTrigger,

    // Sheet
    Sheet,
    SheetContent: wrap(SheetContent),
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetTrigger,

    // DropdownMenu
    DropdownMenu,
    DropdownMenuContent: wrap(DropdownMenuContent),
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,

    // Tooltip
    Tooltip,
    TooltipContent: wrap(TooltipContent),
    TooltipProvider,
    TooltipTrigger,
  };
}

export type ScopedShadcn = ReturnType<typeof createScopedShadcn>;
