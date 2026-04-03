#!/bin/bash
set -e
cd /opt/yogdu-referral
export $(grep -v '^#' /opt/yogdu-referral/.env | xargs) 2>/dev/null || true

echo "=== 1. 清空并重建数据 ==="
node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient, Role } = require('@prisma/client');
const prisma = new PrismaClient();
async function reset() {
  // 清空旧数据
  await prisma.favorite.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.emailLog.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.inviteCode.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('旧数据已清空');

  // 创建管理员
  const adminPwd = await bcrypt.hash('admin123456', 10);
  const admin = await prisma.user.create({
    data: { email: 'admin@youdoo.com', password: adminPwd, name: '系统管理员', role: 'ADMIN' }
  });
  console.log('管理员已创建');

  // 创建投稿方
  const contributorPwd = await bcrypt.hash('contributor123', 10);
  const contributor = await prisma.user.create({
    data: { email: 'contributor@test.com', password: contributorPwd, name: '测试投稿方', role: 'CONTRIBUTOR' }
  });
  console.log('投稿方已创建');

  // 创建普通用户
  const userPwd = await bcrypt.hash('user123456', 10);
  const user = await prisma.user.create({
    data: { email: 'user@test.com', password: userPwd, name: '测试用户', role: 'USER' }
  });
  console.log('普通用户已创建');

  // 创建邀请码
  await prisma.inviteCode.create({
    data: { code: 'YOGDU-INIT-001', createdBy: admin.id, maxUses: 100, expiresAt: new Date('2027-12-31') }
  });
  console.log('邀请码已创建');

  // 创建测试岗位
  const now = new Date();
  const jobs = [
    {
      title: '字节跳动｜算法实习生招聘',
      type: 'DAILY_INTERNSHIP', location: '北京',
      content: '参与推荐系统算法的研发与优化，包括但不限于召回、排序、重排等环节。',
      requirements: '1. 计算机、数学、统计等相关专业本科及以上学历\n2. 熟悉Python，至少掌握一种深度学习框架',
      workMode: 'ONSITE', contactEmail: 'intern@bytedance.com',
      emailFormat: '算法实习-姓名-学校-年级',
      deadline: new Date(now.getTime() + 30*24*60*60*1000),
      tags: ['北京', '算法', '日常实习'],
      status: 'APPROVED', contributorId: contributor.id,
    },
    {
      title: '腾讯｜前端开发实习生',
      type: 'SUMMER_INTERNSHIP', location: '深圳',
      content: '负责微信小程序及H5页面的开发与维护，参与前端工程化建设。',
      requirements: '1. 熟悉HTML/CSS/JavaScript\n2. 有小程序开发经验优先',
      workMode: 'HYBRID', contactEmail: 'frontend@tencent.com',
      emailFormat: '前端实习-姓名-学校',
      deadline: new Date(now.getTime() + 2*24*60*60*1000),
      tags: ['深圳', '前端', '暑期实习'],
      status: 'APPROVED', contributorId: contributor.id,
    },
    {
      title: '清华大学NLP实验室｜科研实习生',
      type: 'RESEARCH_INTERNSHIP', location: '北京',
      content: '参与大语言模型相关研究工作，包括模型训练、评测、对齐等方向。',
      requirements: '1. 计算机、人工智能相关专业硕士/博士研究生\n2. 有顶会论文发表经验优先',
      workMode: 'REMOTE', contactEmail: 'nlp-lab@tsinghua.edu.cn',
      emailFormat: '科研实习-姓名-学校-研究方向',
      deadline: new Date(now.getTime() + 60*24*60*60*1000),
      tags: ['北京', '科研', 'NLP', '远程'],
      status: 'APPROVED', contributorId: contributor.id,
    },
    {
      title: '阿里巴巴｜数据分析师实习生',
      type: 'DAILY_INTERNSHIP', location: '杭州',
      content: '负责电商平台数据分析，通过数据洞察支持业务决策。',
      requirements: '1. 统计学、数学、计算机等相关专业\n2. 熟练使用SQL和Python',
      workMode: 'ONSITE', contactEmail: 'data@alibaba.com',
      emailFormat: '数据分析实习-姓名-学校',
      deadline: new Date(now.getTime() - 1*24*60*60*1000),
      tags: ['杭州', '数据分析'],
      status: 'EXPIRED', expiredAt: new Date(now.getTime() - 1*24*60*60*1000), contributorId: contributor.id,
    },
    {
      title: '美团｜产品经理实习生',
      type: 'SUMMER_INTERNSHIP', location: '上海',
      content: '参与外卖业务的产品设计和需求分析，撰写PRD文档。',
      requirements: '1. 本科及以上学历\n2. 对互联网产品有热情',
      workMode: 'ONSITE', contactEmail: 'pm@meituan.com',
      emailFormat: '产品实习-姓名-学校',
      deadline: new Date(now.getTime() + 15*24*60*60*1000),
      tags: ['上海', '产品', '暑期实习'],
      status: 'PENDING', contributorId: contributor.id,
    },
  ];

  for (const job of jobs) {
    await prisma.job.create({ data: job });
  }
  console.log(jobs.length + ' 个岗位已创建');

  await prisma.\$disconnect();
}
reset().catch(e => { console.error(e); process.exit(1); });
"

echo "=== 2. 验证数据 ==="
npx prisma db execute --schema /opt/yogdu-referral/prisma/schema.prisma --stdin << 'SQL'
SELECT status, count(*) FROM jobs GROUP BY status;
SQL

echo "=== 3. API测试 ==="
curl -s http://localhost:3002/api/jobs | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'前台API: success={d.get(\"success\")}, total={d.get(\"data\",{}).get(\"total\",0)}')
for j in d.get('data',{}).get('data',[])[:3]:
    print(f'  - {j.get(\"title\",\"?\")} [{j.get(\"status\")}]')
"

echo "=== 4. 登录测试 ==="
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youdoo.com","password":"admin123456"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'admin登录: success={d.get(\"success\")}')
"

echo "=== DONE ==="
