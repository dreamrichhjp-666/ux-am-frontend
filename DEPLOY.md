# UX设计中台管理平台 · 内网部署指南

## 系统要求

| 组件 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | 18.x LTS | 推荐 20.x LTS |
| pnpm | 8.x+ | 包管理器 |
| MySQL / TiDB | 8.0+ | 数据库 |

---

## 快速部署步骤

### 1. 获取代码

```bash
git clone <内网仓库地址> ux-am-platform
cd ux-am-platform
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# 数据库连接（必填）
DATABASE_URL=mysql://用户名:密码@数据库地址:3306/ux_am_db

# JWT 密钥（必填，建议使用随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 服务端口（可选，默认3000）
PORT=3000

# 运行环境
NODE_ENV=production
```

### 4. 初始化数据库

```bash
# 推送数据库 Schema（创建所有表）
pnpm db:push

# 初始化种子数据（设计师、项目、排期等示例数据）
node scripts/seed.mjs
```

### 5. 构建前端

```bash
pnpm build
```

### 6. 启动服务

```bash
# 生产模式启动
pnpm start

# 或使用 PM2 守护进程（推荐）
npm install -g pm2
pm2 start dist/index.js --name ux-am-platform
pm2 save
pm2 startup
```

---

## 默认账号

首次部署后，使用以下账号登录：

| 账号 | 密码 | 角色 | 权限说明 |
|------|------|------|---------|
| `admin` | `admin123` | 超级管理员 | 全部权限 |
| `pm` | `pm123` | PM经理 | 查看全部 + 编辑排期/项目 |
| `gui-lead` | `gui123` | 职能组长 | 查看全部 + 编辑设计师信息 |

**⚠️ 请在首次登录后立即修改默认密码！**

---

## 权限体系

| 角色 | 标识 | 可操作范围 |
|------|------|-----------|
| 超级管理员 | `super_admin` | 全部功能，包括用户管理 |
| PM经理 | `pm_manager` | 排期管理、项目管理、查看所有数据 |
| 职能组长 | `team_lead` | 编辑设计师信息、查看所有数据 |
| 设计师 | `designer` | 编辑自己的信息和作品集 |
| 访客 | `viewer` | 只读查看所有数据 |

---

## Nginx 反向代理配置（可选）

如需通过域名访问，配置 Nginx：

```nginx
server {
    listen 80;
    server_name ux-am.yourcompany.internal;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50m;
    }
}
```

---

## 文件上传说明

作品集图片支持通过 URL 方式添加。如需支持本地文件上传，需配置 S3 兼容存储（如 MinIO）：

```env
# MinIO / S3 配置（可选）
S3_ENDPOINT=http://minio.yourcompany.internal:9000
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=ux-am-assets
```

---

## 常见问题

**Q: 数据库连接失败？**
检查 `DATABASE_URL` 格式是否正确，确保数据库服务器允许来自应用服务器的连接。

**Q: 端口被占用？**
修改 `.env` 中的 `PORT` 值，或使用 `lsof -i :3000` 查找占用进程。

**Q: 忘记管理员密码？**
直接通过数据库更新密码哈希，或联系系统管理员重置。

---

*UX设计中台管理平台 · 仅限内部使用*
