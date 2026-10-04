import { useState } from 'react';
import Icon from '../../shared/Icon';
import { useToast } from '../hooks/useToast';
import { crmApi } from '../services/crmApi';

const ACTIVE_TAB =
  'pb-3 border-b-2 border-brand-500 font-semibold text-brand-600 dark:text-blue-400 transition-colors';
const INACTIVE_TAB =
  'pb-3 border-b-2 border-transparent font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors';

const DEMO_ACCOUNTS = [
  { key: 'admin', label: '超级管理员 (Sarah)', pwd: 'admin123', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { key: 'director', label: '销售总监 (陈明)', pwd: 'director123', color: 'bg-blue-500/10 text-brand-600 border-brand-500/20' },
  { key: 'rep', label: '客户经理 (林雪 · 普通销售)', pwd: 'rep123', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { key: 'finance', label: '财务审计 (建国)', pwd: 'finance123', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
];

export default function LoginView({ hidden, onEnterWorkbench }) {
  const showToast = useToast();
  const [tab, setTab] = useState('account');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('director');
  const [password, setPassword] = useState('director123');
  const [loading, setLoading] = useState(false);

  const tabClass = (key) => (tab === key ? ACTIVE_TAB : INACTIVE_TAB);

  const performLogin = async (u, p) => {
    setLoading(true);
    try {
      const res = await crmApi.login(u, p);
      showToast(
        `身份验证成功！欢迎 ${res.data.user.realName}，已根据角色 [${res.data.role.name}] 动态重载菜单与权限。`,
        'success'
      );
      setTimeout(onEnterWorkbench, 350);
    } catch (err) {
      showToast(`登录失败: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    performLogin(username, password);
  };

  const handleQuickLogin = (acc) => {
    setUsername(acc.key);
    setPassword(acc.pwd);
    performLogin(acc.key, acc.pwd);
  };

  return (
    <div
      id="view-login"
      className={`view-transition min-h-screen flex flex-col justify-between relative overflow-hidden bg-slate-50 dark:bg-[#09090b]${hidden ? ' view-hidden' : ''}`}
    >
      {/* Ambient Gradient Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/15 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-[30rem] h-[30rem] bg-indigo-500/15 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      {/* Login Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          {/* Left Column: Enterprise Brand Showcase (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-brand-600 via-blue-600 to-indigo-800 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none opacity-40" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner">
                  <Icon name="compass" className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold tracking-tight block">领航 CRM</span>{' '}
                  <span className="text-xs text-blue-100/80 font-medium">
                    Navigator Cloud Enterprise
                  </span>
                </div>
              </div>
              <div className="mt-8 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100">
                  <Icon name="sparkles" className="w-3.5 h-3.5 text-amber-300" />
                  AI 驱动的下一代智能销售云
                </span>{' '}
                <h1 className="text-3xl font-extrabold tracking-tight leading-snug">
                  赋能万千销售精英，
                  <br />
                  驱动企业全流程确定性增长。
                </h1>
                <p className="text-sm text-blue-100/90 leading-relaxed font-normal">
                  从线索智能评级、全生命周期商机推进，到智能预测与合同回款，让每一次客户沟通更有成效。
                </p>
              </div>
            </div>
            <div className="relative z-10 py-6 border-y border-white/15 my-6 grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-extrabold tracking-tight">98.4%</div>
                <div className="text-xs text-blue-100/80 mt-0.5">大客户续费与满意率</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight">-35%</div>
                <div className="text-xs text-blue-100/80 mt-0.5">平均商机成交推进周期</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight">12,000+</div>
                <div className="text-xs text-blue-100/80 mt-0.5">全球企业共同信赖</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight">4.2x</div>
                <div className="text-xs text-blue-100/80 mt-0.5">销售人均效能提升</div>
              </div>
            </div>
            <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
              <p className="text-xs italic text-blue-50 leading-relaxed">
                “领航 CRM 让我们的 500+
                人销售团队实现了从线索到交付的无缝协同，商机转化率在两个季度内跃升了 40%。”
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                  张
                </div>
                <div>
                  <div className="text-xs font-semibold">张卫华</div>
                  <div className="text-[11px] text-blue-200">未来智造科技 · 营销副总裁</div>
                </div>
              </div>
            </div>
          </div>
          {/* Right Column: Login Interactive Form (7 cols) */}
          <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-white dark:bg-zinc-900">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    欢迎登录领航 CRM
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    请输入您的企业账号或使用 SSO 单点登录
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                  <Icon name="shield-check" className="w-3.5 h-3.5" /> ISO 27001 认证
                </span>
              </div>
              {/* Login Method Tabs */}
              <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 space-x-6 text-sm">
                <button
                  id="tab-login-account"
                  onClick={() => setTab('account')}
                  className={tabClass('account')}
                >
                  企业账号密码
                </button>
                <button
                  id="tab-login-sms"
                  onClick={() => setTab('sms')}
                  className={tabClass('sms')}
                >
                  手机短信免密
                </button>
                <button
                  id="tab-login-qrcode"
                  onClick={() => setTab('qrcode')}
                  className={tabClass('qrcode')}
                >
                  企微 / 钉钉扫码
                </button>
              </div>
              {/* Demo Quick Login Chips */}
              <div className="mb-5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Icon name="sparkles" className="w-3.5 h-3.5 text-brand-500" />
                    一键预设角色免密登录体验：
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">GoFiber + Redis</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.key}
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin(acc)}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold text-left flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99] ${acc.color}`}
                    >
                      <span className="truncate">{acc.label}</span>
                      <Icon name="arrow-right" className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Form: Account & Password */}
              <form
                id="login-form-account"
                onSubmit={handleLoginSubmit}
                className={tab === 'account' ? 'space-y-4' : 'space-y-4 hidden'}
              >
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    企业账号 (admin / director / rep / finance)
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Icon name="user" className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      id="login-account-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="admin / director / rep / finance"
                      className="block w-full pl-10 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      安全密码
                    </label>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        showToast('已向管理员邮箱发送密码重置链接');
                      }}
                      className="text-xs font-medium text-brand-600 dark:text-blue-400 hover:underline"
                    >
                      忘记密码？
                    </a>
                  </div>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Icon name="lock" className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="login-pwd-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="输入企业登录密码"
                      className="block w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-blue-500 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      <Icon
                        name={showPassword ? 'eye-off' : 'eye'}
                        id="pwd-eye-icon"
                        className="w-4 h-4"
                      />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-brand-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-brand-500"
                    />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      记住此工作设备 (30天内免密)
                    </span>
                  </label>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <Icon name="check-circle" className="w-3 h-3" />
                    GoFiber 后端连接中
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-sm shadow-md hover:shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 group"
                >
                  <span>{loading ? '正在验证身份与动态权限...' : '登 录 进 入 工 作 台'}</span>
                  <Icon
                    name="arrow-right"
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  />
                </button>
              </form>
              {/* SMS Tab */}
              <div id="login-form-sms" className={tab === 'sms' ? 'space-y-4' : 'hidden space-y-4'}>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    手机号码
                  </label>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-300">
                      +86
                    </span>
                    <input
                      type="tel"
                      placeholder="138 0000 0000"
                      className="block w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    短信验证码
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="6 位验证码"
                      className="block w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => showToast('验证码已发送至手机: 829104')}
                      className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-brand-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 whitespace-nowrap"
                    >
                      获取验证码
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => enterWorkbench('手机短信验证成功，已进入销售系统！')}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>验证并登录</span>
                </button>
              </div>
              {/* QR Code Tab */}
              <div
                id="login-form-qrcode"
                className={
                  tab === 'qrcode'
                    ? 'py-6 text-center space-y-4'
                    : 'hidden py-6 text-center space-y-4'
                }
              >
                <div className="w-48 h-48 mx-auto p-3 bg-white border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-inner flex items-center justify-center relative">
                  <div className="w-full h-full bg-zinc-900 rounded-lg p-2 flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                        <div className="w-5 h-5 bg-zinc-900 rounded-sm" />
                      </div>
                      <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                        <div className="w-5 h-5 bg-zinc-900 rounded-sm" />
                      </div>
                    </div>
                    <div className="flex items-center justify-center text-white text-[10px] font-mono tracking-wider">
                      SCAN TO LOGIN
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                        <div className="w-5 h-5 bg-zinc-900 rounded-sm" />
                      </div>
                      <div className="w-8 h-8 border-2 border-white rounded-full flex items-center justify-center">
                        <Icon name="compass" className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  使用 企业微信 / 飞书 / 钉钉 App 扫码快速授权
                </p>{' '}
                <button
                  onClick={() => enterWorkbench('企微扫码授权成功，欢迎回来！')}
                  className="text-xs text-brand-600 dark:text-blue-400 hover:underline"
                >
                  [模拟扫码完成一键授权]
                </button>
              </div>
              {/* Enterprise SSO Divider */}
              <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <div className="text-center relative">
                  <span className="bg-white dark:bg-zinc-900 px-3 text-xs text-zinc-400 font-medium relative -top-2.5">
                    企业统一身份 SSO
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2.5 mt-2">
                  <button
                    onClick={() => enterWorkbench('企业微信 SSO 登录成功')}
                    className="flex flex-col items-center justify-center py-2 px-1 border border-zinc-200 dark:border-zinc-700/80 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    <Icon name="message-square" className="w-4 h-4 text-emerald-600 mb-1" />
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-300">企业微信</span>
                  </button>
                  <button
                    onClick={() => enterWorkbench('飞书 SSO 登录成功')}
                    className="flex flex-col items-center justify-center py-2 px-1 border border-zinc-200 dark:border-zinc-700/80 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    <Icon name="send" className="w-4 h-4 text-blue-500 mb-1" />
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-300">飞书</span>
                  </button>
                  <button
                    onClick={() => enterWorkbench('钉钉 SSO 登录成功')}
                    className="flex flex-col items-center justify-center py-2 px-1 border border-zinc-200 dark:border-zinc-700/80 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    <Icon name="zap" className="w-4 h-4 text-amber-500 mb-1" />
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-300">钉钉</span>
                  </button>
                  <button
                    onClick={() => enterWorkbench('SAML 2.0 登录成功')}
                    className="flex flex-col items-center justify-center py-2 px-1 border border-zinc-200 dark:border-zinc-700/80 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    <Icon name="key-round" className="w-4 h-4 text-purple-500 mb-1" />
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-300">SAML/OIDC</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-500 space-y-1">
              <p>
                首次使用或无法登录？请联系{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast('技术支持热线: 400-880-9988');
                  }}
                  className="text-brand-600 dark:text-blue-400 hover:underline"
                >
                  企业IT管理员
                </a>{' '}
                开通销售权限
              </p>
              <p>© 2026 领航云科 (Navigator SaaS) · 服务协议与隐私政策 · 粤ICP备20260812号</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
