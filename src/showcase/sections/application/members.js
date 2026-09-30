const ROLE_BASE = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold';
const BADGE_BASE = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold';

export const members = [
  {
    id: 'jane-cooper',
    status: 'active',
    name: 'Jane Cooper',
    email: 'jane.cooper@acme.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    role: 'UI/UX Lead',
    roleClass: `${ROLE_BASE} bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20`,
    tfa: {
      className:
        'inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium',
      icon: 'shield-check',
      label: '已验证',
    },
    badge: {
      className: `${BADGE_BASE} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20`,
      dotClass: 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse',
      label: 'Active',
    },
    lastLogin: '2 分钟前',
  },
  {
    id: 'alex-morgan',
    status: 'active',
    name: 'Alex Morgan',
    email: 'alex.morgan@acme.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    role: 'Core Architect',
    roleClass: `${ROLE_BASE} bg-primary/10 text-primary border border-primary/20`,
    tfa: {
      className:
        'inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium',
      icon: 'shield-check',
      label: '已验证',
    },
    badge: {
      className: `${BADGE_BASE} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20`,
      dotClass: 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse',
      label: 'Active',
    },
    lastLogin: '18 分钟前',
  },
  {
    id: 'david-kim',
    status: 'pending',
    name: 'David Kim',
    email: 'david.kim@acme.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    role: 'Growth & Marketing',
    roleClass: `${ROLE_BASE} bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20`,
    tfa: {
      className: 'inline-flex items-center gap-1 text-[11px] text-amber-500 font-medium',
      icon: 'alert-circle',
      label: '待绑定',
    },
    badge: {
      className: `${BADGE_BASE} bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20`,
      dotClass: 'w-1.5 h-1.5 rounded-full bg-amber-500',
      label: 'Pending',
    },
    lastLogin: '昨天 16:42',
  },
  {
    id: 'marcus-lin',
    status: 'suspended',
    name: 'Marcus Lin',
    email: 'marcus.lin@contractor.com',
    initials: 'ML',
    role: 'External Guest',
    roleClass: `${ROLE_BASE} bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400`,
    tfa: {
      className: 'inline-flex items-center gap-1 text-[11px] text-zinc-400 font-medium',
      icon: 'minus',
      label: '未启用',
    },
    badge: {
      className: `${BADGE_BASE} bg-zinc-200 dark:bg-zinc-800 text-zinc-500`,
      label: 'Suspended',
    },
    lastLogin: '7 天前',
  },
];

// Mirrors the row's rendered text; the table search matches against it (case-insensitive).
export function searchableText(member) {
  return [
    member.initials,
    member.name,
    member.email,
    member.role,
    member.tfa.label,
    member.badge.label,
    member.lastLogin,
  ]
    .filter(Boolean)
    .join('\n');
}
