import OpenAI from 'openai';
import { AiParseResult } from '@/types';

const client = new OpenAI({
  apiKey: process.env.ARK_API_KEY,
  baseURL: process.env.ARK_BASE_URL,
});

export async function parseJobText(rawText: string): Promise<AiParseResult> {
  const response = await client.chat.completions.create({
    model: process.env.ARK_MODEL!,
    messages: [
      {
        role: 'system',
        content: `你是一个内推信息解析助手。请从用户提供的原始内推文案中提取结构化信息。
要求：
1. 精简口语化内容，去除冗余信息
2. 标准化岗位类型为：日常实习、暑期实习、科研实习、全职、其他
3. 标准化工作模式为：远程、线下、混合
4. 自动生成标签（如城市、岗位类型、技能等），最多5个
5. 截止日期提取为 YYYY-MM-DD 格式
6. 如果某个字段无法从文案中提取，留空字符串`
      },
      { role: 'user', content: rawText }
    ],
    response_format: {
      type: 'json_object'
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('AI 解析失败，未返回有效内容');
  return JSON.parse(content);
}
