# Yogdu-Private Referral (悠渡脉选)

内推资源管理系统，支持 AI 智能解析、三角色权限管理、数据统计仪表盘等功能。

## 功能特性

- 🔐 **三角色权限**：管理员、投稿方、普通用户
- 🤖 **AI 智能解析**：接入火山方舟大模型，自动从内推文案中提取结构化信息
- 📋 **投稿审核**：投稿方提交 → 管理员审核 → 自动上架
- 🔍 **搜索筛选**：按岗位类型、城市、工作模式、标签多维度筛选
- ⏰ **自动过期**：定时任务自动下架过期岗位，即将截止标灰提醒
- ❤️ **用户收藏**：收藏/取消收藏，批量管理
- 📊 **数据统计**：仪表盘展示投稿趋势、热门岗位、用户统计
- 📧 **邮件通知**：注册成功、审核结果、岗位更新、过期提醒
- 🎫 **邀请码**：管理员批量生成邀请码，控制注册权限

## 技术栈

- **框架**：Next.js 16 (App Router)
- **前端**：React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **数据库**：PostgreSQL + Prisma ORM
- **认证**：JWT (jsonwebtoken + bcryptjs)
- **AI**：火山方舟 Ark API (豆包大模型)
- **图表**：Recharts
- **邮件**：Nodemailer (飞书邮箱 SMTP)
- **定时任务**：node-cron

## 快速开始

### 环境要求

- Node.js >= 18
- PostgreSQL >= 14

### 安装

```bash
# 克隆项目
git clone https://github.com/Yogdunana/Yogdu-Private-Referral.git
cd Yogdu-Private-Referral

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入实际配置

# 初始化数据库
npx prisma migrate deploy
npx prisma db seed

# 启动开发服务器
npm run dev
```

### 环境变量说明

| 变量 | 说明 | 必填 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 连接字符串 | ✅ |
| `JWT_SECRET` | JWT 签名密钥 | ✅ |
| `ARK_API_KEY` | 火山方舟 API Key | ✅ |
| `SMTP_HOST` | SMTP 服务器地址 | ✅ |
| `SMTP_PORT` | SMTP 端口 | ✅ |
| `SMTP_USER` | SMTP 用户名 | ✅ |
| `SMTP_PASS` | SMTP 密码 | ✅ |

## 测试账号

首次运行种子数据后可使用以下账号：

| 角色 | 邮箱 | 密码 |
|---|---|---|
| 管理员 | admin@youdoo.com | admin123456 |
| 投稿方 | contributor@test.com | contributor123 |
| 普通用户 | user@test.com | user123456 |

## 部署

项目通过 GitHub Actions 自动部署，详见 `.github/workflows/` 目录。

## License

MIT
