import { EmailType } from '@prisma/client';

export interface TemplateVars {
  [key: string]: string;
}

interface EmailTemplate {
  subject: string;
  getHtml: (vars: TemplateVars) => string;
}

const baseStyles = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
  .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 2px; }
  .content { background-color: #ffffff; padding: 30px 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px; }
  .content h2 { color: #333333; font-size: 20px; margin-top: 0; margin-bottom: 16px; }
  .content p { color: #555555; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0; }
  .content .highlight { background-color: #f0f4ff; border-left: 4px solid #667eea; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
  .content .highlight p { margin: 0; color: #333333; }
  .content .info-row { display: flex; margin-bottom: 8px; }
  .content .info-label { font-weight: 600; color: #333333; min-width: 80px; }
  .content .info-value { color: #555555; }
  .btn { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px; }
  .btn:hover { opacity: 0.9; }
  .footer { text-align: center; padding: 20px; color: #999999; font-size: 12px; }
  .footer a { color: #667eea; text-decoration: none; }
  .divider { border: none; border-top: 1px solid #eeeeee; margin: 20px 0; }
`;

function wrapHtml(bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>悠渡脉选</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>悠渡脉选</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>此邮件由 <a href="#">悠渡脉选</a> 系统自动发送，请勿直接回复。</p>
      <p>&copy; ${new Date().getFullYear()} 悠渡脉选 - 您的专属内推信息平台</p>
    </div>
  </div>
</body>
</html>`;
}

const templates: Record<EmailType, EmailTemplate> = {
  [EmailType.REGISTRATION]: {
    subject: '欢迎注册悠渡脉选',
    getHtml: (_vars) => wrapHtml(`
      <h2>欢迎加入悠渡脉选！</h2>
      <p>您好，<strong>{{name}}</strong>：</p>
      <p>恭喜您成功注册「悠渡脉选」平台！这里汇集了丰富的内推信息，帮助您找到理想的工作机会。</p>
      <div class="highlight">
        <p>您现在可以浏览所有已发布的岗位信息，收藏感兴趣的职位，也可以申请成为贡献者来分享内推信息。</p>
      </div>
      <p>如有任何问题，欢迎随时联系我们。</p>
      <a href="{{siteUrl}}" class="btn">开始探索</a>
    `),
  },

  [EmailType.NEW_SUBMISSION]: {
    subject: '内推信息提交成功',
    getHtml: (_vars) => wrapHtml(`
      <h2>提交成功</h2>
      <p>您好，<strong>{{name}}</strong>：</p>
      <p>您提交的内推信息已成功记录，正在等待管理员审核。</p>
      <div class="highlight">
        <p><strong>岗位标题：</strong>{{jobTitle}}</p>
        <p><strong>提交时间：</strong>{{submitTime}}</p>
      </div>
      <p>审核结果将通过邮件通知您，请留意后续消息。通常审核会在 1-2 个工作日内完成。</p>
      <p>感谢您对平台的贡献！</p>
    `),
  },

  [EmailType.REVIEW_APPROVED]: {
    subject: '内推信息审核通过',
    getHtml: (_vars) => wrapHtml(`
      <h2>审核通过</h2>
      <p>您好，<strong>{{name}}</strong>：</p>
      <p>恭喜！您提交的内推信息已通过审核，现已正式发布。</p>
      <div class="highlight">
        <p><strong>岗位标题：</strong>{{jobTitle}}</p>
        <p><strong>审核时间：</strong>{{reviewTime}}</p>
      </div>
      <p>其他用户现在可以在平台上浏览到该岗位信息。感谢您分享有价值的内推机会！</p>
      <a href="{{jobUrl}}" class="btn">查看岗位</a>
    `),
  },

  [EmailType.REVIEW_REJECTED]: {
    subject: '内推信息审核未通过',
    getHtml: (_vars) => wrapHtml(`
      <h2>审核未通过</h2>
      <p>您好，<strong>{{name}}</strong>：</p>
      <p>很遗憾，您提交的内推信息未通过审核。</p>
      <div class="highlight">
        <p><strong>岗位标题：</strong>{{jobTitle}}</p>
        <p><strong>审核时间：</strong>{{reviewTime}}</p>
        <p><strong>拒绝原因：</strong>{{rejectReason}}</p>
      </div>
      <p>您可以根据审核意见修改后重新提交。如有疑问，请联系管理员。</p>
    `),
  },

  [EmailType.JOB_UPDATED]: {
    subject: '收藏的岗位信息已更新',
    getHtml: (_vars) => wrapHtml(`
      <h2>岗位信息更新通知</h2>
      <p>您好，<strong>{{name}}</strong>：</p>
      <p>您收藏的岗位信息已被贡献者更新，请查看最新内容。</p>
      <div class="highlight">
        <p><strong>岗位标题：</strong>{{jobTitle}}</p>
        <p><strong>更新时间：</strong>{{updateTime}}</p>
      </div>
      <p>更新可能包含岗位要求、截止日期等重要信息的变更，建议您及时查看。</p>
      <a href="{{jobUrl}}" class="btn">查看最新信息</a>
    `),
  },

  [EmailType.JOB_EXPIRING]: {
    subject: '收藏的岗位即将截止',
    getHtml: (_vars) => wrapHtml(`
      <h2>岗位即将截止提醒</h2>
      <p>您好，<strong>{{name}}</strong>：</p>
      <p>您收藏的岗位即将到达申请截止日期，请尽快投递！</p>
      <div class="highlight">
        <p><strong>岗位标题：</strong>{{jobTitle}}</p>
        <p><strong>截止日期：</strong>{{deadline}}</p>
        <p><strong>剩余时间：</strong>{{remainingTime}}</p>
      </div>
      <p>不要错过这个机会，抓紧时间投递吧！</p>
      <a href="{{jobUrl}}" class="btn">立即查看</a>
    `),
  },

  [EmailType.JOB_EXPIRED]: {
    subject: '收藏的岗位已截止',
    getHtml: (_vars) => wrapHtml(`
      <h2>岗位已截止通知</h2>
      <p>您好，<strong>{{name}}</strong>：</p>
      <p>您收藏的岗位已到达截止日期，该岗位现已标记为已过期。</p>
      <div class="highlight">
        <p><strong>岗位标题：</strong>{{jobTitle}}</p>
        <p><strong>截止日期：</strong>{{deadline}}</p>
      </div>
      <p>您可以继续浏览平台上的其他岗位，祝您早日找到心仪的工作！</p>
      <a href="{{siteUrl}}" class="btn">浏览更多岗位</a>
    `),
  },

  [EmailType.SYSTEM_NOTICE]: {
    subject: '悠渡脉选系统通知',
    getHtml: (_vars) => wrapHtml(`
      <h2>系统通知</h2>
      <p>您好，<strong>{{name}}</strong>：</p>
      <div class="highlight">
        <p>{{noticeContent}}</p>
      </div>
      <p>如有任何疑问，请联系平台管理员。</p>
      <a href="{{siteUrl}}" class="btn">前往平台</a>
    `),
  },

  [EmailType.FORGOT_PASSWORD]: {
    subject: '悠渡脉选 - 密码重置',
    getHtml: (_vars) => wrapHtml(`
      <h2>密码重置请求</h2>
      <p>您好，<strong>{{name}}</strong>：</p>
      <p>我们收到了您的密码重置请求。请使用以下验证码完成密码重置：</p>
      <div class="highlight" style="text-align: center; font-size: 24px; font-weight: 700; letter-spacing: 4px;">
        <p>{{resetCode}}</p>
      </div>
      <p>验证码有效期为 <strong>30 分钟</strong>，请尽快使用。如果这不是您本人的操作，请忽略此邮件，您的密码不会被更改。</p>
      <hr class="divider">
      <p style="font-size: 12px; color: #999999;">如需帮助，请联系平台管理员。</p>
    `),
  },
};

export function getTemplate(type: EmailType): EmailTemplate {
  const template = templates[type];
  if (!template) {
    return {
      subject: '悠渡脉选通知',
      getHtml: (_vars) => wrapHtml(`
        <h2>通知</h2>
        <p>{{content}}</p>
      `),
    };
  }
  return template;
}

export type { EmailTemplate };
