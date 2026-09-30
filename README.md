# Acme Pro Components & 领航 CRM (Navigator Enterprise)

<p align="center">
  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=400&fit=crop" alt="Acme Pro Banner" width="100%" style="border-radius: 16px;" />
</p>

<p align="center">
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-8.3-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://www.chartjs.org/"><img src="https://img.shields.io/badge/Chart.js-4.5-ff6384?style=flat-square&logo=chartdotjs&logoColor=white" alt="Chart.js" /></a>
  <a href="https://lucide.dev/"><img src="https://img.shields.io/badge/Lucide_Icons-1.48-f56565?style=flat-square" alt="Lucide React" /></a>
  <img src="https://img.shields.io/badge/Figma-v2.0_Tokens-f24e1e?style=flat-square&logo=figma&logoColor=white" alt="Figma Tokens" />
</p>

---

## 📖 项目简介 (Overview)

**Acme Pro Components & 领航 CRM** 是一套面向现代企业级 SaaS 应用的高保真设计系统与全功能商业销售云平台。项目深度还原 Figma 官方设计原稿（设计稿标识：`UGv1yrGRKKFxjXMBk4tnt3` 与 `ceF7DrlTuhCEJPg3X1gtkb`），基于 **React 19 + Vite 8 + Tailwind CSS 3** 构建。

项目采用双入口（Multi-Page Architecture, MPA）工程设计，既包含涵盖 5 大场景的设计系统组件展示台（Showcase），又集成了具备 10 大核心销售管理链路的领航商业 CRM 系统。

---

## 🌟 核心特性与应用模块

### 1. Acme Pro Components 设计系统展示平台 (Port 5173 / Showcase)

* **Application (企业后台管理系统)**：
  * **控制台概览 (Overview)**：组织活跃 KPI 指标卡片、带 Sparklines 迷你趋势线、组织成员高级数据表格（带即时搜索、状态过滤、多选复选框、批量操作工具条、分页）、SSO 单点登录配置卡及团队实时即时通讯。
  * **成员权限与组织治理 (Roles & Organization)**：五大部门层级卡片、部门主管与编制配额进度条（如 42/50 人）、新建子部门向导；细粒度 **RBAC 角色权限矩阵**（超级管理员、部门负责人、研发架构师、商务运营、合规审计员），支持 14 项策略项动态开关及实时状态下发。
  * **数据报表与 BI 综合分析 (Reports & Analytics)**：时间范围跨度筛选（近7天、近30天、本季度、年度）、DAU/MAU 黏性指标、API 吞吐曲线、各部门云成本消耗环形/堆叠进度归集、定时报表生成与订阅调度列表（支持一键导出 Excel / PDF）。
  * **审计日志 & 安全态势中心 (Audit Logs & Security)**：全链路安全操作追溯表（时间戳、操作人头像、行为类型、受影响资源、IP 归属、高危风险徽章、阻断状态）；事件溯源详情模态框（含原始 Request ID 与 JSON 快照）；全员强制 2FA、防截屏动态水印、会话超时锁定策略；CIDR 可信 IP 白名单访问控制规则库。
* **AI (智能对话工作台)**：
  * 深度还原现代 AI Studio 界面，支持多会话侧边栏管理、流式对话气泡渲染、Markdown 代码高亮与一键复制、温度（Temperature）/ Top P 模型超参数调优面板。
* **Marketing (企业营销落地页)**：
  * 包含 Hero 展台、核心功能卡片网格、三阶阶梯价格订阅表、客户好评走马灯与 CTA 转化横幅。
* **E-commerce (电商体系)**：
  * 现代化商品网格、购物车侧滑抽屉与结算核算卡。
* **Charts (数据可视化体系)**：
  * 基于 Chart.js 深度定制的折线走势图、转化漏斗图、雷达图与环形占比图，无缝适配暗黑模式重绘。
* **交互体验增强**：
  * 全局快捷键 `⌘K` / `Ctrl+K` 快速命令调色板 (Command Menu)、`⌘N` 快速新建会话、代码导出模态框 (Code Modal) 与统一 Toast 交互反馈。

---

### 2. 领航 CRM 企业销售数字化工作台 (Port 3001 / `/crm/`)

针对企业级商业化增长场景打造的全流程销售管理平台，支持双视图切换：
* **企业级品牌登录认证页 (LoginView)**：
  * 沉浸式环境光晕动效、双栏企业品牌赋能展台、账号密码登录、手机验证码登录、微信企业扫码接入及安全审计保障。
* **全功能销售工作台 (Workbench)**：
  1. **Dashboard (核心仪表盘)**：业绩总览 KPI 卡片、销售趋势走势图（日/周/月/季切分）、待办跟进日程与动态。
  2. **Leads (线索管理)**：线索漏斗全流程跟进，支持一键将线索无缝转化为商机合同。
  3. **Customers (客户 360° 视图)**：客户等级划分、关键联系人详情与跟进记录抽屉 (Followup Drawer)。
  4. **Deals (商机漏斗/看板)**：商机推进阶段流转看板、赢单概率测算与新建商机模态框。
  5. **Contracts (合同管理)**：合同履约、审批流程流转与归档。
  6. **Payments (回款财务)**：阶段回款追踪与开票流水管理。
  7. **Products (产品报价库)**：产品 SKU 目录、定价策略与库存信息。
  8. **Leaderboard (业绩龙虎榜)**：个人与团队销售战报排名榜。
  9. **Analytics (BI 商业智能分析)**：跨维度销售预测、转化率透视与数据下钻。
  10. **AiCopilot (销售 AI 助理)**：智能销售战报生成、线索评分预警与沟通话术智能推荐。

---

## 🏗️ 目录结构 (Directory Structure)

```text
acme-pro-components/
├── crm/
│   └── index.html                # 领航 CRM 多页面入口 HTML
├── dist/                         # 生产环境打包输出目录
├── index.html                    # Showcase 设计系统入口 HTML
├── figma_reader.py               # Figma API 自动化提取与图层解析脚本
├── package.json                  # 项目依赖与启动脚本
├── postcss.config.js             # PostCSS 插件配置
├── tailwind.showcase.config.js   # Showcase 专用 Tailwind 主题配置 (Primary 体系)
├── tailwind.crm.config.js        # CRM 专用 Tailwind 主题配置 (Brand 商业蓝体系)
├── vite.config.js                # Vite MPA 多入口构建配置
└── src/
    ├── shared/                   # 跨应用共享基础资产
    │   ├── brandIcons.js         # Figma / GitHub 品牌矢量 SVG
    │   ├── Icon.jsx              # 通用图标组件包装层
    │   ├── icons.js              # Lucide 图标注册与映射表
    │   └── tokens.css            # 统一 Figma Design Tokens (亮/暗色变量)
    ├── showcase/                 # 设计系统展示平台
    │   ├── components/           # Header, CommandMenu, CodeModal, ToastProvider
    │   ├── hooks/                # useTheme (深浅色模式持久化)
    │   ├── sections/             # 各核心业务模块
    │   │   ├── ai/               # AI 对话工作室全套组件
    │   │   ├── application/      # 后台系统 (Overview, Roles, Analytics, Security)
    │   │   ├── ChartsSection.jsx # 图表库展示
    │   │   ├── EcommerceSection.jsx
    │   │   └── MarketingSection.jsx
    │   ├── showcase.css          # Showcase 独立样式入口 (@config 隔离)
    │   └── main.jsx
    └── crm/                      # 领航 CRM 商业工作台
        ├── charts/               # 销售趋势与 BI 图表 (Chart.js)
        ├── components/           # 侧边栏、顶部导航、登录页、新建商机/线索弹窗
        ├── data/                 # 模块标题与初始模拟数据
        ├── hooks/                # CRM 专用 Hook (useTheme, useToast)
        ├── modules/              # 10 大核心销售管理业务模块
        ├── crm.css               # CRM 独立样式入口 (@config 隔离)
        └── main.jsx
```

---

## 🚀 快速上手 (Getting Started)

### 环境要求
* **Node.js**: `>= 18.0.0` (推荐 Node.js 20 或 22)
* **npm** 或 **pnpm** / **yarn**

### 安装依赖
```bash
npm install
```

### 开发环境启动
```bash
# 启动 Vite 开发服务器 (支持 0.0.0.0 局域网访问)
npm run dev -- --host 0.0.0.0
```

启动完成后，可直接在浏览器中访问：
* **Acme Pro Components 设计系统**：`http://localhost:5173/`
* **领航 CRM 销售工作台 (Vite 路径)**：`http://localhost:5173/crm/`
* **领航 CRM 销售工作台 (专属端口)**：`http://localhost:3001/`

### 生产环境打包
```bash
# 全量构建两个多页面应用到 dist/ 目录
npm run build

# 预览生产构建产物
npm run preview
```

---

## 🎨 设计规范与主题系统 (Design Tokens)

项目完整提取了 Figma 官方设计原稿的设计规范，集中声明于 `src/shared/tokens.css` 中：
* **品牌主色阶**：
  * Primary: `#006fee`（悬浮态 `#005bc4`，浅底态 `#e6f1fe`）
  * Secondary: `#7828c8` | Success: `#17c964` | Warning: `#f5a524` | Danger: `#f31260`
  * CRM Brand: `#006fee` ~ `#07336b` 完整企业蓝阶梯
* **无缝暗黑模式**：
  * 支持一键切换深色模式（Dark Mode），背景自适应切入 `#09090b` / `#121316`，自动重绘 Chart.js 坐标轴与网格颜色。
* **多 Tailwind 隔离机制**：
  * 通过 CSS `@config` 指令分别加载 `tailwind.showcase.config.js` 与 `tailwind.crm.config.js`，避免多套设计风格的类名冲突。

---

## 🛠️ Figma 自动化同步工具 (figma_reader.py)

项目包含用于提取和审查 Figma 原稿图层结构的 Python 工具：

```bash
# 查看指定 Figma 文件的图层结构摘要
python3 figma_reader.py UGv1yrGRKKFxjXMBk4tnt3 --summary

# 导出指定图层节点的完整 JSON 规范
python3 figma_reader.py UGv1yrGRKKFxjXMBk4tnt3 --node 2:7578 --export figma_nodes.json
```

---

## 📄 开源许可证 (License)

本项目基于 [MIT License](LICENSE) 开源。
