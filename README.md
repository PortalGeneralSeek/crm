# Acme CRM Enterprise (领航商业销售云平台)

企业级现代销售数字化工作台与设计系统组件展示平台。

## 📁 目录结构

本项目采用 Monorepo 统一代码仓库管理：

```text
├── back/        # Go 后端工程 (GoFiber + GORM + MySQL + Redis)
├── web/         # React 前端工程 (React 19 + Vite 8 + Tailwind CSS 3)
├── .gitignore   # 全局 Git 忽略规则 (严格忽略所有环境配置与凭据)
└── README.md    # 项目根说明文档
```

---

## 🚀 模块说明与快速启动

### 1. 前端模块 (`web/`)
- **技术栈**：React 19 + Vite 8 + Tailwind CSS 3 + Lucide Icons + Chart.js + Lightweight Charts
- **快速启动**：
  ```bash
  cd web
  npm install
  npm run dev      # 启动本地开发服务器 (默认端口 5173)
  npm run build    # 生产构建 (产物输出至 web/dist)
  ```
- 详见 [web/README.md](web/README.md)。

### 2. 后端模块 (`back/`)
- **技术栈**：Go 1.22 + GoFiber v2 + GORM + MySQL 8.0 连接池 + Redis 7 缓存
- **快速启动**：
  ```bash
  cd back
  # 本地根据环境配置 .env (已被 .gitignore 严格忽略，避免泄露)
  go build -o bin/server cmd/server/main.go
  ./bin/server     # 默认监听 127.0.0.1:8080
  ```
- 详见 [back/README.md](back/README.md)。
