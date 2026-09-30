/**
 * Acme Pro Components - Application & AI Studio Logic
 * Enhanced with Deep Reasoning, Typing Simulation, Batch Selection, and Pro SaaS Features
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  initTheme();
  initCharts();
  setupKeyboardShortcuts();
});

/* ================= 1. THEME MANAGEMENT ================= */
function initTheme() {
  const isDark = localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeIcon(isDark);
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
  updateChartThemes();
  showToast(isDark ? '已切换至暗黑模式 🌙' : '已切换至浅色模式 ☀️', 'info');
}

function updateThemeIcon(isDark) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (window.lucide) lucide.createIcons();
  }
}

/* ================= 2. TAB NAVIGATION ================= */
function switchTab(tabId) {
  const sections = document.querySelectorAll('.tab-section');
  sections.forEach(s => s.classList.add('hidden'));

  const activeSection = document.getElementById(`section-${tabId}`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }

  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active', 'bg-zinc-100', 'dark:bg-zinc-800', 'text-primary');
    btn.classList.add('text-zinc-600', 'dark:text-zinc-400');
  });

  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-zinc-100', 'dark:bg-zinc-800', 'text-primary');
    activeBtn.classList.remove('text-zinc-600', 'dark:text-zinc-400');
  }

  if (tabId === 'charts') {
    setTimeout(initCharts, 50);
  }
  if (window.lucide) lucide.createIcons();
}

/* ================= 3. APPLICATION: BATCH SELECTION & TABLE ================= */
let selectedRowCount = 0;

function toggleSelectAll(masterCheckbox) {
  const checkboxes = document.querySelectorAll('.row-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = masterCheckbox.checked;
  });
  updateBatchBar();
}

function toggleRowSelect() {
  updateBatchBar();
}

function updateBatchBar() {
  const checked = document.querySelectorAll('.row-checkbox:checked');
  selectedRowCount = checked.length;
  const bar = document.getElementById('batchActionBar');
  const countText = document.getElementById('selectedRowsCount');

  if (bar && countText) {
    if (selectedRowCount > 0) {
      countText.innerText = `已选定 ${selectedRowCount} 项`;
      bar.classList.remove('hidden');
      bar.classList.add('flex');
    } else {
      bar.classList.add('hidden');
      bar.classList.remove('flex');
    }
  }
}

function filterTableByStatus(status, btn) {
  const buttons = btn.parentElement.querySelectorAll('button');
  buttons.forEach(b => {
    b.classList.remove('bg-white', 'dark:bg-zinc-700', 'text-zinc-900', 'dark:text-zinc-100', 'shadow-xs');
    b.classList.add('text-zinc-500');
  });
  btn.classList.add('bg-white', 'dark:bg-zinc-700', 'text-zinc-900', 'dark:text-zinc-100', 'shadow-xs');
  btn.classList.remove('text-zinc-500');

  const rows = document.querySelectorAll('#membersTable tbody tr');
  rows.forEach(r => {
    if (status === 'all') {
      r.style.display = '';
    } else {
      const rowStatus = r.getAttribute('data-status');
      r.style.display = rowStatus === status ? '' : 'none';
    }
  });
}

function filterTable() {
  const query = document.getElementById('tableSearchInput').value.toLowerCase();
  const rows = document.querySelectorAll('#membersTable tbody tr');
  rows.forEach(r => {
    const text = r.innerText.toLowerCase();
    r.style.display = text.includes(query) ? '' : 'none';
  });
}

function handleBatchAction(action) {
  showToast(`批量操作执行完成：已对 ${selectedRowCount} 位成员执行【${action}】`, 'success');
  const master = document.getElementById('masterCheckbox');
  if (master) master.checked = false;
  toggleSelectAll({ checked: false });
}

function handleDemoAuth(e) {
  e.preventDefault();
  showToast('🎉 演示环境：登录验证通过，已安全接入！', 'success');
}

/* ================= 4. ENHANCED AI STUDIO CHAT ================= */
let isAiResponding = false;

function setPromptInput(text) {
  const input = document.getElementById('aiUserInput');
  if (input) {
    input.value = text;
    input.focus();
  }
}

function sendQuickPrompt(text) {
  setPromptInput(text);
  const fakeEvent = { preventDefault: () => {} };
  handleSendAiMessage(fakeEvent);
}

function handleSendAiMessage(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (isAiResponding) return;

  const input = document.getElementById('aiUserInput');
  const text = input.value.trim();
  if (!text) return;

  const container = document.getElementById('chatMessagesContainer');
  const welcomeCard = document.getElementById('aiWelcomeCard');
  if (welcomeCard) welcomeCard.style.display = 'none';

  // 1. Append User Bubble
  const userMsgId = 'user-msg-' + Date.now();
  const userMsgHtml = `
    <div id="${userMsgId}" class="flex items-start justify-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div class="max-w-[80%] bg-zinc-900 text-white dark:bg-primary dark:text-white p-4 rounded-2xl rounded-tr-xs text-xs shadow-md leading-relaxed border border-zinc-800 dark:border-primary/50">
        ${escapeHtml(text)}
      </div>
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0 text-xs font-bold shadow-xs">
        U
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', userMsgHtml);
  input.value = '';
  container.scrollTop = container.scrollHeight;

  // 2. Append Thinking Indicator
  isAiResponding = true;
  const aiMsgId = 'ai-msg-' + Date.now();
  const thinkingHtml = `
    <div id="${aiMsgId}" class="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-primary flex items-center justify-center text-white shrink-0 shadow-md shadow-primary/20">
        <i data-lucide="sparkles" class="w-4 h-4 animate-spin"></i>
      </div>
      <div class="flex-1 max-w-[88%] bg-white dark:bg-[#16171a] p-5 rounded-2xl rounded-tl-xs text-xs space-y-4 border border-zinc-200/90 dark:border-zinc-800/90 shadow-sm">
        
        <!-- Collapsible Thinking Process -->
        <div class="rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 p-3 space-y-2">
          <button onclick="toggleThinkingProcess(this)" class="w-full flex items-center justify-between text-zinc-500 dark:text-zinc-400 font-mono text-[11px] hover:text-primary transition-colors">
            <span class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span>Thinking Process (思考中...)</span>
            </span>
            <i data-lucide="chevron-down" class="w-3.5 h-3.5 transition-transform"></i>
          </button>
          <div class="thinking-content text-[11px] text-zinc-400 font-mono leading-relaxed pl-4 border-l-2 border-primary/30 space-y-1">
            <p>1. 解析用户指令意图与设计系统契约...</p>
            <p>2. 检索 Figma File (UGv1yrGRKKFxjXMBk4tnt3) 中的组件规范与 Auto-layout 约束...</p>
            <p>3. 匹配 Tailwind CSS 与 WCAG 2.1 AA 级色彩对比度...</p>
          </div>
        </div>

        <div class="ai-stream-text space-y-3 leading-relaxed text-zinc-800 dark:text-zinc-200">
          <div class="flex items-center gap-2 text-zinc-400 text-xs">
            <span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
            正在组织高品质前端代码与结构...
          </div>
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', thinkingHtml);
  if (window.lucide) lucide.createIcons();
  container.scrollTop = container.scrollHeight;

  // 3. Complete AI Response Simulation
  setTimeout(() => {
    const aiMsgElem = document.getElementById(aiMsgId);
    if (!aiMsgElem) return;

    // Update thinking bar state to done
    const thinkingBtn = aiMsgElem.querySelector('button');
    if (thinkingBtn) {
      thinkingBtn.innerHTML = `
        <span class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
          <i data-lucide="check" class="w-3.5 h-3.5"></i>
          <span>Thought Process (已思考 3.2 秒 · 深度推理完成)</span>
        </span>
        <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
      `;
    }

    const streamArea = aiMsgElem.querySelector('.ai-stream-text');
    if (streamArea) {
      streamArea.innerHTML = `
        <p>已为你基于 <strong>pro-components</strong> 设计规范生成完整的前端组件代码，支持完整的暗黑主题自适应：</p>
        
        <!-- Code Window with Mac buttons -->
        <div class="rounded-xl overflow-hidden bg-zinc-950 text-zinc-100 text-[11px] font-mono border border-zinc-800 shadow-xl">
          <div class="px-4 py-2 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
              <span class="text-zinc-400 text-[11px] ml-2 font-sans font-medium">ResponsiveComponent.tsx</span>
            </div>
            <button onclick="copySnippetDirect(this)" class="text-zinc-400 hover:text-white flex items-center gap-1.5 text-[11px] transition-colors">
              <i data-lucide="copy" class="w-3 h-3"></i> 复制代码
            </button>
          </div>
          <pre class="p-4 overflow-x-auto text-emerald-400 leading-relaxed"><code>import React from 'react';

export function ProWidget({ title, badge = "Active" }: { title: string; badge?: string }) {
  return (
    &lt;div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all"&gt;
      &lt;div className="flex items-center justify-between"&gt;
        &lt;h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100"&gt;{title}&lt;/h4&gt;
        &lt;span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"&gt;
          {badge}
        &lt;/span&gt;
      &lt;/div&gt;
      &lt;p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2"&gt;
        完美对齐 Figma Token: var(--radius-lg) 与 var(--color-primary)。
      &lt;/p&gt;
    &lt;/div&gt;
  );
}</code></pre>
        </div>

        <!-- Action Bar -->
        <div class="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-zinc-400">
          <div class="flex items-center gap-4 text-[11px]">
            <button onclick="showToast('已记录优质响应！', 'success')" class="hover:text-zinc-200 flex items-center gap-1.5 transition-colors">
              <i data-lucide="thumbs-up" class="w-3.5 h-3.5"></i> 赞
            </button>
            <button onclick="showToast('已记录优化反馈！')" class="hover:text-zinc-200 flex items-center gap-1.5 transition-colors">
              <i data-lucide="thumbs-down" class="w-3.5 h-3.5"></i> 踩
            </button>
            <button onclick="showToast('重新生成中...')" class="hover:text-zinc-200 flex items-center gap-1.5 transition-colors">
              <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> 重新生成
            </button>
            <button onclick="showToast('Markdown 已复制到剪贴板！')" class="hover:text-zinc-200 flex items-center gap-1.5 transition-colors">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i> 复制全文
            </button>
          </div>
          <span class="text-[10px] text-zinc-400 font-mono">Tokens: 342 · 18ms</span>
        </div>
      `;
    }

    const sparkIcon = aiMsgElem.querySelector('.animate-spin');
    if (sparkIcon) sparkIcon.classList.remove('animate-spin');

    if (window.lucide) lucide.createIcons();
    container.scrollTop = container.scrollHeight;
    isAiResponding = false;
  }, 1000);
}

function toggleThinkingProcess(btn) {
  const content = btn.nextElementSibling;
  const icon = btn.querySelector('svg:last-child') || btn.querySelector('i:last-child');
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    if (icon) icon.style.transform = 'rotate(0deg)';
  } else {
    content.classList.add('hidden');
    if (icon) icon.style.transform = 'rotate(-90deg)';
  }
}

function copySnippetDirect(btn) {
  const codeBlock = btn.closest('.rounded-xl').querySelector('code');
  if (codeBlock) {
    navigator.clipboard.writeText(codeBlock.innerText).then(() => {
      btn.innerHTML = `<i data-lucide="check" class="w-3 h-3 text-emerald-400"></i> 已复制！`;
      if (window.lucide) lucide.createIcons();
      setTimeout(() => {
        btn.innerHTML = `<i data-lucide="copy" class="w-3 h-3"></i> 复制代码`;
        if (window.lucide) lucide.createIcons();
      }, 2000);
    });
  }
}

function createNewChat() {
  const container = document.getElementById('chatMessagesContainer');
  container.innerHTML = `
    <!-- Empty Welcome State Card -->
    <div id="aiWelcomeCard" class="py-12 px-4 text-center max-w-xl mx-auto space-y-6">
      <div class="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-primary text-white flex items-center justify-center mx-auto shadow-xl shadow-primary/20 ring-8 ring-primary/10">
        <i data-lucide="sparkles" class="w-8 h-8"></i>
      </div>
      <div>
        <h3 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Acme AI Studio</h3>
        <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
          新会话已开启。你可以随时向我提问关于组件构建、样式重构、Figma 设计提取或前后端架构的任何问题。
        </p>
      </div>

      <!-- 4 Quick Prompt Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        <button onclick="sendQuickPrompt('生成一个带搜索与分页的 NextUI 风格表格组件')" class="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all space-y-1 group">
          <div class="flex items-center gap-2 font-semibold text-xs text-zinc-800 dark:text-zinc-200 group-hover:text-primary">
            <i data-lucide="table" class="w-4 h-4 text-primary"></i> 生成 React 表格组件
          </div>
          <p class="text-[11px] text-zinc-400">带状态标签、分页栏与多选操作工具条</p>
        </button>

        <button onclick="sendQuickPrompt('解析 Figma pro-components 设计系统中的颜色令牌规范')" class="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all space-y-1 group">
          <div class="flex items-center gap-2 font-semibold text-xs text-zinc-800 dark:text-zinc-200 group-hover:text-primary">
            <i data-lucide="palette" class="w-4 h-4 text-purple-500"></i> 解析 Figma 颜色令牌
          </div>
          <p class="text-[11px] text-zinc-400">提取 Primary、Success、Danger 与 Neutrals</p>
        </button>

        <button onclick="sendQuickPrompt('为登录与注册认证模块编写具有安全校验的 Form 组件')" class="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all space-y-1 group">
          <div class="flex items-center gap-2 font-semibold text-xs text-zinc-800 dark:text-zinc-200 group-hover:text-primary">
            <i data-lucide="shield-check" class="w-4 h-4 text-emerald-500"></i> 安全认证 Form 组件
          </div>
          <p class="text-[11px] text-zinc-400">包含第三方 Google/GitHub 登录与密码可见切换</p>
        </button>

        <button onclick="sendQuickPrompt('生成一个带暗黑模式平滑渐变的 Chart.js 面积趋势图')" class="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all space-y-1 group">
          <div class="flex items-center gap-2 font-semibold text-xs text-zinc-800 dark:text-zinc-200 group-hover:text-primary">
            <i data-lucide="line-chart" class="w-4 h-4 text-amber-500"></i> 编写可视化趋势图
          </div>
          <p class="text-[11px] text-zinc-400">贝塞尔平滑曲线与动态 Tooltip 提示框</p>
        </button>
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
  showToast('已创建新对话 ✨');
}

function selectChatSession(title) {
  createNewChat();
  sendQuickPrompt(`恢复会话主题：${title}`);
}

function toggleWebSearch(btn) {
  const active = btn.classList.toggle('bg-primary/10');
  btn.classList.toggle('text-primary');
  showToast(active ? '已启用实时联网搜索 🌐' : '已关闭联网搜索', 'info');
}

function toggleDeepReasoning(btn) {
  const active = btn.classList.toggle('bg-purple-500/10');
  btn.classList.toggle('text-purple-500');
  showToast(active ? '已启用深度思维链推理 🧠' : '已切换为普通推理模式', 'info');
}

/* ================= 5. CHART.JS CONFIGURATION ================= */
let revenueChart = null;
let trafficChart = null;

function initCharts() {
  const ctxRevenue = document.getElementById('revenueTrendChart');
  const ctxTraffic = document.getElementById('trafficDonutChart');

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#a1a1aa' : '#71717a';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  if (ctxRevenue) {
    if (revenueChart) revenueChart.destroy();
    
    const gradient = ctxRevenue.getContext('2d').createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(0, 111, 238, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 111, 238, 0.0)');

    revenueChart = new Chart(ctxRevenue, {
      type: 'line',
      data: {
        labels: ['4月', '5月', '6月', '7月', '8月', '9月'],
        datasets: [
          {
            label: '实际收益 (Actual)',
            data: [185000, 210000, 245000, 230000, 275000, 284930],
            borderColor: '#006fee',
            backgroundColor: gradient,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#006fee',
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: '预期目标 (Target)',
            data: [170000, 195000, 220000, 240000, 260000, 280000],
            borderColor: isDark ? '#52525b' : '#d4d4d8',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            pointRadius: 0,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#27272a' : '#ffffff',
            titleColor: isDark ? '#f4f4f5' : '#18181b',
            bodyColor: isDark ? '#d4d4d8' : '#52525b',
            borderColor: isDark ? '#3f3f46' : '#e4e4e7',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Inter', size: 11 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Inter', size: 11 },
              callback: val => '¥' + (val / 1000) + 'k'
            }
          }
        }
      }
    });
  }

  if (ctxTraffic) {
    if (trafficChart) trafficChart.destroy();
    trafficChart = new Chart(ctxTraffic, {
      type: 'doughnut',
      data: {
        labels: ['自然搜索', '直接访问', '社交引流', '付费广告'],
        datasets: [{
          data: [45, 25, 20, 10],
          backgroundColor: ['#006fee', '#7828c8', '#17c964', '#f5a524'],
          borderWidth: isDark ? 2 : 2,
          borderColor: isDark ? '#16171a' : '#ffffff',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            cornerRadius: 8,
            padding: 8
          }
        }
      }
    });
  }
}

function updateChartThemes() {
  initCharts();
}

/* ================= 6. E-COMMERCE & MARKETING ================= */
function changeProductImg(src) {
  const img = document.getElementById('mainProductImg');
  if (img) img.src = src;
}

function selectColor(name, btn) {
  document.getElementById('selectedColorName').innerText = name;
  const btns = btn.parentElement.querySelectorAll('button');
  btns.forEach(b => b.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'dark:ring-offset-zinc-900'));
  btn.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'dark:ring-offset-zinc-900');
}

function changeQty(delta) {
  const qtyEl = document.getElementById('productQty');
  let current = parseInt(qtyEl.innerText) || 1;
  current = Math.max(1, current + delta);
  qtyEl.innerText = current;
}

function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const icon = btn.querySelector('svg') || btn.querySelector('i');
  if (answer.classList.contains('hidden')) {
    answer.classList.remove('hidden');
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    answer.classList.add('hidden');
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
}

function dismissCookieBanner() {
  const b = document.getElementById('cookieBanner');
  if (b) b.style.display = 'none';
  showToast('Cookie 设置偏好已保存');
}

/* ================= 7. SHORTCUTS & MODALS ================= */
function toggleCommandMenu(open) {
  const backdrop = document.getElementById('commandMenuBackdrop');
  if (open) {
    backdrop.classList.remove('hidden');
    document.getElementById('cmdInput').focus();
  } else {
    backdrop.classList.add('hidden');
  }
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleCommandMenu(true);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      createNewChat();
    }
    if (e.key === 'Escape') {
      toggleCommandMenu(false);
      closeCodeModal();
    }
  });

  const cmdBackdrop = document.getElementById('commandMenuBackdrop');
  if (cmdBackdrop) {
    cmdBackdrop.addEventListener('click', (e) => {
      if (e.target === cmdBackdrop) toggleCommandMenu(false);
    });
  }

  const codeBackdrop = document.getElementById('codeModalBackdrop');
  if (codeBackdrop) {
    codeBackdrop.addEventListener('click', (e) => {
      if (e.target === codeBackdrop) closeCodeModal();
    });
  }
}

/* ================= 8. TOAST SYSTEM ================= */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `px-4 py-3 rounded-2xl bg-zinc-900 text-white text-xs font-medium shadow-2xl border border-zinc-800 flex items-center gap-2.5 transition-all duration-300 pointer-events-auto transform translate-y-4 opacity-0`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle-2';
  if (type === 'error') iconName = 'alert-circle';

  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 ${type === 'success' ? 'text-emerald-400' : 'text-primary'}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function openGlobalCodeModal() {
  const modal = document.getElementById('codeModalBackdrop');
  modal.classList.remove('hidden');
}

function closeCodeModal() {
  document.getElementById('codeModalBackdrop').classList.add('hidden');
}

function copyModalCode() {
  const code = document.getElementById('codeModalContent').innerText;
  navigator.clipboard.writeText(code).then(() => {
    showToast('源码已成功复制！', 'success');
  });
}
