import { useState } from 'react';
import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';

export default function Products({ active }) {
  const showToast = useToast();
  const [seats, setSeats] = useState(80);
  const [hasAi, setHasAi] = useState(true);
  const [hasPrivate, setHasPrivate] = useState(false);
  const [hasSla, setHasSla] = useState(true);
  const [discountRatio, setDiscountRatio] = useState('0.85');

  let origTotal = seats * 1200;
  if (hasAi) origTotal += 18000;
  if (hasPrivate) origTotal += 280000;
  if (hasSla) origTotal += 80000;
  const finalTotal = Math.round(origTotal * parseFloat(discountRatio));
  const discountAmount = origTotal - finalTotal;

  const seatsLabel = `${seats} 席`;
  const finalPrice = `¥${finalTotal.toLocaleString()}`;

  const generateFormalQuote = () => {
    showToast(`已生成正式商业报价单 (金额: ${finalPrice} · ${seatsLabel})，已开启下载！`);
  };

  return (
    <div id="module-products" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              产品目录与 CPQ 报价配置器
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 text-xs font-semibold">
              实时精准算价
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            支持席位阶梯折扣、算力插件配额与原厂技术支持 SLA 组合输出标准化正式报价单
          </p>
        </div>
        <button
          onClick={generateFormalQuote}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md flex items-center gap-1.5"
        >
          <Icon name="printer" className="w-3.5 h-3.5" />
          <span>生成正式商业报价单 PDF</span>
        </button>
      </div>
      {/* Product Catalog & Interactive Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Standard Catalog (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Icon name="box" className="w-4 h-4 text-brand-500" />
            企业标准产品价目表
          </h3>
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  领航 CRM 企业旗舰版 (席位)
                </div>
                <div className="text-[11px] text-zinc-400">包含全模块销售自动化、公海流转与 BI</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-brand-600">¥1,200</div>
                <div className="text-[10px] text-zinc-400">/账号/年</div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  AI 销售 Copilot 智能套件
                </div>
                <div className="text-[11px] text-zinc-400">
                  大模型赋能话术生成、商机诊断、自动纪要
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-purple-600">¥18,000</div>
                <div className="text-[10px] text-zinc-400">/企业企业包/年</div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  私有化本地集群交付组件
                </div>
                <div className="text-[11px] text-zinc-400">
                  支持信创环境、国产服务器 GPU 私有部署
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  ¥280,000
                </div>
                <div className="text-[10px] text-zinc-400">/套 (买断)</div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  7×24 驻场交付保障 SLA
                </div>
                <div className="text-[11px] text-zinc-400">专属客户成功架构师 1 对 1 保障</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  ¥80,000
                </div>
                <div className="text-[10px] text-zinc-400">/年</div>
              </div>
            </div>
          </div>
        </div>
        {/* CPQ Interactive Calculator (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Icon name="calculator" className="w-4 h-4 text-purple-500" />
            CPQ 动态报价试算器
          </h3>
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold mb-1">销售坐席数量 (Seats)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  id="cpq-seats"
                  min="10"
                  max="500"
                  value={seats}
                  onChange={(e) => setSeats(parseInt(e.target.value, 10))}
                  className="flex-1 accent-brand-500"
                />
                <span
                  id="cpq-seats-label"
                  className="font-mono font-bold text-sm text-brand-600 w-16 text-right"
                >
                  {seatsLabel}
                </span>
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">增值组件选配</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="cpq-ai"
                    checked={hasAi}
                    onChange={(e) => setHasAi(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>包含 AI 销售 Copilot 企业大包 (+¥18,000/年)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="cpq-private"
                    checked={hasPrivate}
                    onChange={(e) => setHasPrivate(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>私有化本地集群部署套件 (+¥280,000)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="cpq-sla"
                    checked={hasSla}
                    onChange={(e) => setHasSla(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>7×24 驻场交付保障 SLA (+¥80,000/年)</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">商业折扣授权比例</label>{' '}
              <select
                id="cpq-discount"
                value={discountRatio}
                onChange={(e) => setDiscountRatio(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
              >
                <option value="1.0">原价 (100% 无折扣)</option>
                <option value="0.9">大客户基础折扣 (90折 · 销售经理权签)</option>
                <option value="0.85">重点战略大客户折扣 (85折 · 销售总监权签)</option>
                <option value="0.75">年度特批破局底价 (75折 · 需战区副总审批)</option>
              </select>
            </div>
            {/* Price Result Box */}
            <div className="mt-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
              <div className="flex justify-between items-center text-xs text-purple-800 dark:text-purple-300">
                <span>标准市场总价:</span>
                <span id="cpq-orig-price" className="font-mono line-through text-zinc-400">
                  {`¥${origTotal.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-purple-800 dark:text-purple-300 mt-1">
                <span>折扣减免优惠:</span>
                <span id="cpq-discount-amount" className="font-mono text-rose-500 font-semibold">
                  {`-¥${discountAmount.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                <span className="font-bold text-sm text-purple-900 dark:text-purple-100">
                  最终成交报价 (净价):
                </span>
                <span
                  id="cpq-final-price"
                  className="text-xl font-mono font-extrabold text-purple-600 dark:text-purple-400"
                >
                  {finalPrice}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
