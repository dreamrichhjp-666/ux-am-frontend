# UX-AM 设计中台管理平台 TODO

## 数据库 & 后端
- [x] 扩展数据库Schema：designers, projects, schedules, portfolios, platform_users表
- [x] 推送数据库Schema (pnpm db:push)
- [x] 实现设计师管理API (CRUD)
- [x] 实现项目管理API (CRUD)
- [x] 实现排期管理API (CRUD)
- [x] 实现作品集管理API（上传/删除/查看）
- [x] 实现经营数据统计API
- [x] 实现权限管理API（用户角色分配）
- [x] 实现系统用户管理API

## 前端页面
- [x] 全局主题和设计系统（深靛蓝侧边栏+浅色内容区，Plus Jakarta Sans字体）
- [x] 登录页面（用户名密码登录，不依赖Manus OAuth）
- [x] AppLayout侧边栏导航（含权限控制）
- [x] 首页/数据看板（经营数据概览：KPI卡片、月度趋势、忙闲占比）
- [x] 设计师列表页（含职能筛选、状态标签、卡片网格）
- [x] 设计师详情页（个人信息+作品集展示）
- [x] 设计师作品集上传/编辑页（设计师自助维护）
- [x] 排期甘特图页（PM管理排期，可视化甘特图）
- [x] 项目管理页（项目CRUD）
- [x] 经营数据分析页（人效、忙闲占比、设计师排名图表）
- [x] 用户权限管理页（超级管理员可用）
- [x] 个人信息编辑页（设计师自助编辑，含头像上传、状态、风格标签、密码修改）

## 权限体系
- [x] 超级管理员(super_admin)：全部权限
- [x] 中台PM(pm_manager)：查看全部+编辑排期/项目
- [x] 职能组长(team_lead)：查看全部+编辑本组设计师信息
- [x] 设计师(designer)：查看+编辑自己的信息和作品集
- [x] 访客(viewer)：只读查看

## 测试
- [x] auth.logout 测试
- [x] platform.me 未认证测试
- [x] platform.login 输入验证测试（空用户名/密码）

## 数据迁移
- [x] 将现有data.json中的数据导入数据库（初始化种子数据）

## 部署
- [x] 更新部署说明文档（内网部署指南）

## 待优化（未来迭代）
- [x] 作品集图片直接上传（已实现：本地文件选择 → base64 → S3存储）
- [x] 排期冲突自动检测与提醒（已完成：detectScheduleConflicts函数 + checkConflicts API）
- [x] 设计师个人信息自助编辑页面（已完成：/profile页面）
- [x] 导出Excel报表功能（已完成：三个导出接口 + Analytics页面导出按针）
