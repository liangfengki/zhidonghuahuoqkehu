# 设置页面简化计划

## 一、需求概述

用户希望简化设置页面的用户体验，降低普通用户的使用门槛：

1. **线索采集配置** - 用户只需填写一次，系统自动保存，下次不需要重复填写
2. **集成配置隐藏** - 数据源 API Key、发送渠道等技术配置内置好，隐藏掉不显示
3. **邮件模板可编辑** - 使用富文本编辑器（像 Word），内置一个默认模板
4. **邮箱配置简化** - 用户只需输入邮箱和密码/授权码，系统自动识别邮箱类型并配置

## 二、当前状态分析

### 2.1 现有设置页面结构
- **文件**: [apps/web/src/app/settings/page.tsx](file:///Users/liangfengki/Documents/企业获客平台/apps/web/src/app/settings/page.tsx)
- **5 个标签页**: 集成配置、发送渠道、我的邮箱、团队、黑名单
- **问题**: 
  - 功能分散，用户需要在多个页面间跳转
  - 技术配置门槛高（SMTP/IMAP 服务器地址、端口等）
  - 集成配置 Tab 混合了数据源 API Key 和邮件模板
  - 发送渠道添加按钮未对接后端 API
  - 模板功能不完整（只有创建和删除，没有编辑）

### 2.2 后端服务
- **文件**: [apps/api/src/settings/settings.service.ts](file:///Users/liangfengki/Documents/企业获客平台/apps/api/src/settings/settings.service.ts)
- **问题**: 
  - SettingsModule 依赖注入问题（缺少 QueueModule）
  - getApiKeys 查询 sendChannel 但排除了 apiKey 字段

## 三、简化方案

### 3.1 线索采集配置简化

**目标**: 用户只需填写产品描述，系统自动保存并用于 AI 线索采集

**实现步骤**:
1. **前端改动** ([apps/web/src/app/settings/page.tsx](file:///Users/liangfengki/Documents/企业获客平台/apps/web/src/app/settings/page.tsx))
   - 新增 "线索采集" 标签页
   - 只显示一个输入框：产品/服务描述（textarea）
   - 添加 "保存" 按钮
   - 保存成功后显示 "已保存" 状态，下次进入自动加载

2. **后端改动** ([apps/api/src/settings/settings.service.ts](file:///Users/liangfengki/Documents/企业获客平台/apps/api/src/settings/settings.service.ts))
   - 使用现有的 `AiConfig` 模型存储产品描述
   - `GET /settings/ai` 返回产品描述
   - `PUT /settings/ai` 更新产品描述

**用户体验**:
```
┌─────────────────────────────────────────────┐
│  线索采集配置                                │
├─────────────────────────────────────────────┤
│  产品/服务描述:                              │
│  ┌─────────────────────────────────────────┐│
│  │ 我们是一家专业的电子产品制造商，主要...  ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [保存]  ✓ 已保存                           │
└─────────────────────────────────────────────┘
```

### 3.2 集成配置隐藏

**目标**: 隐藏数据源 API Key 和发送渠道配置，使用系统内置的免费额度

**实现步骤**:
1. **前端改动** ([apps/web/src/app/settings/page.tsx](file:///Users/liangfengki/Documents/企业获客平台/apps/web/src/app/settings/page.tsx))
   - 删除 "集成配置" 标签页中的数据源 API Key 配置表单
   - 删除 "发送渠道" 标签页
   - 在 "线索采集" 标签页中显示 "系统已配置免费数据源，无需额外设置" 提示

2. **后端改动** ([apps/api/src/settings/settings.service.ts](file:///Users/liangfengki/Documents/企业获客平台/apps/api/src/settings/settings.service.ts))
   - 保持现有 API 端点不变（供高级用户或管理员使用）
   - 添加默认配置逻辑：如果没有配置数据源 Key，使用系统内置的免费额度

**用户体验**:
```
┌─────────────────────────────────────────────┐
│  线索采集配置                                │
├─────────────────────────────────────────────┤
│  产品/服务描述:                              │
│  ┌─────────────────────────────────────────┐│
│  │ ...                                     ││
│  └─────────────────────────────────────────┘
│                                             │
│  [保存]                                     │
│                                             │
│  ℹ️ 系统已配置免费数据源，无需额外设置       │
└─────────────────────────────────────────────┘
```

### 3.3 邮件模板可编辑

**目标**: 使用富文本编辑器，内置一个默认模板，普通用户可以轻松编辑

**实现步骤**:
1. **安装依赖** (根目录 package.json)
   ```bash
   pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link @tiptap/extension-image -w
   ```

2. **创建富文本编辑器组件** (新文件: [apps/web/src/components/ui/rich-text-editor.tsx](file:///Users/liangfengki/Documents/企业获客平台/apps/web/src/components/ui/rich-text-editor.tsx))
   - 基于 Tiptap 的富文本编辑器
   - 支持：粗体、斜体、链接、列表、图片
   - 支持变量插入（{{firstName}}, {{companyName}} 等）
   - 工具栏：简洁易用

3. **前端改动** ([apps/web/src/app/settings/page.tsx](file:///Users/liangfengki/Documents/企业获客平台/apps/web/src/app/settings/page.tsx))
   - 保留 "邮件模板" 标签页
   - 使用富文本编辑器替换 textarea
   - 内置一个默认模板
   - 支持编辑、保存、删除操作

4. **内置默认模板** (后端初始化)
   ```typescript
   const defaultTemplate = {
     name: "默认开发信模板",
     subject: "{{firstName}}，您好！关于{{companyName}}的合作机会",
     body: `<p>{{firstName}}，您好！</p>
            <p>我是[您的公司名]的[您的姓名]，了解到贵公司{{companyName}}在{{industry}}领域的卓越表现。</p>
            <p>我们专注于[产品/服务描述]，相信能为贵公司带来价值。</p>
            <p>期待与您进一步交流！</p>
            <p>此致<br/>[您的姓名]</p>`,
     variables: ["firstName", "lastName", "companyName", "industry", "email"],
     language: "zh"
   };
   ```

**用户体验**:
```
┌─────────────────────────────────────────────┐
│  邮件模板                                    │
├─────────────────────────────────────────────┤
│  模板名称: [默认开发信模板          ]        │
│  邮件主题: [{{firstName}}，您好！...]        │
│                                             │
│  ┌─ B I Link List ─────────────────────┐   │
│  │ {{firstName}}，您好！                │   │
│  │                                      │   │
│  │ 我是[您的公司名]的[您的姓名]...      │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  插入变量: [firstName] [companyName] ...     │
│                                             │
│  [保存模板]  [预览]                          │
└─────────────────────────────────────────────┘
```

### 3.4 邮箱配置简化

**目标**: 用户只需输入邮箱和密码/授权码，系统自动识别邮箱类型并配置

**实现步骤**:
1. **创建邮箱配置预设** (新文件: [packages/email-engine/src/email-presets.ts](file:///Users/liangfengki/Documents/企业获客平台/packages/email-engine/src/email-presets.ts))
   ```typescript
   export const emailPresets = {
     'gmail.com': {
       smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
       imap: { host: 'imap.gmail.com', port: 993, secure: true },
       note: '请使用应用专用密码（在 Google 账号安全设置中生成）'
     },
     'outlook.com': {
       smtp: { host: 'smtp.office365.com', port: 587, secure: false },
       imap: { host: 'outlook.office365.com', port: 993, secure: true },
       note: '请使用邮箱密码'
     },
     'qq.com': {
       smtp: { host: 'smtp.qq.com', port: 587, secure: false },
       imap: { host: 'imap.qq.com', port: 993, secure: true },
       note: '请使用授权码（在 QQ 邮箱设置中获取）'
     },
     '163.com': {
       smtp: { host: 'smtp.163.com', port: 465, secure: true },
       imap: { host: 'imap.163.com', port: 993, secure: true },
       note: '请使用授权码（在 163 邮箱设置中获取）'
     },
     // ... 更多邮箱类型
   };
   ```

2. **后端改动** ([apps/api/src/settings/settings.service.ts](file:///Users/liangfengki/Documents/企业获客平台/apps/api/src/settings/settings.service.ts))
   - 添加 `getEmailPresets` 方法，返回支持的邮箱类型
   - 修改 `createEmailAccount` 方法，自动识别邮箱类型并填充 SMTP/IMAP 配置

3. **前端改动** ([apps/web/src/app/settings/page.tsx](file:///Users/liangfengki/Documents/企业获客平台/apps/web/src/app/settings/page.tsx))
   - 简化 "我的邮箱" 标签页
   - 只显示：邮箱地址、密码/授权码、每日发送上限
   - 添加 "支持的邮箱类型" 提示
   - 保存后显示配置状态

**用户体验**:
```
┌─────────────────────────────────────────────┐
│  我的邮箱                                    │
├─────────────────────────────────────────────┤
│  邮箱地址: [your@gmail.com          ]        │
│  密码/授权码: [••••••••••••        ]         │
│  每日发送上限: [500] 封                      │
│                                             │
│  [保存]                                     │
│                                             │
│  支持的邮箱类型:                             │
│  Gmail | Outlook | QQ邮箱 | 163邮箱 | ...   │
│                                             │
│  ℹ️ Gmail 用户请使用应用专用密码             │
│     （在 Google 账号安全设置中生成）          │
└─────────────────────────────────────────────┘
```

## 四、实施步骤

### 4.1 第一阶段：邮箱配置预设
1. 创建邮箱配置预设文件
2. 修改后端服务支持自动识别邮箱类型
3. 简化前端邮箱配置表单

### 4.2 第二阶段：线索采集配置简化
1. 新增 "线索采集" 标签页
2. 只保留产品描述输入框
3. 实现自动保存和加载功能

### 4.3 第三阶段：集成配置隐藏
1. 删除数据源 API Key 配置表单
2. 删除 "发送渠道" 标签页
3. 添加系统配置提示

### 4.4 第四阶段：邮件模板富文本编辑器
1. 安装 Tiptap 依赖
2. 创建富文本编辑器组件
3. 修改模板标签页使用富文本编辑器
4. 内置默认模板

### 4.5 第五阶段：测试和优化
1. 测试所有配置流程
2. 优化用户体验
3. 修复发现的问题

## 五、预期成果

### 5.1 简化后的设置页面结构
- **线索采集**: 产品描述 + 保存
- **邮件模板**: 富文本编辑器 + 内置模板
- **我的邮箱**: 邮箱 + 密码 + 保存
- **团队**: 成员管理（保持不变）
- **黑名单**: 黑名单管理（保持不变）

### 5.2 用户体验提升
- 配置步骤从 5+ 步减少到 2-3 步
- 技术配置完全隐藏，用户无需了解 SMTP/IMAP
- 邮件模板编辑像 Word 一样简单
- 系统自动保存，无需重复配置

## 六、风险评估

### 6.1 技术风险
- Tiptap 依赖可能增加包体积（低风险）
- 邮箱自动识别可能不准确（低风险，有手动配置作为后备）

### 6.2 兼容性风险
- 现有用户数据需要迁移（低风险，使用相同的数据库模型）
- API 端点保持不变，后端兼容性好

---

**计划制定时间**: 2026-06-09
**预计执行时间**: 2-3 小时
**负责人**: AI 助手
**审核状态**: 待用户确认