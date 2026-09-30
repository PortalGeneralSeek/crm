export default function KpiCard({ label, badge, value, sparkStroke, sparkPath, footNote, footTag }) {
  return (
    <div className="bg-white dark:bg-[#151619] p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs hover:border-primary/50 transition-all space-y-3 group">
      <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
        <span>{label}</span>
        {badge}
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{value}</div>
        <svg className={`w-20 h-8 ${sparkStroke} fill-none`} viewBox="0 0 100 40">
          <path d={sparkPath} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
        <span>{footNote}</span>
        <span className="font-mono text-zinc-500">{footTag}</span>
      </div>
    </div>
  );
}
