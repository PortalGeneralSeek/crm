/**
 * 领航 CRM - Core Application Logic & 10 Modules Controller
 * Port 3001 | Navigator Enterprise CRM
 */

// Global Chart Instances
let salesTrendChart = null;
let biIndustryChart = null;
let biCycleChart = null;

// Module Title Map
const moduleTitles = {
  'dashboard': '销售工作台 · 全局仪表盘',
  'leads': '核心销售 · 全渠道线索池管理',
  'customers': '核心销售 · 客户资产与公海流转',
  'deals': '核心销售 · 商机阶段漏斗看板',
  'contracts': '商务与交易 · 合同与订单审批中心',
  'payments': '商务与交易 · 回款计划与发票税务',
  'products': '商务与交易 · 产品目录与 CPQ 报价配置器',
  'leaderboard': '数据与协同 · 全国各大战区销售排行榜',
  'analytics': '数据与协同 · 销售 BI 商业智能与客群报表',
  'ai-copilot': '数据与协同 · 领航 AI 销售 Copilot 智能工作台'
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initTheme();
  initCharts();
  initKeyboardShortcuts();
  initRowCheckboxes();
  calculateCpq();
});

/**
 * 1. Lucide Icons Initializer
 */
function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * 2. Dark / Light Theme Manager
 */
function initTheme() {
  const savedTheme = localStorage.getItem('crm-theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeIcons();
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('crm-theme', isDark ? 'dark' : 'light');
  updateThemeIcons();
  updateAllChartsTheme();
  showToast(isDark ? '已切换至深色模式 (Dark Theme)' : '已切换至浅色模式 (Light Theme)');
}

function updateThemeIcons() {
  const isDark = document.documentElement.classList.contains('dark');
  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');
  if (sunIcon && moonIcon) {
    if (isDark) {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    } else {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    }
  }
  initIcons();
}

/**
 * 3. View Switcher (销售工作台 vs 登录认证页)
 */
function switchView(viewName) {
  const workbenchView = document.getElementById('view-workbench');
  const loginView = document.getElementById('view-login');
  const btnWorkbench = document.getElementById('switch-workbench');
  const btnLogin = document.getElementById('switch-login');

  if (viewName === 'workbench') {
    loginView.classList.add('view-hidden');
    workbenchView.classList.remove('view-hidden');

    btnWorkbench.className = "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-zinc-700 text-brand-600 dark:text-blue-400 shadow-sm transition-all";
    btnLogin.className = "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all";
    
    setTimeout(() => {
      if (salesTrendChart) salesTrendChart.resize();
    }, 100);
  } else {
    workbenchView.classList.add('view-hidden');
    loginView.classList.remove('view-hidden');

    btnLogin.className = "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-zinc-700 text-brand-600 dark:text-blue-400 shadow-sm transition-all";
    btnWorkbench.className = "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all";
  }

  initIcons();
}

/**
 * 4. Module Switcher (10 Modules Controller)
 */
function switchModule(moduleKey, element) {
  // Hide all modules
  document.querySelectorAll('.crm-module').forEach(mod => {
    mod.classList.add('hidden');
  });

  // Show target module
  const targetModule = document.getElementById(`module-${moduleKey}`);
  if (targetModule) {
    targetModule.classList.remove('hidden');
  }

  // Update Header Title
  const titleEl = document.getElementById('current-module-title');
  if (titleEl && moduleTitles[moduleKey]) {
    titleEl.innerText = moduleTitles[moduleKey];
  }

  // Update Sidebar active style
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.className = "sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors";
  });

  const activeItem = element || document.querySelector(`.sidebar-item[data-mod="${moduleKey}"]`);
  if (activeItem) {
    activeItem.className = "sidebar-item flex items-center gap-3 px-3 py-2 rounded-xl bg-brand-50 dark:bg-blue-950/60 font-semibold text-brand-600 dark:text-blue-400 transition-colors";
  }

  // Special hooks on module switch
  if (moduleKey === 'analytics') {
    initBiCharts();
  } else if (moduleKey === 'dashboard') {
    setTimeout(() => { if (salesTrendChart) salesTrendChart.resize(); }, 60);
  }

  // Scroll to top
  const viewport = document.getElementById('main-content-viewport');
  if (viewport) viewport.scrollTo({ top: 0, behavior: 'smooth' });

  initIcons();
  showToast(`已进入: ${moduleTitles[moduleKey] || moduleKey}`);
}

/**
 * 5. Login Page Interactions
 */
function switchLoginTab(tab) {
  const tabAccount = document.getElementById('tab-login-account');
  const tabSms = document.getElementById('tab-login-sms');
  const tabQr = document.getElementById('tab-login-qrcode');

  const formAccount = document.getElementById('login-form-account');
  const formSms = document.getElementById('login-form-sms');
  const formQr = document.getElementById('login-form-qrcode');

  const activeTabClasses = "pb-3 border-b-2 border-brand-500 font-semibold text-brand-600 dark:text-blue-400 transition-colors";
  const inactiveTabClasses = "pb-3 border-b-2 border-transparent font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors";

  [tabAccount, tabSms, tabQr].forEach(t => t.className = inactiveTabClasses);
  [formAccount, formSms, formQr].forEach(f => f.classList.add('hidden'));

  if (tab === 'account') {
    tabAccount.className = activeTabClasses;
    formAccount.classList.remove('hidden');
  } else if (tab === 'sms') {
    tabSms.className = activeTabClasses;
    formSms.classList.remove('hidden');
  } else if (tab === 'qrcode') {
    tabQr.className = activeTabClasses;
    formQr.classList.remove('hidden');
  }

  initIcons();
}

function togglePasswordVisibility() {
  const pwdInput = document.getElementById('login-pwd-input');
  const eyeIcon = document.getElementById('pwd-eye-icon');
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    eyeIcon.setAttribute('data-lucide', 'eye-off');
  } else {
    pwdInput.type = 'password';
    eyeIcon.setAttribute('data-lucide', 'eye');
  }
  initIcons();
}

function handleLoginSubmit(e) {
  e.preventDefault();
  showToast(`身份验证成功！欢迎陈明总监登录领航 CRM 工作台。`);
  setTimeout(() => {
    switchView('workbench');
  }, 400);
}

/**
 * 6. Charts Manager
 */
function initCharts() {
  const ctx = document.getElementById('crm-sales-trend-chart');
  if (!ctx) return;

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#a1a1aa' : '#71717a';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月(当月)', '10月(预测)', '11月(预测)', '12月(预测)'];
  const actualSales = [42, 58, 65, 72, 85, 96, 78, 92, 82.5, null, null, null];
  const targetSales = [50, 50, 60, 60, 75, 80, 85, 90, 100, 100, 110, 120];

  salesTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: '实际达成销售额 (万元)',
          data: actualSales,
          borderColor: '#006fee',
          backgroundColor: 'rgba(0, 111, 238, 0.08)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#006fee',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4.5,
        },
        {
          label: '考核目标 (万元)',
          data: targetSales,
          borderColor: isDark ? '#52525b' : '#d4d4d8',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.2,
          fill: false,
          pointBackgroundColor: isDark ? '#52525b' : '#a1a1aa',
          pointRadius: 3,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#18181b' : '#ffffff',
          titleColor: isDark ? '#f4f4f5' : '#18181b',
          bodyColor: isDark ? '#d4d4d8' : '#3f3f46',
          borderColor: isDark ? '#27272a' : '#e4e4e7',
          borderWidth: 1,
          padding: 10,
        }
      },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: textColor, font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: {
            color: textColor,
            font: { family: 'JetBrains Mono', size: 11 },
            callback: value => '¥' + value + '万'
          },
          min: 0,
          max: 130
        }
      }
    }
  });
}

function initBiCharts() {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#a1a1aa' : '#71717a';

  // Industry Doughnut Chart
  const indCtx = document.getElementById('bi-industry-chart');
  if (indCtx && !biIndustryChart) {
    biIndustryChart = new Chart(indCtx, {
      type: 'doughnut',
      data: {
        labels: ['智能安防 (35%)', '金融科技 (25%)', '智能物流 (20%)', '新能源座舱 (12%)', '泛互企业 (8%)'],
        datasets: [{
          data: [35, 25, 20, 12, 8],
          backgroundColor: ['#006fee', '#7828c8', '#58a8ff', '#17c964', '#f5a524'],
          borderWidth: 2,
          borderColor: isDark ? '#18181b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: textColor, font: { family: 'Inter', size: 11 } }
          }
        },
        cutout: '65%'
      }
    });
  }

  // Stage Cycle Bar Chart
  const cycCtx = document.getElementById('bi-cycle-chart');
  if (cycCtx && !biCycleChart) {
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
    biCycleChart = new Chart(cycCtx, {
      type: 'bar',
      data: {
        labels: ['初步接触', '方案答辩验证', '商务价格谈判', '法务终审用印', '首期打款确认'],
        datasets: [{
          label: '平均流转周期 (天)',
          data: [4.5, 9.2, 13.8, 4.1, 3.2],
          backgroundColor: '#006fee',
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, callback: val => val + '天' }
          },
          y: {
            grid: { display: false },
            ticks: { color: textColor }
          }
        }
      }
    });
  }
}

function updateAllChartsTheme() {
  if (salesTrendChart) {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#a1a1aa' : '#71717a';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

    salesTrendChart.options.scales.x.ticks.color = textColor;
    salesTrendChart.options.scales.x.grid.color = gridColor;
    salesTrendChart.options.scales.y.ticks.color = textColor;
    salesTrendChart.options.scales.y.grid.color = gridColor;
    salesTrendChart.data.datasets[1].borderColor = isDark ? '#52525b' : '#d4d4d8';
    salesTrendChart.update();
  }
  if (biIndustryChart) biIndustryChart.update();
  if (biCycleChart) biCycleChart.update();
}

/**
 * 7. CPQ Calculator Logic
 */
function calculateCpq() {
  const seatsInput = document.getElementById('cpq-seats');
  if (!seatsInput) return;

  const seats = parseInt(seatsInput.value, 10);
  document.getElementById('cpq-seats-label').innerText = `${seats} 席`;

  const hasAi = document.getElementById('cpq-ai').checked;
  const hasPrivate = document.getElementById('cpq-private').checked;
  const hasSla = document.getElementById('cpq-sla').checked;
  const discountRatio = parseFloat(document.getElementById('cpq-discount').value);

  // Base Seats (1,200/seat)
  let origTotal = seats * 1200;
  if (hasAi) origTotal += 18000;
  if (hasPrivate) origTotal += 280000;
  if (hasSla) origTotal += 80000;

  const finalTotal = Math.round(origTotal * discountRatio);
  const discountAmount = origTotal - finalTotal;

  document.getElementById('cpq-orig-price').innerText = `¥${origTotal.toLocaleString()}`;
  document.getElementById('cpq-discount-amount').innerText = `-¥${discountAmount.toLocaleString()}`;
  document.getElementById('cpq-final-price').innerText = `¥${finalTotal.toLocaleString()}`;
}

function generateFormalQuote() {
  const finalPrice = document.getElementById('cpq-final-price').innerText;
  const seats = document.getElementById('cpq-seats-label').innerText;
  showToast(`已生成正式商业报价单 (金额: ${finalPrice} · ${seats})，已开启下载！`);
}

/**
 * 8. Leads Management
 */
function filterLeadsCategory(cat, btn) {
  document.querySelectorAll('.leads-cat-btn').forEach(b => {
    b.className = "leads-cat-btn px-3 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800";
  });
  btn.className = "leads-cat-btn px-3 py-1 rounded-lg text-xs font-semibold bg-brand-500 text-white";

  const rows = document.querySelectorAll('#leads-tbody tr');
  rows.forEach(r => {
    if (cat === 'all' || r.innerText.includes(cat)) {
      r.style.display = '';
    } else {
      r.style.display = 'none';
    }
  });
}

function searchLeads(q) {
  const lower = q.toLowerCase().trim();
  const rows = document.querySelectorAll('#leads-tbody tr');
  rows.forEach(r => {
    if (!lower || r.innerText.toLowerCase().includes(lower)) {
      r.style.display = '';
    } else {
      r.style.display = 'none';
    }
  });
}

function convertLeadToDeal(company, contact) {
  showToast(`线索「${company} - ${contact}」已成功转化为商机！`, 'success');
  // Open deal modal pre-filled
  openModal('modal-new-deal');
  document.getElementById('new-deal-company').value = company;
  document.getElementById('new-deal-title').value = `${company} 2026 年度企业数字化采购`;
}

function batchAssignLeads() {
  showToast('智能算法已完成 24 条线索的自动分流派发！');
}

/**
 * 9. Customers & Open Sea Management
 */
function switchCustomerTab(type) {
  const btnPriv = document.getElementById('cust-tab-private');
  const btnPub = document.getElementById('cust-tab-public');
  const secPriv = document.getElementById('cust-section-private');
  const secPub = document.getElementById('cust-section-public');

  if (type === 'private') {
    btnPriv.className = "px-3.5 py-1.5 rounded-lg font-semibold bg-white dark:bg-zinc-700 text-brand-600 dark:text-blue-400 shadow-xs transition-all";
    btnPub.className = "px-3.5 py-1.5 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 transition-all";
    secPriv.classList.remove('hidden');
    secPub.classList.add('hidden');
  } else {
    btnPub.className = "px-3.5 py-1.5 rounded-lg font-semibold bg-white dark:bg-zinc-700 text-brand-600 dark:text-blue-400 shadow-xs transition-all";
    btnPriv.className = "px-3.5 py-1.5 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 transition-all";
    secPub.classList.remove('hidden');
    secPriv.classList.add('hidden');
  }
}

function releaseToOpenSea(company) {
  if (confirm(`确定将客户「${company}」主动退回公共公海池吗？`)) {
    showToast(`客户「${company}」已释放至公海池，他人可自主捡入。`);
  }
}

function claimCustomer(company) {
  showToast(`已成功将「${company}」从公海池捡入您的私海！请在15天内完成首访。`, 'success');
  setTimeout(() => switchCustomerTab('private'), 600);
}

/**
 * 10. Deals Pipeline Actions
 */
function moveDealStage(btn, nextStage) {
  const card = btn.closest('.bg-white');
  card.style.transform = 'scale(0.95)';
  setTimeout(() => {
    card.remove();
    showToast(`商机已推进至「${nextStage}」阶段！加权签约概率提升。`, 'success');
  }, 200);
}

/**
 * 11. Contracts Approval
 */
function approveContract(contractNo, btn) {
  const row = btn.closest('tr');
  const statusPill = row.querySelector('td:nth-child(4) span');
  if (statusPill) {
    statusPill.className = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]";
    statusPill.innerHTML = "已审批通过 · 待双方电子签章";
  }
  btn.parentElement.innerHTML = `<span class="text-emerald-600 font-semibold text-xs">已核准签字 ✅</span>`;
  showToast(`合同 ${contractNo} 审批通过！已自动流转至法务盖章环节。`, 'success');
}

/**
 * 12. AI Copilot Workbench
 */
function runAiCopilotPrompt(type) {
  const input = document.getElementById('ai-workbench-input');
  if (type === 'meeting') {
    input.value = "今天与大华股份技术VP孙总及采购处进行商务复盘。客户主要关心：1. 视频流解析时吞吐是否有丢帧；2. 首付款能否降低至 40%；3. 能否在下周三安排2名工程师驻场。";
  } else if (type === 'pitch') {
    input.value = "面对顺丰科技提及某友商报价比我们低 15% 并承诺赠送二期算力，销售应该如何进行差异化价值防守？";
  } else {
    input.value = "请检索并输出 蔚来汽车 (NIO) 最新智能座舱软件招投标动态与主要决策人背景矩阵。";
  }
  executeAiCopilot();
}

function executeAiCopilot() {
  const input = document.getElementById('ai-workbench-input');
  const resultBox = document.getElementById('ai-workbench-result');
  const text = input.value.trim();
  if (!text) {
    showToast('请输入销售指令或纪要文本');
    return;
  }

  resultBox.innerText = "领航销售大模型正在深度解析并重构 CRM 商业洞察，请稍候...";

  setTimeout(() => {
    if (text.includes('大华')) {
      resultBox.innerText = 
`【AI 拜访纪要萃取 & CRM 自动归档字段】
• 客户主体：浙江大华技术股份有限公司
• 关键联系人：孙志宏 (技术VP)
• 商务诉求：要求调整首付比例至 40% (当前为 50%)
• 技术痛点：高吞吐低延迟与避免丢帧 SLA
• 建议策略：
  1. 同意首付 45% 折中方案，但要求缩短验收测试周期为 10 个工作日；
  2. 承诺提供 2 名驻场专家，并写入正式合同服务附件。
• 赢单概率：92% ↑ (建议发起总监特批合同流程)`;
    } else if (text.includes('顺丰')) {
      resultBox.innerText = 
`【AI 竞对防御策略卡片】
1. 算力成本陷阱：友商虽然赠送二期算力，但采用专有封闭协议，后续扩展硬件费用将高出 40%；
2. 稳定性背书：我司在理想汽车与微盟均有实际亿级并发线上经验，故障恢复时间 < 30 秒；
3. 话术推荐：“林总，采购系统就像买车，省下 15% 的初装费，如果因为高峰期延迟导致调度停滞，每小时损失远超数十万。领航提供的是 7×24 驻场确定性。”`;
    } else {
      resultBox.innerText = 
`【AI 潜客 360° 深度背调简报】
• 企业主体：蔚来汽车 (NIO Inc.)
• 决策链关键人：智能座舱副总裁、车联网采购高级总监
• 最新动态：Q2 财报披露座舱 AI 多模态交互研发预算同比增长 45%
• 推荐破局点：从车内语音降噪大模型插件切入，建议协同售前架构师预约线上 PoC。`;
    }
    showToast('AI 深度解析已完成！', 'success');
  }, 400);
}

function copyAiWorkbenchResult() {
  const text = document.getElementById('ai-workbench-result').innerText;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('分析结果已复制到剪贴板！'));
  } else {
    showToast('结果已复制！');
  }
}

/**
 * 13. Period Filter (Workbench Dashboard)
 */
function setFilterPeriod(period, btn) {
  document.querySelectorAll('.period-btn').forEach(b => {
    b.className = "period-btn px-3 py-1.5 rounded-lg font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 transition-all";
  });
  btn.className = "period-btn px-3 py-1.5 rounded-lg font-semibold bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs transition-all";

  if (!salesTrendChart) return;

  if (period === 'month') {
    salesTrendChart.data.labels = ['第1周', '第2周', '第3周', '第4周(当前)', '第5周'];
    salesTrendChart.data.datasets[0].data = [18, 38, 62, 82.5, null];
    salesTrendChart.data.datasets[1].data = [20, 45, 75, 100, 100];
    salesTrendChart.options.scales.y.max = 110;
  } else if (period === 'quarter') {
    salesTrendChart.data.labels = ['7月', '8月', '9月 (Q3)'];
    salesTrendChart.data.datasets[0].data = [78, 92, 82.5];
    salesTrendChart.data.datasets[1].data = [85, 90, 100];
    salesTrendChart.options.scales.y.max = 120;
  } else {
    salesTrendChart.data.labels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    salesTrendChart.data.datasets[0].data = [42, 58, 65, 72, 85, 96, 78, 92, 82.5, null, null, null];
    salesTrendChart.data.datasets[1].data = [50, 50, 60, 60, 75, 80, 85, 90, 100, 100, 110, 120];
    salesTrendChart.options.scales.y.max = 130;
  }
  salesTrendChart.update();
  showToast(`已切换至: ${btn.innerText}`);
}

/**
 * 14. Modals & Forms
 */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('hidden');
    initIcons();
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('hidden');
}

function handleCreateDeal(e) {
  e.preventDefault();
  const title = document.getElementById('new-deal-title').value;
  const company = document.getElementById('new-deal-company').value;
  const amount = Number(document.getElementById('new-deal-amount').value);
  closeModal('modal-new-deal');
  showToast(`商机「${title}」创建成功！预估金额 ¥${amount.toLocaleString()}`, 'success');
}

function handleCreateLead(e) {
  e.preventDefault();
  const company = document.getElementById('lead-company').value;
  const name = document.getElementById('lead-name').value;
  closeModal('modal-new-lead');
  showToast(`线索「${company} - ${name}」已录入线索池！`, 'success');
}

function openFollowupDrawer(companyName) {
  document.getElementById('followup-target-company').innerText = companyName;
  document.getElementById('drawer-followup').classList.remove('translate-x-full');
  initIcons();
}

function closeFollowupDrawer() {
  document.getElementById('drawer-followup').classList.add('translate-x-full');
}

function handleSaveFollowup(e) {
  e.preventDefault();
  const comp = document.getElementById('followup-target-company').innerText;
  closeFollowupDrawer();
  showToast(`已成功为「${comp}」归档最新跟进记录！`, 'success');
}

function toggleNotificationDropdown() {
  document.getElementById('dropdown-notifications').classList.toggle('hidden');
}

function handleGlobalSearch(q) {
  if (q.trim()) {
    showToast(`全局匹配关键字: "${q}"`);
  }
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const s = document.getElementById('global-crm-search');
      if (s) s.focus();
    }
  });
}

function initRowCheckboxes() {
  document.querySelectorAll('.row-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {});
  });
}

function toggleSelectAll(masterCb) {
  document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = masterCb.checked);
}

/**
 * 15. Global Toast Notification
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = "pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs shadow-2xl border border-zinc-800 dark:border-zinc-200 backdrop-blur-md transform transition-all duration-300 translate-y-3 opacity-0";
  
  let icon = 'check-circle';
  if (type === 'warning' || message.includes('注意')) icon = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${icon}" class="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0"></i>
    <span class="font-medium">${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);
  initIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-3', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
