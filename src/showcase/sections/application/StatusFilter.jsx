// The original toggles class sets on the buttons instead of re-rendering them, so "all" keeps
// its own base classes (no hover colours) and every button gets `text-zinc-500` when inactive.
const ACTIVE = 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs';
const INACTIVE = 'text-zinc-500';

const FILTERS = [
  { key: 'all', label: '全部 (128)', base: 'px-3 py-1 rounded-lg font-semibold transition-all' },
  {
    key: 'active',
    label: '正常 (112)',
    base: 'px-3 py-1 rounded-lg font-medium hover:text-zinc-900 dark:hover:text-zinc-100 transition-all',
  },
  {
    key: 'pending',
    label: '审核中 (12)',
    base: 'px-3 py-1 rounded-lg font-medium hover:text-zinc-900 dark:hover:text-zinc-100 transition-all',
  },
  {
    key: 'suspended',
    label: '已禁用 (4)',
    base: 'px-3 py-1 rounded-lg font-medium hover:text-zinc-900 dark:hover:text-zinc-100 transition-all',
  },
];

export default function StatusFilter({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`${f.base} ${active === f.key ? ACTIVE : INACTIVE}`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
