import Icon from '../../shared/Icon';

export default function Leaderboard({ active }) {
  return (
    <div id="module-leaderboard" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              全国各大战区销售排行榜 (National Leaderboard)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 text-xs font-semibold">
              奖金池 ¥50,000 瓜分中
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            军令状进度追踪、各大战区红蓝军 PK 与个人龙虎榜
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-400">数据每 15 分钟实时刷新</span>
      </div>
      {/* Warzone PK Bars */}
      <div className="bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Icon name="swords" className="w-4 h-4 text-rose-500" />
          四大战区月度业绩 PK 军令状
        </h3>
        <div className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                华东战区 (陈明 所属) 🥇
              </span>
              <span className="font-mono font-bold text-emerald-600">
                ¥3,850,000 / 400万 (96.2%)
              </span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full"
                style={{ width: '96.2%' }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                华南战区 🥈
              </span>
              <span className="font-mono font-bold text-blue-600">¥3,420,000 / 380万 (90.0%)</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full"
                style={{ width: '90.0%' }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                华北战区 🥉
              </span>
              <span className="font-mono font-bold text-purple-600">
                ¥2,980,000 / 350万 (85.1%)
              </span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full"
                style={{ width: '85.1%' }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                西部战区
              </span>
              <span className="font-mono font-bold text-amber-600">¥1,850,000 / 220万 (84.1%)</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-2.5 rounded-full"
                style={{ width: '84.1%' }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Sales Heroes Top 5 */}
      <div className="bg-white dark:bg-[#121316] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 font-bold text-sm">
          个人销售龙虎榜 Top 5
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-400 uppercase font-semibold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="py-3 px-4 w-12 text-center">排名</th>
              <th className="py-3 px-4">销售精英</th>
              <th className="py-3 px-4">归属战区</th>
              <th className="py-3 px-4">本月完成签约额</th>
              <th className="py-3 px-4">达成率</th>
              <th className="py-3 px-4">本月代表作大单</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr className="bg-amber-50/30 dark:bg-amber-950/20">
              <td className="py-3 px-4 text-center font-bold text-amber-500 text-sm">🥇 1</td>
              <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">陈明 (您)</td>
              <td className="py-3 px-4">华东战区</td>
              <td className="py-3 px-4 font-mono font-bold text-amber-600 text-sm">¥825,400</td>
              <td className="py-3 px-4 font-semibold text-emerald-600">82.5%</td>
              <td className="py-3 px-4 text-zinc-500">理想汽车车载语音模组</td>
            </tr>
            <tr>
              <td className="py-3 px-4 text-center font-bold text-zinc-400 text-sm">🥈 2</td>
              <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">林晓峰</td>
              <td className="py-3 px-4">华南战区</td>
              <td className="py-3 px-4 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                ¥680,000
              </td>
              <td className="py-3 px-4 font-semibold text-zinc-500">68.0%</td>
              <td className="py-3 px-4 text-zinc-500">比亚迪电池溯源套件</td>
            </tr>
            <tr>
              <td className="py-3 px-4 text-center font-bold text-amber-700 text-sm">🥉 3</td>
              <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">苏雅洁</td>
              <td className="py-3 px-4">华北战区</td>
              <td className="py-3 px-4 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                ¥550,000
              </td>
              <td className="py-3 px-4 font-semibold text-zinc-500">55.0%</td>
              <td className="py-3 px-4 text-zinc-500">中信建投大数据中台</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
