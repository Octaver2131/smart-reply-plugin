import { Provide } from '@midwayjs/core';
import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import * as dotenv from 'dotenv';
import { AIRequestStyle, AIRequestType } from './dto/ai-request.dto';

dotenv.config();
const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});
@Provide()
export class AIService {
  async processRequest(request: {
    license: string;
    selectedRole: AIRequestStyle;
    type: AIRequestType;
    content?: string;
    context?: string;
    customPrompt?: string;
  }): Promise<{ textStream: AsyncIterable<string>; remainingCount: number }> {
    // 检查使用码
    if (request.license !== 'smartReply') {
      throw new Error('使用码不对');
    }

    // 确保content有值，即使是空字符串
    const content = request.content || '';

    // 构建提示词
    let prompt = '';
    if (request.type === AIRequestType.REPLY) {
      prompt = this.buildReplyPrompt(
        request.selectedRole,
        content,
        request.context,
        request.customPrompt
      );
    } else if (request.type === AIRequestType.OPTIMIZE) {
      prompt = this.buildOptimizePrompt(
        request.selectedRole,
        content,
        request.context,
        request.customPrompt
      );
    }
    console.log('prompt', prompt);
    // 调用 AI
    // 创建流式文本生成
    const { textStream } = streamText({
      model: deepseek('deepseek-chat'),
      prompt,
    });
    return {
      textStream,
      remainingCount: 200,
    };
  }

  private buildReplyPrompt(
    style: AIRequestStyle,
    content: string,
    context?: string,
    customPrompt?: string
  ): string {
    const stylePrompts = {
      [AIRequestStyle.PROFESSIONAL]: `以专业的语气回复，像在职场对话：
1. 用专业自信但不生硬的语气
2. 保持简洁有力，如同专业人士的对话方式
3. 直接用纯文本回复，不使用Markdown、代码块或标题等格式
4. 就像真人对话一样自然流畅`,

      [AIRequestStyle.HUMOROUS]: `以幽默的语气回复，像轻松的交谈：
1. 用轻松风趣的语气
2. 表达要生动有趣，带些机智
3. 直接用纯文本回复，不使用Markdown、代码块或标题等格式
4. 就像有趣朋友间的对话一样自然`,

      [AIRequestStyle.CASUAL]: `以随性的语气直接回复：
1. 用轻松自然的语气，像日常对话
2. 避免使用"哎呀"、"啊"等起始词
3. 表达要随意但有条理，像熟人间对话
4. 保持语气轻松，但不要太夸张`,
    };

    // 只检查content是否为undefined或null，允许空字符串
    if (content === undefined || content === null) {
      return '信息不足，无法回复';
    }

    let promptContent = '';

    // 如果有上下文，则添加到提示中
    if (context && context.trim().length > 0) {
      // 如果content为空，则只使用上下文
      if (content.trim().length === 0) {
        promptContent = `聊天上下文：\n${context}\n\n请根据上下文生成回复。`;
      } else {
        promptContent = `聊天上下文：\n${context}\n\n当前需要回复的内容：\n${content}`;
      }
    } else {
      // 如果content为空且没有上下文，返回提示信息
      if (content.trim().length === 0) {
        return '信息不足，无法回复';
      }
      promptContent = `内容：${content}`;
    }

    let prompt = `${stylePrompts[style]}\n\n${promptContent}\n\n额外条件：直接给出回复内容，不使用Markdown格式，不要以"哎呀"、引号开头，不要用建议语气如"我们可以这样表述"，而是像真实对话一样自然。如果有上下文，请确保你的回复与整个对话保持连贯性。`;

    // 如果有自定义要求，添加到提示词中
    if (customPrompt && customPrompt.trim().length > 0) {
      prompt += `\n\n额外信息：\n${customPrompt}`;
    }

    return prompt;
  }

  private buildOptimizePrompt(
    style: AIRequestStyle,
    content: string,
    context?: string,
    customPrompt?: string
  ): string {
    const stylePrompts = {
      [AIRequestStyle.PROFESSIONAL]: `用专业的语气改写，像职场对话：
1. 用专业自信但不生硬的语气
2. 保持原意，让表达更清晰精准
3. 直接用纯文本改写，不使用Markdown、代码块或标题等格式
4. 就像专业人士会说的话一样自然`,

      [AIRequestStyle.HUMOROUS]: `用幽默的语气改写，像轻松的交谈：
1. 用轻松风趣的语气
2. 保持原意，让表达更生动有趣
3. 直接用纯文本改写，不使用Markdown、代码块或标题等格式
4. 就像幽默朋友会说的话一样自然`,

      [AIRequestStyle.CASUAL]: `用随性的语气改写：
1. 用轻松自然的语气，像日常对话
2. 保持原意，但更随意生活化
3. 不要以"哎呀"、"啊"等词开头
4. 像熟人间的自然对话，不夸张不做作`,
    };

    // 对于优化功能，必须有内容
    if (!content || content.trim().length === 0) {
      return '信息不足，无法优化';
    }

    let promptContent = '';

    // 如果有上下文，则添加到提示中
    if (context && context.trim().length > 0) {
      promptContent = `聊天上下文：\n${context}\n\n需要优化的内容：\n${content}`;
    } else {
      promptContent = `需要优化的内容:${content}`;
    }

    let prompt = `${stylePrompts[style]}\n\n${promptContent}\n\n额外条件:直接给出改写内容，不使用Markdown格式，不要以"哎呀"、引号开头，不要用"我们可以这样表述"的建议语气，而是像真实对话一样自然。如果有上下文，请确保改写的内容与整个对话保持连贯性。`;

    // 如果有自定义要求，添加到提示词中
    if (customPrompt && customPrompt.trim().length > 0) {
      prompt += `\n\n额外信息：\n${customPrompt}`;
    }

    return prompt;
  }
}
