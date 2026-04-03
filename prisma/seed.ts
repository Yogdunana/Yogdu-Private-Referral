import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建种子数据...');

  // 创建管理员账号
  const adminPassword = await bcrypt.hash('admin123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@youdoo.com' },
    update: {},
    create: {
      email: 'admin@youdoo.com',
      password: adminPassword,
      name: '系统管理员',
      role: Role.ADMIN,
    },
  });
  console.log(`管理员账号已创建: ${admin.email} / admin123456`);

  // 创建测试投稿方
  const contributorPassword = await bcrypt.hash('contributor123', 10);
  const contributor = await prisma.user.upsert({
    where: { email: 'contributor@test.com' },
    update: {},
    create: {
      email: 'contributor@test.com',
      password: contributorPassword,
      name: '测试投稿方',
      role: Role.CONTRIBUTOR,
    },
  });
  console.log(`投稿方账号已创建: ${contributor.email} / contributor123`);

  // 创建测试普通用户
  const userPassword = await bcrypt.hash('user123456', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      email: 'user@test.com',
      password: userPassword,
      name: '测试用户',
      role: Role.USER,
    },
  });
  console.log(`普通用户账号已创建: ${user.email} / user123456`);

  // 创建初始邀请码
  const inviteCode = await prisma.inviteCode.create({
    data: {
      code: 'YOGDU-INIT-001',
      createdBy: admin.id,
      maxUses: 100,
      expiresAt: new Date('2027-12-31'),
    },
  });
  console.log(`初始邀请码已创建: ${inviteCode.code}`);

  // 创建一些测试岗位数据
  const now = new Date();
  const jobs = [
    {
      title: '字节跳动｜算法实习生招聘',
      type: 'DAILY_INTERNSHIP' as const,
      location: '北京',
      content: '参与推荐系统算法的研发与优化，包括但不限于召回、排序、重排等环节。使用机器学习和深度学习技术提升推荐效果。',
      requirements: '1. 计算机、数学、统计等相关专业本科及以上学历\n2. 熟悉Python，至少掌握一种深度学习框架（PyTorch/TensorFlow）\n3. 有推荐系统、搜索、广告等相关经验优先',
      workMode: 'ONSITE' as const,
      contactEmail: 'intern@bytedance.com',
      emailFormat: '算法实习-姓名-学校-年级-可实习时长',
      deadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30天后
      tags: ['北京', '算法', '日常实习', '推荐系统'],
      status: 'APPROVED' as const,
      contributorId: contributor.id,
    },
    {
      title: '腾讯｜前端开发实习生',
      type: 'SUMMER_INTERNSHIP' as const,
      location: '深圳',
      content: '负责微信小程序及H5页面的开发与维护，参与前端工程化建设，提升开发效率和代码质量。',
      requirements: '1. 熟悉HTML/CSS/JavaScript，了解React或Vue框架\n2. 有小程序开发经验优先\n3. 良好的沟通能力和团队协作精神',
      workMode: 'HYBRID' as const,
      contactEmail: 'frontend@tencent.com',
      emailFormat: '前端实习-姓名-学校-可实习月份',
      deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2天后（即将截止）
      tags: ['深圳', '前端', '暑期实习', 'React'],
      status: 'APPROVED' as const,
      contributorId: contributor.id,
    },
    {
      title: '清华大学NLP实验室｜科研实习生',
      type: 'RESEARCH_INTERNSHIP' as const,
      location: '北京',
      content: '参与大语言模型相关研究工作，包括模型训练、评测、对齐等方向。发表高水平学术论文。',
      requirements: '1. 计算机、人工智能相关专业硕士/博士研究生\n2. 在NLP/AI领域有扎实的研究基础\n3. 有顶会论文发表经验优先',
      researchField: '自然语言处理',
      businessTrack: '人工智能',
      workMode: 'REMOTE' as const,
      contactEmail: 'nlp-lab@tsinghua.edu.cn',
      emailFormat: '科研实习-姓名-学校-研究方向',
      deadline: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 60天后
      tags: ['北京', '科研', 'NLP', '远程', '大模型'],
      status: 'APPROVED' as const,
      contributorId: contributor.id,
    },
    {
      title: '阿里巴巴｜数据分析师实习生',
      type: 'DAILY_INTERNSHIP' as const,
      location: '杭州',
      content: '负责电商平台数据分析，通过数据洞察支持业务决策，构建数据看板和报表体系。',
      requirements: '1. 统计学、数学、计算机等相关专业\n2. 熟练使用SQL和Python进行数据分析\n3. 了解常见的数据可视化工具',
      workMode: 'ONSITE' as const,
      contactEmail: 'data@alibaba.com',
      emailFormat: '数据分析实习-姓名-学校-年级',
      deadline: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 已过期
      tags: ['杭州', '数据分析', '日常实习'],
      status: 'EXPIRED' as const,
      expiredAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      contributorId: contributor.id,
    },
    {
      title: '美团｜产品经理实习生',
      type: 'SUMMER_INTERNSHIP' as const,
      location: '上海',
      content: '参与外卖业务的产品设计和需求分析，撰写PRD文档，协调开发团队推进产品迭代。',
      requirements: '1. 本科及以上学历，专业不限\n2. 对互联网产品有热情，有产品实习经验优先\n3. 优秀的逻辑思维和沟通表达能力',
      workMode: 'ONSITE' as const,
      contactEmail: 'pm@meituan.com',
      emailFormat: '产品实习-姓名-学校-可实习时长',
      deadline: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      tags: ['上海', '产品', '暑期实习'],
      status: 'PENDING' as const,
      contributorId: contributor.id,
    },
  ];

  for (const job of jobs) {
    await prisma.job.create({ data: job });
  }
  console.log(`已创建 ${jobs.length} 个测试岗位`);

  console.log('种子数据创建完成！');
  console.log('\n可用账号：');
  console.log('  管理员: admin@youdoo.com / admin123456');
  console.log('  投稿方: contributor@test.com / contributor123');
  console.log('  普通用户: user@test.com / user123456');
  console.log('  邀请码: YD-INIT-001');
}

main()
  .catch((e) => {
    console.error('种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
