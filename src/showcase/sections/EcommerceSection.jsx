import { useState } from 'react';
import Icon from '../../shared/Icon';
import { useToast } from '../components/ToastProvider';

const unsplash = (photo, width) => `https://images.unsplash.com/${photo}?w=${width}&q=80`;

const GALLERY = [
  'photo-1505740420928-5e560c06d30e',
  'photo-1484704849700-f032a568e944',
  'photo-1546435770-a3e426bf472b',
  'photo-1524678606370-a47ad25cb82a',
];

const SELECTED_RING = 'ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-900';

const COLORS = [
  { name: '太空黑', className: 'w-7 h-7 rounded-full bg-zinc-900' },
  { name: '皓月白', className: 'w-7 h-7 rounded-full bg-zinc-100 border border-zinc-300' },
  { name: '深海蓝', className: 'w-7 h-7 rounded-full bg-blue-600' },
];

export default function EcommerceSection({ active }) {
  const { showToast } = useToast();
  const [mainImage, setMainImage] = useState(unsplash(GALLERY[0], 800));
  const [color, setColor] = useState(COLORS[0].name);
  const [qty, setQty] = useState(1);

  return (
    <section id="section-ecommerce" className={`tab-section space-y-10${active ? '' : ' hidden'}`}>
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Icon name="shopping-bag" className="w-6 h-6" />
            </span>
            E-commerce 电商体系组件
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            复刻 Figma Page 6 (E-commerce) 中的 Product Cards、Product View Info、Filter Sidebar 及
            Customer Reviews。
          </p>
        </div>
        <button className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-1.5 self-start">
          <Icon name="copy" className="w-4 h-4" />
          复制电商模块代码
        </button>
      </div>
      {/* Product Detail View (Node 98:20127) */}
      <div className="bg-white dark:bg-[#16171a] p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Gallery Preview */}
        <div className="md:col-span-5 space-y-3">
          <div className="aspect-square rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 overflow-hidden relative group">
            <img
              id="mainProductImg"
              src={mainImage}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />{' '}
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-danger text-white text-[10px] font-bold uppercase tracking-wider">
              25% OFF
            </span>
          </div>
          {/* Thumbnails */}
          <div className="grid grid-cols-4 gap-2">
            {GALLERY.map((photo, index) => (
              <button
                key={photo}
                onClick={() => setMainImage(unsplash(photo, 800))}
                className={`aspect-square rounded-xl ${index === 0 ? 'border-2 border-primary' : 'border border-zinc-200 dark:border-zinc-700'} overflow-hidden`}
              >
                <img src={unsplash(photo, 200)} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        {/* Product Specs & Actions (Node 98:20127) */}
        <div className="md:col-span-7 space-y-5">
          <div className="space-y-1">
            <span className="text-xs text-primary font-semibold uppercase tracking-wider">
              Audio & Electronics
            </span>{' '}
            <h2 className="text-2xl font-bold tracking-tight">Acme Studio Wireless ANC 耳机</h2>
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center text-amber-400">
                <Icon name="star" className="w-4 h-4 fill-current" />
                <Icon name="star" className="w-4 h-4 fill-current" />
                <Icon name="star" className="w-4 h-4 fill-current" />
                <Icon name="star" className="w-4 h-4 fill-current" />
                <Icon name="star-half" className="w-4 h-4 fill-current" />
              </div>
              <span className="text-xs font-semibold">4.8</span>
              <span className="text-xs text-zinc-400">(248 条真实评价)</span>
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-primary">¥1,299.00</span>
            <span className="text-base text-zinc-400 line-through">¥1,699.00</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-semibold">
              现货库存充足
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            配备主动降噪 ANC 芯片，高达 40
            小时超长续航，支持双设备无缝连接与空间音频调优。人体工学记忆海绵耳罩，带来无压迫佩戴体验。
          </p>
          {/* Color Variant Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold">
              颜色选择:{' '}
              <span id="selectedColorName" className="text-zinc-400 font-normal">
                {color}
              </span>
            </label>{' '}
            <div className="flex items-center gap-3">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  className={`${c.className}${color === c.name ? ` ${SELECTED_RING}` : ''}`}
                />
              ))}
            </div>
          </div>
          {/* Quantity & CTA Buttons */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                -
              </button>
              <span id="productQty" className="px-3 py-2 text-xs font-semibold">
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="px-3 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                +
              </button>
            </div>
            <button
              onClick={() => showToast('已加入购物车！')}
              className="flex-1 py-3 px-5 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="shopping-cart" className="w-4 h-4" />
              加入购物车
            </button>
            <button
              onClick={() => showToast('已收藏到心愿单！')}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Icon name="heart" className="w-4 h-4 text-zinc-400 hover:text-danger" />
            </button>
          </div>
        </div>
      </div>
      {/* Customer Reviews Breakdown (Node 98:18030) */}
      <div className="bg-white dark:bg-[#16171a] p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <h3 className="font-bold text-base flex items-center justify-between">
          <span>用户评价与口碑分布 (Customer Reviews)</span>
          <span className="text-xs text-primary font-normal hover:underline cursor-pointer">
            写评价
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-4 text-center md:border-r border-zinc-200 dark:border-zinc-800 md:pr-6">
            <div className="text-5xl font-black text-primary">4.8</div>
            <div className="flex items-center justify-center text-amber-400 my-2">
              <Icon name="star" className="w-5 h-5 fill-current" />
              <Icon name="star" className="w-5 h-5 fill-current" />
              <Icon name="star" className="w-5 h-5 fill-current" />
              <Icon name="star" className="w-5 h-5 fill-current" />
              <Icon name="star-half" className="w-5 h-5 fill-current" />
            </div>
            <p className="text-xs text-zinc-400">基于 248 条全球买家评分</p>
          </div>
          {/* Progress Bars */}
          <div className="md:col-span-8 space-y-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="w-8 text-zinc-400">5 星</span>
              <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '85%' }} />
              </div>
              <span className="w-10 text-right text-zinc-400">85%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 text-zinc-400">4 星</span>
              <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '10%' }} />
              </div>
              <span className="w-10 text-right text-zinc-400">10%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 text-zinc-400">3 星</span>
              <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '3%' }} />
              </div>
              <span className="w-10 text-right text-zinc-400">3%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 text-zinc-400">2 星</span>
              <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '1%' }} />
              </div>
              <span className="w-10 text-right text-zinc-400">1%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 text-zinc-400">1 星</span>
              <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '1%' }} />
              </div>
              <span className="w-10 text-right text-zinc-400">1%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
