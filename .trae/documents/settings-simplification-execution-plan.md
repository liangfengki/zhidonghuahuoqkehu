# 计划：设置页极简改造（可直接实施版）

## Summary
按照用户要求，将“设置”页改成面向普通用户的极简体验：
- **线索采集配置**只在设置里填一次，之后自动保存与回显，无需重复填写。
- **集成配置与发送渠道**默认隐藏，仅保留高级折叠入口。
- **邮件模板**改成可编辑的富文本编辑器（类 Word），内置一份可用默认模板，并支持插入模板变量。
- **我的邮箱**只保留邮箱 + 密码/授权码，其余 SMTP/IMAP 配置自动识别并写入；识别失败时再展开高级项。
- 存储方案：线索采集配置复用现有 `AiConfig`，减少迁移成本。

## Current State Analysis
- 前端设置页 `apps/web/src/app/settings/page.tsx` 有 5 个 Tab：集成、发送渠道、我的邮箱、团队、黑名单；邮箱表单字段过长（10+字段），模板表单有无效“变量名”输入框，发送渠道 Tab 功能未完成（按钮仅为开发中提示）。
- 后端设置服务 `apps/api/src/settings/settings.service.ts` 对邮箱账号创建/更新使用 `@Body() dto: any`，直接展开入库，缺少校验与白名单；发送渠道与集成共用 `SendChannel` 模型，概念重叠。
- 模板服务 `apps/api/src/templates/templates.service.ts` 内联了一份渲染逻辑，与 `packages/email-engine/src/template-renderer.ts` 功能重复。
- 线索采集当前配置在工作流页 `apps/web/src/app/workflow/page.tsx`，每次进入都重新填写；建议迁移到设置页新 Tab 并复用 `AiConfig` 存储。

## Proposed Changes

### 1) 邮箱配置极简化（高优先）
**目标**：用户只填 `邮箱` + `密码/授权码`，可选 `邮箱类型`；系统写入 SMTP/IMAP 预设；识别失败自动展开高级项。

- 新增邮箱提供商预设常量（建议放在 `packages/shared/constants/email-presets.ts`）
  - 收录：Gmail、Outlook、QQ、163、126、阿里企业邮、腾讯企业邮
  - 结构：`label`, `smtp { host, port, secure }`, `imap { host, port, tls }`, `note`
- 前端 `apps/web/src/app/settings/page.tsx`
  - `emailAccountForm` 默认只保留 `provider/email/password` 三个必填项
  - 选择 provider 后自动填充 SMTP/IMAP（host/port/secure/tls/user=email）
  - 当识别失败或用户选择“自定义”时展开高级字段区（折叠式 UI）
- 后端 `apps/api/src/settings/settings.controller.ts` + `settings.service.ts`
  - 新增 DTO `create-email-account.dto.ts`，对 `email/password/provider/smtpConfig/imapConfig` 做 class-validator
  - 服务层增加白名单映射，避免 `...dto` 直接入库
  - 当 `provider` 已提供而 `smtpConfig/imapConfig` 缺失时，用预设补全

### 2) 集成配置与发送渠道隐藏（高优先）
**目标**：默认隐藏，高级用户可展开。

- 前端 `apps/web/src/app/settings/page.tsx`
  - Tab 列表从 5 个改为：`线索采集配置 | 我的邮箱 | 团队 | 黑名单`
  - “集成配置 / 发送渠道”移入“高级设置”折叠区（默认收起）
  - 保留功能入口，但不作为默认 Tab
- 后端保持现有 API，不在 MVP 阶段删除，避免破坏已有数据

### 3) 邮件模板可编辑（高优先）
**目标**：提供可编辑的富文本编辑器（类 Word），普通用户可直接编写；内置默认模板并支持变量插入。

- 新增前端编辑器组件 `apps/web/src/components/ui/rich-text-editor.tsx`
  - 采用轻量富文本方案（优先 Tiptap；若安装受限则回退 `contentEditable` + 执行命令）
  - 支持：加粗、列表、链接、换行、段落
  - 支持插入变量按钮：`{{firstName}}`、`{{lastName}}`、`{{fullName}}`、`{{companyName}}`、`{{position}}`
  - 输出 HTML 作为模板 `body`
- 修改前端设置模板区块 `apps/web/src/app/settings/page.tsx`
  - 用富文本编辑器替换现有 `textarea`
  - 移除无效“变量名”输入框
  - 新增“插入变量”下拉和“预览模板”按钮（调用已有 `POST /templates/:id/preview`）
- 模板数据 `templates.service.ts`
  - 新增“默认模板”创建接口或初始化逻辑：首次进入若无模板，提供一份内置模板（含变量）
  - 可选：将渲染逻辑统一到 `packages/email-engine/src/template-renderer.ts`，避免重复

### 4) 线索采集配置一次填写（高优先）
**目标**：设置里配置一次，后续自动保存并回显，不需要二次输入。

- 前端 `apps/web/src/app/settings/page.tsx`
  - 新增 Tab：`线索采集配置`
  - 表单字段：行业、国家、关键词、数据源（多选）、备注
  - 使用 `useEffect` 从后端读取并回显，表单变更节流自动保存（建议 1.5s debounce）
- 后端
  - 复用 `AiConfig`：新增字段 `collectDefaults Json @default("{}")`（或同等字段名）
  - 在 `settings.service.ts` 增加读取/保存采集默认配置的专用方法
  - 工作流开始时优先读取 `AiConfig.collectDefaults`，用户无需重复输入

### 5) 体验与健壮性（中优先）
- 表单校验：邮箱、密码必填；provider 可选；识别失败提示并展开高级项
- 保存反馈：统一 toast “已保存”
- 回退策略：自动识别失败不阻断流程，允许手动输入并保存
- 敏感字段：短期 MVP 保持现状，后续迭代加密存储（不在本次范围内）

## Implementation Steps（按执行顺序）

1. **新增邮箱预设常量**
   - 新建 `packages/shared/constants/email-presets.ts`
   - 定义 `EMAIL_PROVIDER_PRESETS`（含 host/port/secure/tls/note）

2. **新增邮箱 DTO 与服务逻辑**
   - 新建 `apps/api/src/settings/dto/create-email-account.dto.ts`
   - 修改 `apps/api/src/settings/settings.controller.ts` 将 `@Body() dto: any` 替换为 DTO
   - 修改 `apps/api/src/settings/settings.service.ts`：provider 自动补全 SMTP/IMAP、白名单字段写入

3. **前端邮箱表单极简化**
   - 修改 `apps/web/src/app/settings/page.tsx`：邮箱表单三字段 + 高级折叠
   - 选择 provider 自动填充；识别失败展示高级区

4. **设置页 Tab 结构改造**
   - 修改 `apps/web/src/app/settings/page.tsx`：默认 Tab 为采集配置/邮箱/团队/黑名单
   - 集成配置与发送渠道移入高级折叠区

5. **线索采集配置迁移**
   - 修改 `apps/web/src/app/settings/page.tsx`：新增采集配置 Tab + 自动保存
   - 修改后端 settings 服务读写 `AiConfig.collectDefaults`
   - 调整 `workflow` 页面读取默认配置入口（可选优化，不影响主流程）

6. **邮件模板富文本编辑器**
   - 新建 `apps/web/src/components/ui/rich-text-editor.tsx`
   - 修改 `apps/web/src/app/settings/page.tsx`：模板编辑使用富文本 + 插入变量 + 预览
   - 后端提供默认模板初始化逻辑（如无模板则创建）

7. **收尾与回归**
   - `pnpm typecheck && pnpm lint && pnpm build`
   - 启动前后端验证：邮箱保存、采集回显、模板编辑、高级折叠

## Assumptions & Decisions
- 线索采集配置复用 `AiConfig`，不新建模型。
- 集成配置与发送渠道仅“隐藏”，不删除功能与数据，保证兼容。
- 邮箱识别失败时自动展开高级项，而不是只提示失败。
- 邮件模板使用富文本编辑器 + 变量插入（推荐方案），输出 HTML。
- MVP 不处理密码字段加密、API Key 脱敏等安全增强（留给后续迭代）。

## Verification
- 打开设置页：默认显示 4 个 Tab，集成/发送渠道只在高级折叠区可见。
- 添加邮箱：只输入邮箱和密码即可保存；查看记录能回显 provider 与 SMTP/IMAP 配置。
- 线索采集配置：填写一次后刷新页面仍回显，工作流页可读取默认配置。
- 模板编辑：可使用富文本编辑器编辑并保存；可插入变量；可预览渲染结果。
- 类型与构建：`pnpm typecheck && pnpm lint && pnpm build` 全部通过。
