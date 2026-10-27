import Icon from '../../../shared/Icon';
import { useToast } from '../../components/ToastProvider';
import Pagination from './Pagination';

function MemberRow({ member, checked, hidden, onToggle }) {
  const { showToast } = useToast();
  const { tfa, badge } = member;

  return (
    <tr
      data-status={member.status}
      style={hidden ? { display: 'none' } : undefined}
      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
    >
      <td className="p-4 text-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="row-checkbox rounded text-primary focus:ring-primary"
        />
      </td>
      <td className="p-4 flex items-center gap-3">
        {member.avatar ? (
          <img
            src={member.avatar}
            className="w-9 h-9 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
          />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-500">
            {member.initials}
          </div>
        )}
        <div>
          <div className="font-bold text-zinc-900 dark:text-zinc-100">{member.name}</div>
          <div className="text-[11px] text-zinc-400">{member.email}</div>
        </div>
      </td>
      <td className="p-4">
        <span className={member.roleClass}>{member.role}</span>
      </td>
      <td className="p-4">
        <span className={tfa.className}>
          <Icon name={tfa.icon} className="w-3.5 h-3.5" />
          {tfa.label}
        </span>
      </td>
      <td className="p-4">
        <span className={badge.className}>
          {badge.dotClass && <span className={badge.dotClass} />}
          {badge.label}
        </span>
      </td>
      <td className="p-4 text-zinc-500 font-mono text-[11px]">{member.lastLogin}</td>
      <td className="p-4 text-right">
        <button
          onClick={() => showToast(`编辑权限: ${member.name}`)}
          className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Icon name="more-horizontal" className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

export default function MembersTable({
  members,
  selectedIds,
  isHidden,
  masterChecked,
  onToggleMaster,
  onToggleRow,
}) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-[#151619]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" id="membersTable">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 uppercase text-[10px] text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800 tracking-wider">
            <tr>
              <th className="p-4 w-12 text-center">
                <input
                  type="checkbox"
                  id="masterCheckbox"
                  checked={masterChecked}
                  onChange={(e) => onToggleMaster(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
              </th>
              <th className="p-4">姓名 / 企业邮箱</th>
              <th className="p-4">角色组</th>
              <th className="p-4">2FA 安全</th>
              <th className="p-4">账号状态</th>
              <th className="p-4">最后登录</th>
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                checked={selectedIds.has(member.id)}
                hidden={isHidden(member)}
                onToggle={() => onToggleRow(member.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination />
    </div>
  );
}
