import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';

export default function SsoCard() {
  const { showToast } = useToast();

  return (
    <>
      <div className="lg:col-span-5 bg-white dark:bg-[#151619] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            Authentication (Node 92:10559)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            SSO Ready
          </span>
        </div>
        <div>
          <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            企业级安全单点登录
          </h4>
          <p className="text-xs text-zinc-500 mt-0.5">
            支持 SAML 2.0、OAuth 2.0 及 OAuth 令牌自动续期
          </p>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => showToast('正在调起 Google Workspace 统一登录...')}
            className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-2.5 transition-all shadow-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google Workspace SSO 登录
          </button>
          <button
            onClick={() => showToast('正在调起 GitHub Enterprise 授权...')}
            className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-2.5 transition-all shadow-xs"
          >
            <Icon name="github" className="w-4 h-4" />
            GitHub Enterprise 单点登录
          </button>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Icon name="lock" className="w-3.5 h-3.5 text-emerald-500" />
            <span>已启用端到端加密连接</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">TLS 1.3</span>
        </div>
      </div>
    </>
  );
}
