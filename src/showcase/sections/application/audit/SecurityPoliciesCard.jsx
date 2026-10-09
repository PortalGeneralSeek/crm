import Icon from '../../../../shared/Icon';
import Select from '../../../../shared/Select';

export default function SecurityPoliciesCard({
  policies,
  onToggle,
  onChangeTimeout,
  onSaveBaseline,
}) {
  return (
    <div className="bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-6 space-y-6">
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            企业全局安全合规与访问防御策略
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            策略变更后将实时同步至网关拦截层，保障全链路数据机密性与防篡改。
          </p>
        </div>
        <button
          onClick={onSaveBaseline}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all self-start sm:self-center"
        >
          保存策略基准
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Policy 1: MFA */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon name="lock" className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                全员强制双因素认证 (MFA / 2FA)
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              所有成员登录控制台时必须通过 Authenticator / 硬件 Security Key 完成第二重动态认证。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggle('mfaEnforced', '全员强制双因素认证')}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              policies.mfaEnforced ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transition duration-200 ${
                policies.mfaEnforced ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Policy 2: Session Timeout */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon name="clock" className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                无操作空闲会话自动超时注销
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              网页端若在指定时长内无鼠标与键盘交互，系统将自动退出登录并锁定数据视图。
            </p>
            <div className="pt-1">
              <Select
                value={policies.sessionTimeout}
                onChange={(val) => onChangeTimeout(val)}
                size="sm"
                variant="filter"
                options={[
                  { value: '15m', label: '15 分钟无操作锁定' },
                  { value: '30m', label: '30 分钟无操作锁定' },
                  { value: '1h', label: '1 小时无操作锁定' },
                  { value: '4h', label: '4 小时无操作锁定' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Policy 3: Dynamic Watermark */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon name="eye" className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                动态防泄密隐形工号水印
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              在全系统敏感报表、客户名录页面背景隐蔽渲染当前操作员工号与时间戳盲水印，防截屏泄露。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggle('dynamicWatermark', '动态防泄密隐形工号水印')}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              policies.dynamicWatermark ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transition duration-200 ${
                policies.dynamicWatermark ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Policy 4: Password Rotation */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon name="rotate-ccw" className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                密码复杂度与 90 天强制轮换
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              要求密码至少 12 位且含大小写字母、数字与特殊符号，过期后系统将提示阻断直至修改密码。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggle('passwordRotation', '密码复杂度与90天强制轮换')}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              policies.passwordRotation ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transition duration-200 ${
                policies.passwordRotation ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
