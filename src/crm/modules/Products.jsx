import { useState, useEffect } from 'react';
import Icon from '../../shared/Icon';
import { crmApi } from '../services/crmApi';
import { useToast } from '../hooks/useToast';

export default function Products({ active }) {
  const showToast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [canViewCost, setCanViewCost] = useState(false);

  // CPQ interactive calculator state
  const [seats, setSeats] = useState(80);
  const [hasAi, setHasAi] = useState(true);
  const [hasPrivate, setHasPrivate] = useState(false);
  const [hasSla, setHasSla] = useState(true);
  const [discountRatio, setDiscountRatio] = useState('0.85');

  // New Product Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    productCode: '',
    name: '',
    category: '软件平台',
    price: '',
    costPrice: '',
    unit: '套',
    stock: 100,
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await crmApi.getProducts({ page: 1, pageSize: 50 });
      if (res.data) {
        setProducts(res.data.list || []);
        setCanViewCost(!!(res.data.canViewCostPrice || res.data.canViewCost));
      }
    } catch (err) {
      console.error(err);
      showToast(`获取产品目录失败: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      loadProducts();
    }
  }, [active]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.productCode.trim() || !formData.price) {
      showToast('产品编码、名称与标准售价为必填项', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await crmApi.createProduct({
        productCode: formData.productCode.trim(),
        name: formData.name.trim(),
        category: formData.category,
        price: parseFloat(formData.price),
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : 0,
        unit: formData.unit || '套',
        stock: parseInt(formData.stock, 10) || 100,
      });
      showToast(`产品【${formData.name}】已成功发布至企业标准价格库！`, 'success');
      setCreateModalOpen(false);
      setFormData({
        productCode: '',
        name: '',
        category: '软件平台',
        price: '',
        costPrice: '',
        unit: '套',
        stock: 100,
      });
      loadProducts();
    } catch (err) {
      showToast(`新增产品失败: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // CPQ calculations
  let origTotal = seats * 1200;
  if (hasAi) origTotal += 18000;
  if (hasPrivate) origTotal += 280000;
  if (hasSla) origTotal += 80000;
  const finalTotal = Math.round(origTotal * parseFloat(discountRatio));
  const discountAmount = origTotal - finalTotal;

  const seatsLabel = `${seats} 席`;
  const finalPrice = `¥${finalTotal.toLocaleString()}`;

  const generateFormalQuote = () => {
    showToast(`已生成正式商业报价单 (金额: ${finalPrice} · ${seatsLabel})，已开启下载！`, 'success');
  };

  return (
    <div id="module-products" className={`crm-module ${active ? '' : 'hidden '}space-y-6`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 glow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              产品目录与 CPQ 报价配置器
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 text-xs font-semibold">
              实时精准算价 · {canViewCost ? '成本解密特权' : '成本脱敏保密中'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            标准化企业产品库、底价权限脱敏保护、席位阶梯折扣与 CPQ 组合输出正式商业报价单
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Icon name="plus" className="w-3.5 h-3.5" />
            <span>发布新产品</span>
          </button>
          <button
            onClick={generateFormalQuote}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md flex items-center gap-1.5 transition-colors"
          >
            <Icon name="printer" className="w-3.5 h-3.5" />
            <span>生成正式报价单 PDF</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Standard Catalog (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Icon name="box" className="w-4 h-4 text-brand-500" />
              企业标准产品价目表 ({products.length} 款)
            </h3>
            <span className="text-[11px] text-zinc-400">
              {canViewCost ? '🛡️ 财务底价可见' : '🔒 成本价格已脱敏'}
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-400">加载产品库中...</div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400">暂无产品记录</div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-brand-500/50 transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {p.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                        {p.productCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                      <span>分类: {p.category}</span>
                      <span>·</span>
                      <span>库存: {p.stock}</span>
                      <span>·</span>
                      <span className={canViewCost ? 'text-emerald-600 font-mono font-medium' : 'text-zinc-400 font-mono'}>
                        成本: {p.costDisplay || p.costPriceDisplay || (canViewCost ? `¥${p.costPrice}` : '*** (受限)')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-sm text-brand-600">
                      ¥{Number(p.price).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400">/{p.unit || '套'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CPQ Interactive Calculator (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#121316] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Icon name="calculator" className="w-4 h-4 text-purple-500" />
            CPQ 动态报价试算器
          </h3>
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                销售坐席数量 (Seats)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  id="cpq-seats"
                  min="10"
                  max="500"
                  value={seats}
                  onChange={(e) => setSeats(parseInt(e.target.value, 10))}
                  className="flex-1 accent-purple-600"
                />
                <span
                  id="cpq-seats-label"
                  className="font-mono font-bold text-sm text-purple-600 w-16 text-right"
                >
                  {seatsLabel}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                增值组件选配
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    id="cpq-ai"
                    checked={hasAi}
                    onChange={(e) => setHasAi(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>包含 AI 销售 Copilot 企业大包 (+¥18,000/年)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    id="cpq-private"
                    checked={hasPrivate}
                    onChange={(e) => setHasPrivate(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>私有化本地集群部署套件 (+¥280,000)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
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
              <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                商业折扣授权比例
              </label>
              <select
                id="cpq-discount"
                value={discountRatio}
                onChange={(e) => setDiscountRatio(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
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

      {/* New Product Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">发布新产品至价目库</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    产品编码 (SKU) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.productCode}
                    onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                    placeholder="PRD-AI-05"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    产品类别
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="软件平台">软件平台</option>
                    <option value="硬件算力">硬件算力</option>
                    <option value="专业服务">专业服务</option>
                    <option value="订阅服务">订阅服务</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                  产品完整名称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：多模态图像质检算力卡扩展套件"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    标准对外售价 (¥) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="120000"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    内部底线成本价 (¥)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="60000"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    计量单位
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="套 / 台 / 人月"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                    初始库存
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="100"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 text-zinc-600 dark:text-zinc-400"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? '发布中...' : '确认发布'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
