// Code shown in the demo chat's code windows.
export const LOGIN_CARD_CODE = `export function LoginCard() {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <h3 className="text-lg font-bold">Welcome Back</h3>
      <p className="text-xs text-zinc-500 mt-1">Log in to your account to continue</p>
      <div className="mt-4 space-y-2">
        <button className="w-full py-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium">
          Continue with Google
        </button>
      </div>
    </div>
  );
}`;

export const RESPONSIVE_COMPONENT_CODE = `import React from 'react';

export function ProWidget({ title, badge = "Active" }: { title: string; badge?: string }) {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h4>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          {badge}
        </span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
        完美对齐 Figma Token: var(--radius-lg) 与 var(--color-primary)。
      </p>
    </div>
  );
}`;
