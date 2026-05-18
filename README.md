# B2B Lead Gen | 企业全球获客平台

智能全球客户线索挖掘、邮箱验证、邮件营销自动化平台。

## 🎯 核心功能

- **线索采集**：Apollo.io / Hunter.io API + 开源工具 自动搜索全球采购商邮箱
- **邮箱验证**：三级验证流水线（格式→MX→SMTP+第三方API）
- **邮件营销**：多平台免费额度叠加（Brevo 300封/日 + Resend 100封/日 + Mailgun 100封/日）
- **收件箱**：IMAP实时监听客户回复，自动归并为精准有效线索
- **数据看板**：采集→验证→发送→回复 全漏斗分析

## 🏗 技术栈

- **前端**: Next.js 15 + shadcn/ui + Tailwind CSS
- **后端**: NestJS + Prisma ORM
- **数据库**: PostgreSQL (Supabase)
- **队列**: BullMQ + Redis
- **部署**: Vercel + Railway + Supabase (~$0/月)

## 📂 项目结构

```
├── apps/
│   ├── web/          # Next.js 管理后台
│   └── api/          # NestJS API 服务
├── packages/
│   ├── shared/       # Prisma Schema + 共享类型
│   ├── email-engine/ # 邮件发送/接收引擎
│   ├── data-sources/ # 外部数据源适配器
│   └── queue-workers/ # BullMQ Worker 实现
├── docker/           # Docker Compose 开发环境
└── supabase/         # 数据库迁移
```

## 🚀 快速开始

### 环境要求
- Node.js >= 22
- pnpm >= 10
- Docker (用于本地 Redis 和 Postgres)

### 安装

```bash
# 克隆仓库
cd 企业获客平台

# 安装依赖
pnpm install

# 启动本地基础设施
docker compose -f docker/docker-compose.yml up -d postgres redis

# 初始化数据库
pnpm db:generate
pnpm db:push

# 配置环境变量
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local apps/web/.env.local
# 编辑 .env 文件（至少配置 JWT_SECRET）

# 启动开发服务
pnpm dev          # 同时启动前端 + 后端 + Workers
```

### 单独启动

```bash
pnpm --filter @b2b-lead-gen/web dev     # 前端 localhost:3000
pnpm --filter @b2b-lead-gen/api dev     # API localhost:3001
pnpm --filter @b2b-lead-gen/queue-workers dev  # Workers
```

## 📊 免费额度

| 资源 | 免费额度 | 说明 |
|------|---------|------|
| 邮件发送 | 500封/天 | Brevo(300) + Resend(100) + Mailgun(100) |
| 邮箱发现 | 100次/月 API + 无限本地 | Apollo(50) + Hunter(50) + 开源工具 |
| 邮箱验证 | 无限 | rapid-email-verifier 自建 |
| 数据库 | 500MB | Supabase 免费版 |

**MVP 月运行成本 ≈ $0**

## 🔑 需要配置的 API Key

在系统设置 → API集成页面配置：

- **Apollo.io**: [注册免费版](https://apollo.io)
- **Hunter.io**: [注册免费版](https://hunter.io)
- **Brevo**: [注册免费版](https://brevo.com)
- **Resend**: [注册免费版](https://resend.com)
- **Mailgun**: [注册免费版](https://mailgun.com)

## 📝 MVP 路线图

- [x] Phase 1: 脚手架 + Prisma + BullMQ
- [x] Phase 2: 多租户Auth + 线索库CRUD + 前端
- [ ] Phase 3: 邮件模式缓存 + Apollo/Hunter适配器 + 验证流水线
- [ ] Phase 4: 邮件模板 + 活动管理 + 多通道发送
- [ ] Phase 5: IMAP收信 + 收件箱 + 数据看板 + 风控
- [ ] Phase 6: E2E测试 + 部署配置

## ⚠️ 风险提示

- 免费API额度有限，规模化后需升级付费plan
- 确保遵守各国反垃圾邮件法规（CAN-SPAM/GDPR）
- 新发件域名需要2-4周预热期
