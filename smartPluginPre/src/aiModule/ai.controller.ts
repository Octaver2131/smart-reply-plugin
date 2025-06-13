import { Controller, Inject, Post, Body, Get, Query } from '@midwayjs/core';
import { AIService } from './ai.service';
import { AIRequestDTO } from './dto/ai-request.dto';
import { Context } from '@midwayjs/koa';

@Controller('/api')
export class AIController {
  @Inject()
  aiService: AIService;

  @Inject()
  ctx: Context;

  @Get('/code/check')
  async codeCheck(@Query('code') code: string) {
    return {
      success: true,
      message: '查询成功',
      data: { remainingCount: 200 },
    };
  }

  @Post('/ai/process')
  async process(@Body() request: AIRequestDTO) {
    try {
      // 获取流式响应
      const { textStream, remainingCount } =
        await this.aiService.processRequest(request);
      // 设置响应头，支持流式传输
      const res = this.ctx.res;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 将流式响应传递给客户端
      for await (const chunk of textStream) {
        res.write(chunk);
      }

      // 结束响应
      res.end(`remianCountIs:${remainingCount}`);
      return;
    } catch (error) {
      return {
        success: false,
        message: error.message || '处理失败',
      };
    }
  }
}
