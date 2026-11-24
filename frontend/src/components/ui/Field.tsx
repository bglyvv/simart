import type { ReactNode } from 'react';

/** Shared label + input + hint/error wrapper — DESIGN_SYSTEM.md §5 Inputs
 *  ("visible labels, helpful validation messages"). Replaces the small local
 *  `Field` function every auth page used to redefine for itself. */
export default function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-body-sm font-semibold text-text-700">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-caption font-medium text-error">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-caption text-text-400">{hint}</span>
      ) : null}
    </label>
  );
}
