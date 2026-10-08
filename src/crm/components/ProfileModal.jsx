import { useState } from 'react';
import Icon from '../../shared/Icon';
import { useAuth, crmApi } from '../services/crmApi';
import { useToast } from '../hooks/useToast';

export default function ProfileModal({ isOpen, onClose, onLogout }) {
  const auth = useAuth();
  const showToast = useToast();

  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'password'

  // Info editing state
  const [realName, setRealName] = useState(auth.user?.realName || '');
  const [email, setEmail] = useState(auth.user?.email || '');
  const [phone, setPhone] = useState(auth.user?.phone || '');
  const [savingInfo, setSavingInfo] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  if (!isOpen) return null;

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      await crmApi.updateProfile({ realName, email, phone });
      showToast('个人资料已成功更新！', 'success');
    } catch (err) {
      showToast(`更新资料失败: ${err.message}`, 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('新密码长度至少需要 6 位', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('两次输入的新密码不一致，请核对', 'warning');
      return;
    }

    setSavingPwd(true);
    try {
      await crmApi.changePassword(oldPassword, newPassword);
      showToast('密码修改成功！新密码已生效。', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      showToast(`修改密码失败: ${err.message}`, 'error');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#18191d] rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 dark:bg-blue-500/15 text-brand-600 dark:text-blue-400 flex items-center justify-center">
              <Icon name="user" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                个人中心与账号安全
              </h3>
              <p className="text-xs text-zinc-400">
                管理个人名片信息与安全登录凭证
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800/80 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 text-xs font-semibold border-b-2 mr-6 transition-all ${
              activeTab === 'info'
                ? 'border-brand-500 text-brand-600 dark:text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
            }`}
          >
            基本资料名片
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'password'
                ? 'border-brand-500 text-brand-600 dark:text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
            }`}
          >
            修改登录密码
          </button>
        </div>

        {/* Tab 1: Info */}
        {activeTab === 'info' && (
          <form onSubmit={handleSaveInfo} className="p-6 space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
              <img
                src={
                  auth.user?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'
                }
                alt="Avatar"
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-brand-500/20"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {auth.user?.realName}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">工号: {auth.user?.username}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-blue-400 font-semibold border border-brand-500/20">
                    {auth.role?.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                    华东战区
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                真实姓名
              </label>
              <input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  企业邮箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  手机电话
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onLogout) onLogout();
                }}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1"
              >
                <Icon name="log-out" className="w-3.5 h-3.5" />
                <span>退出登录</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-xs disabled:opacity-60"
                >
                  {savingInfo ? '保存中...' : '保存资料'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Password */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300">
              提示：密码修改成功后立即生效，请妥善保管您的新登录凭证。
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                当前原密码
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入当前正在使用的旧密码"
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                新密码
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码 (不少于6位)"
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                确认新密码
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={savingPwd}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-xs disabled:opacity-60"
              >
                {savingPwd ? '修改中...' : '确认修改密码'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
