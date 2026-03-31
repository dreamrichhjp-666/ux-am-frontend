# UX设计中台人力资源管理平台 - 系统需求文档

**文档版本**: v1.3  
**最后更新**: 2026年3月30日  
**用途**: 团队内部交接、功能迭代、系统维护参考

---

## 目录

1. [系统概述](#系统概述)
2. [核心功能模块](#核心功能模块)
3. [用户角色与权限体系](#用户角色与权限体系)
4. [数据模型与数据库设计](#数据模型与数据库设计)
5. [技术架构](#技术架构)
6. [API接口文档](#api接口文档)
7. [前端页面详解](#前端页面详解)
8. [部署与维护指南](#部署与维护指南)
9. [常见问题与故障排查](#常见问题与故障排查)
10. [未来迭代建议](#未来迭代建议)

---

## 系统概述

### 项目背景

UX设计中台人力资源管理平台是一套为设计团队量身定制的人力资源管理系统，用于统一管理设计师的个人信息、作品集、项目排期、人效数据等，提升中台运营效率和透明度。

### 系统目标

| 目标 | 说明 |
|------|------|
| **人力可视化** | 实时掌握设计师状态、工作负荷、人效指标 |
| **排期科学化** | 可视化甘特图管理，自动检测排期冲突 |
| **作品沉淀** | 设计师作品集在线展示与维护 |
| **权限精细化** | 五级权限体系，确保数据安全与访问控制 |
| **数据驱动** | 经营数据看板支持决策分析 |

### 核心价值

- **对PM**: 快速了解设计师可用性，科学安排项目排期，避免冲突和过载
- **对设计师**: 展示个人作品，记录职业成长，了解自己的人效贡献
- **对管理层**: 掌握团队人效趋势，优化资源配置，评估运营效率

---

## 核心功能模块

### 1. 登录与认证

**功能描述**  
平台采用用户名密码登录方式，支持五个默认账号，用于演示和初期使用。

**默认账号**

| 账号 | 密码 | 角色 | 用途 |
|------|------|------|------|
| `admin` | `admin123` | 超级管理员 | 系统管理、用户管理、全局配置 |
| `pm` | `pm123` | PM经理 | 排期管理、项目管理、设计师管理 |
| `gui-lead` | `gui123` | GUI职能组长 | 组内数据查看、组员管理 |
| `vx-lead` | `vx123` | VX职能组长 | 组内数据查看、组员管理 |
| `designer` | `designer123` | 普通设计师 | 个人信息维护、作品集上传 |

**技术实现**

- 后端: `server/routers.ts` 中的 `platform.login` 过程
- 前端: `client/src/pages/Login.tsx` 登录表单
- 会话: 基于 Cookie + JWT，自动维持登录状态

**扩展建议**

- 集成公司内网 LDAP/AD 认证替代本地账号
- 添加多因素认证（MFA）提升安全性

---

### 2. 总览仪表盘

**功能描述**  
系统首页，展示设计中台的关键运营指标和趋势。

**核心KPI卡片**

| 指标 | 计算方式 | 用途 |
|------|---------|------|
| **年均人效** | 排期覆盖率均值 | 评估团队整体产能 |
| **活跃设计师** | 当前在册设计师数 | 了解团队规模 |
| **进行中项目** | 状态为 active 的项目数 | 掌握项目进度 |
| **当月排期数** | 本月活跃排期数 | 了解当月工作量 |

**数据可视化**

- **月度人效趋势** (折线图) - 展示过去12个月的人效变化
- **月度忙闲分布** (堆积柱状图) - 显示每月忙碌vs空闲的设计师数
- **设计师人效排行** (排行榜) - 按人效从高到低排序，展示工作天数、项目数
- **职能分组对比** (雷达图) - 对比GUI/VX/ICON三个职能的人数、忙碌率、人效

**数据来源**

- 后端: `server/routers.ts` 中的 `analytics.overview` 和 `analytics.monthlyUtilization`
- 前端: `client/src/pages/Dashboard.tsx`

**实现细节**

```javascript
// 人效计算公式
efficiency = (工作天数 / 365) * 100

// 忙碌率计算
busyPercent = 忙碌设计师数 / 总设计师数 * 100
```

---

### 3. 设计师管理

**功能描述**  
维护设计师基本信息、职能分类、状态管理。

**功能清单**

| 功能 | 权限要求 | 说明 |
|------|---------|------|
| **查看设计师列表** | 全员 | 卡片网格展示，支持职能筛选 |
| **查看设计师详情** | 全员 | 个人信息、当前项目、作品集 |
| **新建设计师** | PM+ | 输入基本信息、职能、AM负责人 |
| **编辑设计师** | PM+ | 修改信息、状态、风格标签 |
| **删除设计师** | 超管 | 永久删除设计师记录 |
| **批量导出** | PM+ | 导出设计师名单为Excel |

**设计师信息字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | 字符串 | ✓ | 设计师姓名 |
| `roleType` | 枚举 | ✓ | GUI/VX/ICON |
| `status` | 枚举 | ✓ | busy/available/leave |
| `styleTag` | 字符串 | ✗ | 风格标签（如"极简"、"科技感"） |
| `amName` | 字符串 | ✗ | 所属AM负责人 |
| `portfolioItems` | JSON数组 | ✗ | 作品集（见作品集模块） |

**前端页面**

- `client/src/pages/Designers.tsx` - 设计师列表
- `client/src/pages/DesignerDetail.tsx` - 设计师详情与编辑

**后端API**

```
GET  /api/trpc/designers.list           - 获取设计师列表
GET  /api/trpc/designers.getById        - 获取单个设计师详情
POST /api/trpc/designers.create         - 创建设计师
POST /api/trpc/designers.update         - 编辑设计师
POST /api/trpc/designers.delete         - 删除设计师
GET  /api/trpc/export.designers         - 导出设计师名单
```

---

### 4. 作品集管理

**功能描述**  
设计师上传、展示个人代表作品；PM和管理层浏览全体设计师作品。

**功能清单**

| 功能 | 权限要求 | 说明 |
|------|---------|------|
| **浏览作品集** | 全员 | 按职能筛选，查看所有设计师作品 |
| **上传作品** | 本人+PM | 支持PNG、JPG、GIF、动画等格式 |
| **编辑作品信息** | 本人+PM | 修改作品标题、描述、标签 |
| **删除作品** | 本人+超管 | 从作品集中移除 |
| **设为代表作** | 本人+PM | 标记为首页展示的代表作 |

**作品信息字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `designerId` | 数字 | ✓ | 所属设计师ID |
| `title` | 字符串 | ✓ | 作品标题 |
| `description` | 文本 | ✗ | 作品描述 |
| `imageUrl` | URL | ✓ | S3存储的图片URL |
| `tags` | JSON数组 | ✗ | 作品标签（如"品牌"、"交互"） |
| `isFeatured` | 布尔值 | ✓ | 是否为代表作 |
| `uploadedAt` | 时间戳 | ✓ | 上传时间 |

**上传流程**

```
用户选择本地图片
    ↓
前端FileReader转base64
    ↓
发送至后端API
    ↓
后端Buffer处理 → 上传至S3
    ↓
返回CDN URL → 保存至数据库
    ↓
前端展示成功提示
```

**前端页面**

- `client/src/pages/Portfolios.tsx` - 作品集浏览
- `client/src/pages/DesignerDetail.tsx` - 作品上传入口

**后端API**

```
GET  /api/trpc/portfolios.list          - 获取作品集列表
GET  /api/trpc/portfolios.listAll       - 获取所有设计师作品（带职能筛选）
POST /api/trpc/portfolios.upload        - 上传作品
POST /api/trpc/portfolios.update        - 编辑作品信息
POST /api/trpc/portfolios.delete        - 删除作品
```

**S3存储配置**

- 存储桶: Manus平台提供的内置S3
- 文件路径格式: `{designerId}-portfolios/{fileName}-{randomSuffix}.{ext}`
- 访问方式: 公开CDN URL（无需签名）
- 文件大小限制: 单个文件 ≤ 10MB

---

### 5. 排期管理

**功能描述**  
可视化甘特图管理设计师项目排期，支持冲突检测、月份切换、职能筛选。

**功能清单**

| 功能 | 权限要求 | 说明 |
|------|---------|------|
| **查看甘特图** | 全员 | 按月份展示，支持职能筛选 |
| **新建排期** | PM+ | 选择设计师、项目、时间段 |
| **编辑排期** | PM+ | 修改时间、工作量占比、备注 |
| **删除排期** | PM+ | 移除排期记录 |
| **冲突检测** | PM+ | 自动检测时间重叠，toast提醒 |
| **导出排期** | PM+ | 导出本月排期为Excel |

**排期信息字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `projectId` | 数字 | ✓ | 所属项目ID |
| `designerId` | 数字 | ✓ | 分配的设计师ID |
| `roleType` | 枚举 | ✓ | GUI/VX/ICON |
| `startDate` | 日期 | ✓ | 开始日期（YYYY-MM-DD） |
| `endDate` | 日期 | ✓ | 结束日期（YYYY-MM-DD） |
| `workloadPercent` | 数字 | ✗ | 工作量占比（0-100%，默认100） |
| `notes` | 文本 | ✗ | 备注 |

**冲突检测逻辑**

```javascript
// 检测是否存在冲突
function detectScheduleConflicts(designerId, startDate, endDate, excludeScheduleId) {
  const conflicts = schedules.filter(s => 
    s.designerId === designerId &&
    s.id !== excludeScheduleId &&
    s.startDate <= endDate &&
    s.endDate >= startDate
  );
  return conflicts;
}

// 创建/编辑时调用，若有冲突则显示warning toast
if (conflicts.length > 0) {
  toast.warning(`检测到 ${conflicts.length} 个排期冲突，但仍然保存`);
}
```

**甘特图渲染**

- 横轴: 当月1-31日
- 纵轴: 筛选后的设计师列表
- 条形: 每条排期显示为彩色条，颜色由项目决定
- 交互: 点击条形可编辑或删除

**前端页面**

- `client/src/pages/Schedule.tsx` - 甘特图与排期管理

**后端API**

```
GET  /api/trpc/schedules.list           - 获取所有排期
GET  /api/trpc/schedules.byDesigner     - 获取某设计师的排期
GET  /api/trpc/schedules.byProject      - 获取某项目的排期
GET  /api/trpc/schedules.checkConflicts - 检测冲突
POST /api/trpc/schedules.create         - 创建排期
POST /api/trpc/schedules.update         - 编辑排期
POST /api/trpc/schedules.delete         - 删除排期
GET  /api/trpc/export.schedules         - 导出排期
```

---

### 6. 项目管理

**功能描述**  
维护设计项目基本信息、状态、负责人。

**功能清单**

| 功能 | 权限要求 | 说明 |
|------|---------|------|
| **查看项目列表** | 全员 | 表格展示，支持状态筛选 |
| **新建项目** | PM+ | 输入项目名、负责人、状态 |
| **编辑项目** | PM+ | 修改项目信息 |
| **删除项目** | 超管 | 删除项目记录 |

**项目信息字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | 字符串 | ✓ | 项目名称 |
| `description` | 文本 | ✗ | 项目描述 |
| `status` | 枚举 | ✓ | active/completed/on_hold |
| `owner` | 字符串 | ✗ | 项目负责人 |
| `color` | 颜色值 | ✗ | 甘特图中的显示颜色 |
| `createdAt` | 时间戳 | ✓ | 创建时间 |

**前端页面**

- `client/src/pages/Projects.tsx` - 项目列表与管理

**后端API**

```
GET  /api/trpc/projects.list            - 获取项目列表
GET  /api/trpc/projects.getById         - 获取单个项目
POST /api/trpc/projects.create          - 创建项目
POST /api/trpc/projects.update          - 编辑项目
POST /api/trpc/projects.delete          - 删除项目
```

---

### 7. 经营数据分析

**功能描述**  
展示设计中台的人效数据、趋势分析、职能对比。

**功能清单**

| 功能 | 权限要求 | 说明 |
|------|---------|------|
| **查看KPI卡片** | 全员 | 年均人效、活跃设计师、项目数、排期数 |
| **查看趋势图表** | 全员 | 月度人效折线图、忙闲分布柱状图 |
| **查看人效排行** | 全员 | 设计师人效排名，支持年度/职能筛选 |
| **查看职能对比** | 全员 | 雷达图展示GUI/VX/ICON对比 |
| **导出分析报告** | 组长+ | 导出人效分析数据为Excel |

**人效计算公式**

```javascript
// 年度人效 = 工作天数 / 365 * 100
efficiency = (workDays / 365) * 100

// 月度人效 = 当月排期覆盖天数 / 当月总天数 * 100
monthlyUtilization = (busyDays / daysInMonth) * 100

// 工作天数 = 排期中所有日期的并集
workDays = countUniqueWorkDays(schedules)
```

**前端页面**

- `client/src/pages/Analytics.tsx` - 经营数据分析

**后端API**

```
GET  /api/trpc/analytics.overview       - 获取总览数据
GET  /api/trpc/analytics.monthlyUtilization - 获取月度人效
GET  /api/trpc/export.analytics         - 导出人效分析报告
```

**Excel导出内容**

- 表单1: 排期表 (项目名、设计师、职能、时间段、工作量)
- 表单2: 人效分析 (设计师、职能、排期数、工作天数、人效占比)
- 表单3: 设计师名单 (姓名、职能、风格标签、状态、所属AM)

---

### 8. 用户管理

**功能描述**  
管理平台账号、权限分配、角色管理。仅超级管理员可访问。

**功能清单**

| 功能 | 权限要求 | 说明 |
|------|---------|------|
| **查看用户列表** | 超管 | 表格展示所有账号 |
| **新建用户** | 超管 | 创建新账号，分配初始密码 |
| **编辑用户** | 超管 | 修改用户信息、角色 |
| **删除用户** | 超管 | 删除账号 |
| **重置密码** | 超管 | 重置用户密码 |

**用户信息字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | 字符串 | ✓ | 登录用户名（唯一） |
| `password` | 字符串 | ✓ | 加密密码 |
| `displayName` | 字符串 | ✗ | 显示名称 |
| `role` | 枚举 | ✓ | 权限角色（见权限体系） |
| `department` | 字符串 | ✗ | 所属部门 |
| `createdAt` | 时间戳 | ✓ | 创建时间 |

**前端页面**

- `client/src/pages/UserManagement.tsx` - 用户管理

**后端API**

```
GET  /api/trpc/users.list               - 获取用户列表
GET  /api/trpc/users.getById            - 获取单个用户
POST /api/trpc/users.create             - 创建用户
POST /api/trpc/users.update             - 编辑用户
POST /api/trpc/users.delete             - 删除用户
POST /api/trpc/users.resetPassword      - 重置密码
```

---

### 9. 个人信息编辑

**功能描述**  
设计师自助维护个人信息、头像、状态、密码。

**功能清单**

| 功能 | 权限要求 | 说明 |
|------|---------|------|
| **查看个人信息** | 本人 | 显示账号、角色、部门等 |
| **修改头像** | 本人 | 上传头像图片至S3 |
| **修改状态** | 本人 | 切换 busy/available/leave |
| **修改风格标签** | 本人 | 添加/删除个人风格标签 |
| **修改密码** | 本人 | 旧密码验证后修改新密码 |

**前端页面**

- `client/src/pages/Profile.tsx` - 个人信息编辑

**后端API**

```
GET  /api/trpc/platform.me              - 获取当前用户信息
POST /api/trpc/platform.updateProfile   - 更新个人信息
POST /api/trpc/platform.changePassword  - 修改密码
```

---

## 用户角色与权限体系

### 五级权限体系

平台采用五级权限模型，从低到高为：

| 等级 | 角色 | 英文标识 | 权限范围 |
|------|------|---------|---------|
| 1 | 访客 | `viewer` | 仅查看数据，无编辑权限 |
| 2 | 设计师 | `designer` | 管理自己的信息、作品、密码 |
| 3 | 职能组长 | `team_lead` | 查看组内数据、导出报告 |
| 4 | PM经理 | `pm_manager` | 管理排期、项目、设计师 |
| 5 | 超级管理员 | `super_admin` | 全系统管理权限 |

### 权限矩阵

| 功能模块 | viewer | designer | team_lead | pm_manager | super_admin |
|---------|--------|----------|-----------|-----------|-------------|
| **登录系统** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **查看仪表盘** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **查看设计师列表** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **编辑设计师** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **查看作品集** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **上传作品** | ✗ | ✓ | ✓ | ✓ | ✓ |
| **查看排期** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **管理排期** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **查看项目** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **管理项目** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **查看经营数据** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **导出报告** | ✗ | ✗ | ✓ | ✓ | ✓ |
| **管理用户** | ✗ | ✗ | ✗ | ✗ | ✓ |
| **修改个人信息** | ✗ | ✓ | ✓ | ✓ | ✓ |

### 权限检查实现

后端在每个需要权限控制的API中调用 `requireRole()` 函数：

```javascript
// 示例：只有PM+才能创建排期
const handleCreate = async () => {
  const session = await getPlatformSession(ctx);
  requireRole(session.platformRole, "pm_manager");  // 检查权限
  // ... 执行业务逻辑
};
```

权限等级对应关系（server/routers.ts）：

```javascript
const ROLES: Record<string, number> = {
  super_admin: 5,
  pm_manager: 4,
  team_lead: 3,
  designer: 2,
  viewer: 1,
};
```

---

## 数据模型与数据库设计

### 数据库架构

平台使用 **MySQL/TiDB** 作为主数据库，共6张业务表：

```
users (平台用户表)
├── id (PK)
├── username
├── password (加密)
├── displayName
├── role (enum)
├── department
├── createdAt
└── updatedAt

designers (设计师表)
├── id (PK)
├── name
├── roleType (GUI/VX/ICON)
├── status (busy/available/leave)
├── styleTag (JSON)
├── amName
├── createdAt
└── updatedAt

portfolios (作品集表)
├── id (PK)
├── designerId (FK)
├── title
├── description
├── imageUrl (S3 CDN URL)
├── tags (JSON)
├── isFeatured (boolean)
├── uploadedAt
└── updatedAt

projects (项目表)
├── id (PK)
├── name
├── description
├── status (active/completed/on_hold)
├── owner
├── color
├── createdAt
└── updatedAt

schedules (排期表)
├── id (PK)
├── projectId (FK)
├── designerId (FK)
├── roleType (GUI/VX/ICON)
├── startDate (YYYY-MM-DD)
├── endDate (YYYY-MM-DD)
├── workloadPercent (0-100)
├── notes
├── createdAt
└── updatedAt

portfolioItems (作品项表，冗余字段)
├── id (PK)
├── designerId (FK)
├── portfolioData (JSON)
└── updatedAt
```

### 数据库初始化

系统启动时自动初始化种子数据：

- **12位设计师** - 分布在GUI/VX/ICON三个职能
- **8个项目** - 涵盖不同状态
- **17条排期** - 覆盖当前和未来月份
- **5个平台用户** - 对应五个默认账号

初始化代码位置: `server/db.ts` 中的 `initDefault*` 函数

---

## 技术架构

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | React | 19.2 |
| **前端构建** | Vite | 7.1 |
| **样式** | Tailwind CSS | 4.1 |
| **UI组件** | shadcn/ui | 最新 |
| **图表库** | Recharts | 2.15 |
| **表单** | React Hook Form | 7.64 |
| **验证** | Zod | 4.1 |
| **后端框架** | Express | 4.21 |
| **RPC框架** | tRPC | 11.6 |
| **数据库ORM** | Drizzle | 0.44 |
| **数据库** | MySQL/TiDB | - |
| **文件存储** | AWS S3 | - |
| **测试框架** | Vitest | 2.1 |

### 项目结构

```
ux-am-frontend/
├── client/                          # 前端应用
│   ├── src/
│   │   ├── pages/                  # 页面组件
│   │   │   ├── Login.tsx           # 登录页
│   │   │   ├── Dashboard.tsx       # 仪表盘
│   │   │   ├── Designers.tsx       # 设计师列表
│   │   │   ├── DesignerDetail.tsx  # 设计师详情
│   │   │   ├── Portfolios.tsx      # 作品集
│   │   │   ├── Schedule.tsx        # 排期管理
│   │   │   ├── Projects.tsx        # 项目管理
│   │   │   ├── Analytics.tsx       # 经营数据
│   │   │   ├── Profile.tsx         # 个人信息
│   │   │   └── UserManagement.tsx  # 用户管理
│   │   ├── components/             # 可复用组件
│   │   │   ├── AppLayout.tsx       # 主布局
│   │   │   ├── DashboardLayout.tsx # 仪表盘布局
│   │   │   └── ui/                 # shadcn/ui组件库
│   │   ├── contexts/               # React上下文
│   │   │   ├── ThemeContext.tsx    # 主题
│   │   │   └── PlatformAuthContext.tsx # 认证
│   │   ├── lib/
│   │   │   └── trpc.ts             # tRPC客户端
│   │   ├── App.tsx                 # 路由配置
│   │   ├── main.tsx                # 应用入口
│   │   └── index.css               # 全局样式
│   ├── index.html                  # HTML模板
│   └── public/                     # 静态资源
│
├── server/                          # 后端应用
│   ├── db.ts                       # 数据库查询函数
│   ├── routers.ts                  # tRPC路由定义
│   ├── excel.ts                    # Excel导出函数
│   ├── storage.ts                  # S3存储函数
│   ├── platform.test.ts            # 单元测试
│   ├── auth.logout.test.ts         # 认证测试
│   └── _core/                      # 框架核心
│       ├── index.ts                # Express服务器
│       ├── context.ts              # tRPC上下文
│       ├── trpc.ts                 # tRPC配置
│       ├── oauth.ts                # OAuth流程
│       ├── cookies.ts              # Cookie处理
│       ├── llm.ts                  # LLM集成
│       ├── notification.ts         # 通知系统
│       └── env.ts                  # 环境变量
│
├── drizzle/                         # 数据库迁移
│   ├── schema.ts                   # 数据库Schema
│   ├── migrations/                 # 迁移文件
│   └── relations.ts                # 表关系
│
├── shared/                          # 共享代码
│   ├── const.ts                    # 常量
│   └── types.ts                    # 类型定义
│
├── package.json                    # 依赖配置
├── tsconfig.json                   # TypeScript配置
├── vite.config.ts                  # Vite配置
├── drizzle.config.ts               # Drizzle配置
├── vitest.config.ts                # 测试配置
├── DEPLOY.md                       # 部署指南
└── todo.md                         # 功能清单
```

### 前后端通信流程

```
前端组件
    ↓
React Hook Form (表单管理)
    ↓
tRPC Hook (trpc.module.action.useQuery/useMutation)
    ↓
HTTP请求 (/api/trpc)
    ↓
Express中间件 (认证、日志、错误处理)
    ↓
tRPC路由处理器 (server/routers.ts)
    ↓
权限检查 (requireRole)
    ↓
数据库查询 (server/db.ts)
    ↓
业务逻辑处理
    ↓
返回结果 (自动序列化为JSON)
    ↓
前端接收 (自动反序列化)
    ↓
UI更新 (React重新渲染)
```

---

## API接口文档

### 认证相关

#### POST /api/trpc/platform.login
登录系统

**请求参数**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应示例**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "displayName": "系统管理员",
    "role": "super_admin"
  }
}
```

**权限**: 无需认证

---

#### GET /api/trpc/platform.me
获取当前登录用户信息

**响应示例**
```json
{
  "id": 1,
  "username": "admin",
  "displayName": "系统管理员",
  "role": "super_admin",
  "department": "技术部"
}
```

**权限**: 已登录

---

### 设计师相关

#### GET /api/trpc/designers.list
获取设计师列表

**查询参数**
```
?roleType=GUI  (可选，筛选职能)
```

**响应示例**
```json
[
  {
    "id": 1,
    "name": "张玉龙",
    "roleType": "GUI",
    "status": "busy",
    "styleTag": ["极简", "科技感"],
    "amName": "李明"
  }
]
```

**权限**: 全员

---

#### POST /api/trpc/designers.create
创建设计师

**请求参数**
```json
{
  "name": "新设计师",
  "roleType": "VX",
  "status": "available",
  "styleTag": ["交互"],
  "amName": "王芳"
}
```

**权限**: pm_manager+

---

### 排期相关

#### GET /api/trpc/schedules.list
获取所有排期

**响应示例**
```json
[
  {
    "id": 1,
    "projectId": 1,
    "designerId": 1,
    "roleType": "GUI",
    "startDate": "2026-03-01",
    "endDate": "2026-03-15",
    "workloadPercent": 100,
    "notes": "品牌重塑项目"
  }
]
```

**权限**: 全员

---

#### GET /api/trpc/schedules.checkConflicts
检测排期冲突

**请求参数**
```json
{
  "designerId": 1,
  "startDate": "2026-03-01",
  "endDate": "2026-03-15",
  "excludeScheduleId": null
}
```

**响应示例**
```json
{
  "hasConflicts": true,
  "conflictCount": 2,
  "message": "检测到 2 个排期冲突"
}
```

**权限**: 全员

---

#### POST /api/trpc/schedules.create
创建排期

**请求参数**
```json
{
  "projectId": 1,
  "designerId": 1,
  "roleType": "GUI",
  "startDate": "2026-03-01",
  "endDate": "2026-03-15",
  "workloadPercent": 100,
  "notes": "品牌重塑"
}
```

**响应示例**
```json
{
  "success": true,
  "hasConflicts": false,
  "conflictCount": 0
}
```

**权限**: pm_manager+

---

### 作品集相关

#### POST /api/trpc/portfolios.upload
上传作品

**请求参数**
```json
{
  "designerId": 1,
  "title": "品牌VI设计",
  "description": "完整的品牌视觉识别系统",
  "imageBase64": "data:image/png;base64,iVBORw0KGgo...",
  "tags": ["品牌", "VI", "设计系统"],
  "isFeatured": true
}
```

**响应示例**
```json
{
  "success": true,
  "portfolio": {
    "id": 1,
    "designerId": 1,
    "title": "品牌VI设计",
    "imageUrl": "https://cdn.../portfolio-1-xyz.png",
    "uploadedAt": "2026-03-30T03:20:00Z"
  }
}
```

**权限**: designer+

---

### 导出相关

#### GET /api/trpc/export.analytics
导出人效分析报告

**响应示例**
```json
{
  "success": true,
  "data": "UEsDBBQACAAIAL..."  // base64编码的xlsx文件
}
```

**Excel内容**
- 表单1: 排期表
- 表单2: 人效分析
- 表单3: 设计师名单

**权限**: team_lead+

---

#### GET /api/trpc/export.schedules
导出排期表

**权限**: pm_manager+

---

#### GET /api/trpc/export.designers
导出设计师名单

**权限**: pm_manager+

---

## 前端页面详解

### 1. Login.tsx - 登录页

**布局**
- 左侧: 品牌信息与设计师统计
- 右侧: 登录表单

**表单字段**
- 用户名 (必填)
- 密码 (必填)
- 记住我 (可选)

**默认账号提示**
页面下方显示可用的测试账号及密码

**样式**
- 深色主题 (#1E2A4A 深靛蓝)
- Plus Jakarta Sans 字体
- 响应式设计

---

### 2. Dashboard.tsx - 仪表盘

**核心KPI卡片** (4列网格)
- 年均人效
- 活跃设计师
- 进行中项目
- 当月排期数

**数据可视化**
- 月度人效趋势 (折线图)
- 月度忙闲分布 (堆积柱状图)
- 设计师人效排行 (排行榜)
- 职能分组对比 (雷达图)

**数据刷新**
- 首次加载时自动获取
- 用户可手动刷新

---

### 3. Designers.tsx - 设计师列表

**卡片网格布局**
- 每行3-4张卡片
- 响应式适配

**卡片内容**
- 设计师头像 (首字母圆形)
- 姓名、职能标签
- 状态徽章 (忙碌/空闲/请假)
- 风格标签
- 所属AM

**交互**
- 点击卡片进入详情页
- 职能筛选下拉菜单
- PM可点击编辑按钮

---

### 4. DesignerDetail.tsx - 设计师详情

**分段展示**

**个人信息区**
- 头像、姓名、职能
- 状态、风格标签
- 所属AM

**当前项目区**
- 表格显示正在进行的排期

**作品集区**
- 作品网格展示
- 上传按钮 (本人+PM可见)
- 代表作标记

**编辑功能** (PM+可用)
- 修改基本信息
- 删除设计师

---

### 5. Portfolios.tsx - 作品集浏览

**职能筛选**
- 全部 / GUI / VX / ICON

**代表作过滤**
- 仅显示代表作
- 显示全部作品

**作品网格**
- 图片缩略图
- 悬停显示标题和标签
- 点击查看大图

---

### 6. Schedule.tsx - 排期管理

**甘特图**
- 横轴: 当月日期
- 纵轴: 设计师列表
- 条形: 排期记录

**控制栏**
- 月份切换 (上月/下月)
- 职能筛选
- 新建排期按钮 (PM+)

**排期条交互**
- 悬停显示项目名、设计师、时间
- 点击编辑或删除

**创建/编辑对话框**
- 项目选择
- 设计师选择
- 开始/结束日期
- 工作量占比
- 备注

**冲突提醒**
- 检测到冲突时显示warning toast
- 但仍允许保存

---

### 7. Analytics.tsx - 经营数据

**KPI卡片** (4列)
- 年均人效
- 活跃设计师
- 进行中项目
- 当月排期数

**年度/职能筛选**
- 年度选择 (当年及前两年)
- 职能选择 (全部/GUI/VX/ICON)

**图表**
- 月度人效趋势
- 月度忙闲分布
- 设计师人效排行
- 职能分组对比

**导出功能**
- 导出Excel按钮
- 支持人效分析数据导出

---

### 8. Profile.tsx - 个人信息

**账号信息区** (只读)
- 用户名
- 角色
- 显示名称
- 部门

**可编辑区**
- 头像上传
- 状态选择
- 风格标签编辑
- 密码修改

---

### 9. UserManagement.tsx - 用户管理

**用户表格**
- 用户名、显示名称、角色、部门
- 创建时间

**操作**
- 编辑用户信息
- 重置密码
- 删除用户

**新建用户对话框**
- 用户名
- 初始密码
- 显示名称
- 角色选择
- 部门

---

## 部署与维护指南

### 本地开发环境

**环境要求**
- Node.js 22.13+
- pnpm 10.4+
- MySQL 5.7+ 或 TiDB

**安装依赖**
```bash
cd /home/ubuntu/ux-am-frontend
pnpm install
```

**启动开发服务器**
```bash
pnpm dev
```

服务器启动后访问 `http://localhost:3000`

**数据库初始化**
```bash
pnpm db:push
```

自动生成迁移文件并执行

---

### 生产部署

**构建应用**
```bash
pnpm build
```

生成:
- `dist/` - 前端静态文件
- `dist/index.js` - 后端服务器

**启动生产服务**
```bash
NODE_ENV=production node dist/index.js
```

**环境变量配置**

关键环境变量:
- `DATABASE_URL` - MySQL连接字符串
- `JWT_SECRET` - 会话签名密钥
- `VITE_APP_ID` - OAuth应用ID
- `OAUTH_SERVER_URL` - OAuth服务器地址

---

### 内网部署

**方案一: 直接部署**

1. 将项目代码上传至内网服务器
2. 安装依赖: `pnpm install`
3. 构建: `pnpm build`
4. 启动: `NODE_ENV=production node dist/index.js`
5. 配置Nginx反向代理

**方案二: Docker容器化**

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Nginx配置示例**

```nginx
server {
    listen 80;
    server_name ux-design.company.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### 数据库维护

**备份数据库**
```bash
mysqldump -u root -p ux_am_db > backup_$(date +%Y%m%d).sql
```

**恢复数据库**
```bash
mysql -u root -p ux_am_db < backup_20260330.sql
```

**查看迁移历史**
```bash
pnpm db:push --dry-run
```

---

### 日志管理

**日志位置**
- `.manus-logs/devserver.log` - 服务器日志
- `.manus-logs/browserConsole.log` - 浏览器控制台
- `.manus-logs/networkRequests.log` - 网络请求
- `.manus-logs/sessionReplay.log` - 用户交互

**查看最新日志**
```bash
tail -100 .manus-logs/devserver.log
```

---

### 性能优化

**前端优化**
- 启用Gzip压缩
- 使用CDN加速静态资源
- 代码分割与懒加载

**后端优化**
- 数据库查询优化（添加索引）
- 缓存热点数据
- 连接池配置

**数据库优化**
```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_designer_role ON designers(roleType);
CREATE INDEX idx_schedule_designer ON schedules(designerId);
CREATE INDEX idx_schedule_dates ON schedules(startDate, endDate);
```

---

## 常见问题与故障排查

### Q1: 登录后仍显示登录页

**原因**: Cookie未正确设置或浏览器隐私模式

**解决方案**
1. 检查浏览器是否允许Cookie
2. 清除浏览器缓存
3. 检查服务器日志中的cookie-parser错误

---

### Q2: 排期冲突检测不工作

**原因**: 后端checkConflicts API未正确调用

**解决方案**
1. 检查Schedule.tsx中的冲突检测代码
2. 查看浏览器Network标签中的请求
3. 检查后端日志中的错误信息

---

### Q3: 作品集上传失败

**原因**: S3存储配置错误或文件过大

**解决方案**
1. 检查文件大小 (≤10MB)
2. 检查S3连接配置
3. 查看浏览器控制台错误信息

---

### Q4: 数据库连接失败

**原因**: DATABASE_URL配置错误或数据库服务不可用

**解决方案**
```bash
# 测试数据库连接
mysql -h <host> -u <user> -p <password> -e "SELECT 1"

# 检查环境变量
echo $DATABASE_URL
```

---

### Q5: 导出Excel文件损坏

**原因**: 文件编码或格式问题

**解决方案**
1. 检查server/excel.ts中的导出逻辑
2. 验证base64编码正确性
3. 尝试在不同浏览器中下载

---

## 未来迭代建议

### 短期优化 (1-2周)

1. **排期冲突可视化**
   - 在甘特图上用不同颜色标记冲突排期
   - 提供冲突详情弹窗

2. **批量操作**
   - 批量导入设计师
   - 批量创建排期
   - 批量导出报告

3. **搜索功能**
   - 设计师快速搜索
   - 项目搜索
   - 作品搜索

### 中期功能 (1个月)

1. **权限细粒度控制**
   - 按部门/职能分配权限
   - 自定义权限角色

2. **数据分析增强**
   - 设计师对标分析
   - 项目成本分析
   - 人效趋势预测

3. **集成第三方**
   - LDAP/AD认证
   - 钉钉/企业微信通知
   - 项目管理系统集成

### 长期规划 (2-3个月)

1. **AI辅助功能**
   - 智能排期推荐
   - 作品自动分类
   - 人效预测

2. **移动端支持**
   - 响应式设计完善
   - 原生App开发

3. **国际化**
   - 多语言支持
   - 时区处理

---

## 附录

### A. 快速参考

**常用命令**
```bash
# 开发
pnpm dev              # 启动开发服务器
pnpm test             # 运行测试
pnpm build            # 构建生产版本

# 数据库
pnpm db:push          # 生成并执行迁移
pnpm db:studio        # 打开数据库管理界面

# 代码质量
pnpm format           # 格式化代码
pnpm check            # TypeScript检查
```

**项目目录速查**
- 页面代码: `client/src/pages/`
- 后端API: `server/routers.ts`
- 数据库: `drizzle/schema.ts`
- 样式: `client/src/index.css`
- 测试: `server/*.test.ts`

---

### B. 环境变量完整列表

```bash
# 数据库
DATABASE_URL=mysql://user:password@host:3306/ux_am_db

# 认证
JWT_SECRET=your-secret-key-here

# OAuth (Manus平台)
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# S3存储
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# 应用配置
NODE_ENV=production
VITE_APP_TITLE=UX Design Hub
VITE_APP_LOGO=https://cdn.../logo.png
```

---

### C. 技术债清单

当前已知的技术债:

1. **cookie-parser中间件** - 已安装但需要验证在所有环境中的兼容性
2. **错误处理** - 某些API缺少详细的错误信息
3. **输入验证** - 前端表单验证规则需要加强
4. **缓存策略** - 缺少数据缓存机制，可能导致频繁数据库查询

---

**文档维护者**: 开发团队  
**最后更新**: 2026年3月30日  
**版本**: v1.3

