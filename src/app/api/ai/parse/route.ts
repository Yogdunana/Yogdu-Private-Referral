import { NextRequest } from 'next/server';
import { parseJobText } from '@/lib/ai';
import { handleApiError, successResponse, AppError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new AppError(400, '请提供需要解析的内推文案内容', 'MISSING_TEXT');
    }

    if (text.trim().length < 10) {
      throw new AppError(400, '文案内容过短，请提供更详细的内推信息', 'TEXT_TOO_SHORT');
    }

    const result = await parseJobText(text.trim());

    return successResponse(result, '解析成功');
  } catch (error) {
    if (error instanceof AppError) {
      return handleApiError(error);
    }

    console.error('AI 解析失败:', error);
    return handleApiError(
      new AppError(500, 'AI 解析失败，请稍后重试或手动填写信息', 'AI_PARSE_ERROR')
    );
  }
}
