export default function Pagination() {
  return (
    <>
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span>每页展示:</span>
          <select
            className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
            defaultValue="25 条"
          >
            <option>10 条</option>
            <option>25 条</option>
            <option>50 条</option>
          </select>
          <span className="ml-2">共 128 位成员</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-400 disabled:opacity-40"
            disabled
          >
            上一页
          </button>
          <button className="px-3 py-1 rounded-lg bg-primary text-white font-bold">1</button>
          <button className="px-3 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800">
            2
          </button>
          <button className="px-3 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800">
            3
          </button>
          <span className="px-1 text-zinc-400">...</span>
          <button className="px-3 py-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800">
            12
          </button>
          <button className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
            下一页
          </button>
        </div>
      </div>
    </>
  );
}
