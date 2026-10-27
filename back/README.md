# Acme CRM Enterprise GoFiber Backend Service

企业级销售云平台高性能 Go 后端服务，基于 **Go 1.22 + GoFiber v2 + GORM + MySQL 8.0 连接池 + Redis 7** 构建，提供全链路 RBAC 细粒度权限控制与敏感价格脱敏保护。

---

## 🌟 核心特性

1. **GoFiber 高并发架构**：基于 Fasthttp 核心的高性能 Web 框架，提供零分配路由、结构化 JSON 日志与全局 Panic 恢复。
2. **MySQL 8.0 数据库连接池**：
   - 显式配置 `SetMaxOpenConns(30)`、`SetMaxIdleConns(10)` 及 `SetConnMaxLifetime(1h)`；
   - 自动迁移并初始化角色、动态菜单树、按钮权限码与测试数据。
3. **Redis 7.0 缓存集群与降级兜底**：
   - 连接池管理与用户权限缓存（TTL 12h）；
   - 角色权限更新时自动级联失效缓存；
   - 具备内存 Map 降级引擎，若 Redis 网络抖动自动无感兜底，系统永不崩溃。
4. **精确到按钮与价格的三级权限模型**：
   - **动态菜单级 (Menu)**：根据登录角色动态生成树形导航菜单，无权菜单在数据库端即过滤，前端直接按需挂载。
   - **动作按钮级 (Button)**：精准控制 `btn:deal:add`、`btn:deal:export`、`btn:deal:delete`、`btn:deal:advance_stage`、`btn:lead:convert` 等按钮。
   - **价格字段级 (Price Field)**：
     - 普通销售（`sales_rep`）：不可见采购底价与毛利率，后端在序列化层将 `costPrice` 与 `marginRate` 抹除并脱敏为 `¥*** (底价脱敏)`，防止网络抓包数据泄露；
     - 销售总监（`sales_director`）与超管：可见真实标的金额、底价与毛利率，享有特批折扣与审批权。

---

## 🔑 内置预设测试账号

| 账号 | 初始密码 | 角色 | 权限说明 |
| :--- | :--- | :--- | :--- |
| **admin** | `admin123` | **超级管理员** | 拥有全部 10 个业务菜单、所有按钮、敏感底价及全系统特权 (`*`) |
| **director** | `director123` | **销售总监** | 拥有全部 CRM 业务菜单、可查看敏感采购底价与毛利率、可导出商机与审批特价 |
| **rep** | `rep123` | **客户经理 (普通销售)** | 仅有 5 个授权菜单 (仪表盘、线索、客户、商机、榜单)，**底价脱敏为 `***`，无导出与删除权限** |
| **finance** | `finance123` | **财务审计主管** | 拥有商机、合同、回款、报表菜单及导出权，可审核采购成本 |

---

## 🚀 启动与构建

```bash
# 1. 复制环境配置
cp .env.example .env

# 2. 编译并运行
go build -o bin/server cmd/server/main.go
./bin/server
```
服务默认监听在 `http://0.0.0.0:8080`。
