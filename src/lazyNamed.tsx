import React, { Suspense, lazy, type ComponentType } from 'react';

/**
 * `React.lazy` for modules that use named exports.
 *
 * `React.lazy` requires the module's default export. Almost every component in this codebase
 * is a named export, so without this helper each split point needs its own
 * `.then(m => ({ default: m.Thing }))` boilerplate.
 *
 * Part of the Phase 4 code-splitting work — see
 * `plans/2026-08-05-000000--forgel-mobile-first-design-tool-roadmap.md`.
 */
export function lazyNamed<T extends ComponentType<any>>(
  loader: () => Promise<Record<string, any>>,
  exportName: string,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const module = await loader();
    const component = module[exportName] ?? module.default;

    if (!component) {
      throw new Error(`lazyNamed: "${exportName}" is not exported by the loaded module.`);
    }

    return { default: component as T };
  });
}

/**
 * Fallback shown while a split chunk loads.
 *
 * Deliberately minimal and unobtrusive: on a fast connection a chunk resolves in a few
 * milliseconds, and a heavyweight skeleton would flash more than it reassures.
 */
export const ChunkFallback: React.FC<{ label?: string }> = ({ label }) => (
  <div
    className="w-full h-full min-h-[120px] flex items-center justify-center text-neutral-400 dark:text-zinc-600"
    role="status"
    aria-live="polite"
  >
    <div className="flex items-center gap-2 text-xs">
      <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
      <span>{label ? `Loading ${label}…` : 'Loading…'}</span>
    </div>
  </div>
);

/** Wraps `children` in a Suspense boundary with the standard fallback. */
export const ChunkBoundary: React.FC<{ children: React.ReactNode; label?: string }> = ({
  children,
  label,
}) => <Suspense fallback={<ChunkFallback label={label} />}>{children}</Suspense>;
