# 设置简化 — 继续执行计划

## 当前状态总结

上一轮已完成：
- ✅ 邮箱预设系统 (`email-presets.ts`) — 7 个 provider 预设 + 域名自动映射
- ✅ 邮箱账号 DTO (`create-email-account.dto.ts`) — 带 class-validator 验证
- ✅ 后端 `collect-defaults` GET/PUT 路由和方法
- ✅ 后端 `createEmailAccount` 使用预设自动填充逻辑
- ✅ Prisma schema 新增 `EmailAccount.provider` 和 `AiConfig.collectDefaults` 字段
- ✅ 前端 `emailAccountForm` 简化（3 字段 + 折叠高级配置）已写入但被旧 Tab 遮挡
- ✅ Tiptap 包已安装到 `apps/web/package.json`
- ✅ `collectForm` 状态和 `upsertCollectDefaults` mutation 已定义（无 UI）

本轮剩余 4 项任务：

## 任务 1：设置页 Tab 结构改造

**文件**：`apps/web/src/app/settings/page.tsx`

1. 将 `tabs` 数组从当前的 `[integrations, channels, my-email, team, blacklist]` 改为：
   - `collect` — 采集配置（LayoutDashboard 图标）
   - `my-email` — 我的邮箱（Mail 图标，已有）
   - `team` — 团队（Users 图标，已有）
   - `blacklist` — 黑名单（ShieldBan 图标，已有）
   - `advanced` — 高级设置（Settings 图标）

2. 将 `integrations` 和 `channels` 的 JSX 内容整体移入 `advanced` Tab 内，用一个可折叠卡片包裹（`showAdvancedSettings` 控制）。

3. 将 `activeTab` 默认值从 `"collect"` 改为 `"collect"`（不变，但需要确保 tabs 数组第一个是 collect）。

## 任务 2：采集配置 Tab UI + 自动保存

**文件**：`apps/web/src/app/settings/page.tsx`

1. 创建 "collect" Tab 的 JSX 渲染区块（在 Tab 内容区域）：
   - 行业（input text）
   - 国家/地区（input text）
   - 关键词（textarea）
   - 数据源（checkbox 组：Apollo、Hunter、Web Scraper）
   - 备注（textarea）
   - 保存按钮 + 自动保存提示

2. 添加 `useEffect` 实现：
   - 初始化：当 `collectDefaults` query 返回时，填充 `collectForm`
   - 自动保存：使用 debounce（1.5s）监听 `collectForm` 变化，调用 `upsertCollectDefaults` mutation

3. 保留手动"保存"按钮作为用户确认操作。

## 任务 3：富文本编辑器组件

**新建文件**：`apps/web/src/components/ui/rich-text-editor.tsx`

1. 基于已安装的 Tiptap 包创建 `RichTextEditor` 组件：
   - Props：`value: string`, `onChange: (html: string) => void`, `placeholder?: string`
   - 使用 `@tiptap/starter-kit` 提供基础编辑能力
   - 工具栏：加粗、斜体、下划线、链接、有序列表、无序列表、文本对齐
   - 变量插入：提供变量下拉按钮，可插入 `{{firstName}}` 等变量
   - 内置默认模板内容（类似 Word 的编辑体验）

2. 内置模板内容（默认 HTML）：
   ```html
   <p>Hi {{firstName}},</p>
   <p>我注意到贵公司 {{companyName}} 在行业中的发展，想了解一下您是否有兴趣...</p>
   <p>期待您的回复！</p>
   <p>Best regards,<br>{{fullName}}</p>
   ```

## 任务 4：模板编辑区接入富文本编辑器

**文件**：`apps/web/src/app/settings/page.tsx`

1. 导入 `RichTextEditor` 组件
2. 将模板区块中的 `<textarea>` 替换为 `<RichTextEditor>`
3. `templateForm` 的 `content` 字段存储/读取 HTML
4. 保留变量插入按钮（或由编辑器内置）

## 任务 5：回归验证

1. 运行 `pnpm typecheck` 确保无类型错误
2. 运行 `pnpm lint` 确保代码风格
3. 运行 `pnpm build` 确保构建通过
4. 启动前后端预览验证：
   - 设置页默认显示"采集配置"Tab
   - 采集配置自动保存正常
   - 邮箱表单只显示 3 个字段 + 可折叠高级
   - 模板编辑使用富文本编辑器
   - 高级设置中可访问集成配置和发送渠道
