import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';

export default function Sidebar({ activeView = 'overview', onSwitchView }) {
  const { showToast } = useToast();

  const handleNav = (viewKey, title) => {
    if (onSwitchView) {
      onSwitchView(viewKey);
    }
    showToast(`已切换至：${title}`);
  };

  const navItemClass = (key) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all w-full text-left ${
      activeView === key
        ? 'bg-primary text-white shadow-md shadow-primary/25'
        : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 font-medium'
    }`;

  return (
    <>
      <aside className="lg:col-span-3 border-r border-zinc-200 dark:border-zinc-800/90 p-5 flex flex-col justify-between bg-zinc-50/70 dark:bg-[#101113]">
        <div className="space-y-6">
          {/* Workspace Brand Pill */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-750 shadow-xs hover:border-primary/50 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-blue-400 text-white flex items-center justify-center font-black text-sm shadow-md shadow-primary/20">
                A
              </div>
              <div>
                <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>Acme Enterprise</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">Workspace #942</div>
              </div>
            </div>
            <Icon name="chevrons-up-down" className="w-4 h-4 text-zinc-400" />
          </div>
          {/* Primary Nav Group */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2">
              主工作区 (Navigation)
            </div>
            <button
              type="button"
              onClick={() => handleNav('overview', '控制台概览')}
              className={navItemClass('overview')}
            >
              <span className="flex items-center gap-3">
                <Icon name="layout-grid" className={`w-4 h-4 ${activeView === 'overview' ? 'text-white' : 'text-zinc-400'}`} />
                控制台概览 (Overview)
              </span>
              <span className="text-[10px] font-mono opacity-80">⌘1</span>
            </button>
            <button
              type="button"
              onClick={() => handleNav('roles', '成员权限与组织')}
              className={navItemClass('roles')}
            >
              <span className="flex items-center gap-3">
                <Icon name="users" className={`w-4 h-4 ${activeView === 'roles' ? 'text-white' : 'text-zinc-400'}`} />
                成员权限与组织
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeView === 'roles'
                  ? 'bg-white/20 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}>
                128
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleNav('analytics', '数据报表与分析')}
              className={navItemClass('analytics')}
            >
              <span className="flex items-center gap-3">
                <Icon name="bar-chart-3" className={`w-4 h-4 ${activeView === 'analytics' ? 'text-white' : 'text-zinc-400'}`} />
                数据报表与分析
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleNav('audit', '审计日志 & 安全')}
              className={navItemClass('audit')}
            >
              <span className="flex items-center gap-3">
                <Icon name="shield" className={`w-4 h-4 ${activeView === 'audit' ? 'text-white' : 'text-zinc-400'}`} />
                审计日志 & 安全
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeView === 'audit'
                  ? 'bg-white/20 text-white'
                  : 'bg-purple-500/10 text-purple-500'
              }`}>
                PRO
              </span>
            </button>
          </div>
          {/* Pinned Projects (from Figma 92:8127) */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2">
              常用工程 (Recent Projects)
            </div>
            <div className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              <a
                href="#"
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 group transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Financial Planning
                </span>
                <Icon
                  name="arrow-up-right"
                  className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </a>
              <a
                href="#"
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 group transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Design Systems v2
                </span>
                <Icon
                  name="arrow-up-right"
                  className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </a>
              <a
                href="#"
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 group transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  React 19 Engine
                </span>
                <Icon
                  name="arrow-up-right"
                  className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </a>
            </div>
          </div>
          {/* Quota Meter Widget */}
          <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className="text-zinc-600 dark:text-zinc-400">云存储用量</span>
              <span className="font-bold text-primary">78%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-purple-500 h-full rounded-full"
                style={{ width: '78%' }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>12.4 GB / 16 GB</span>
              <button
                onClick={() => showToast('配额充值页面跳转中...')}
                className="text-primary font-semibold hover:underline"
              >
                立即扩容
              </button>
            </div>
          </div>
        </div>
        {/* User Footer Profile */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
              />{' '}
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#101113] absolute -bottom-0.5 -right-0.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Sarah Jenkins
              </div>
              <div className="text-[10px] text-zinc-400">Super Admin</div>
            </div>
          </div>
          <button
            onClick={() => showToast('已安全登出')}
            title="登出"
            className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-danger transition-colors"
          >
            <Icon name="log-out" className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
