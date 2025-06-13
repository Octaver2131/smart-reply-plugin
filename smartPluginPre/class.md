# AI模块授课台词

## 1. AI模块概述

大家好！今天我们来讲解SmartReply插件中的AI模块，这是整个应用的核心部分。这个模块由三个关键文件组成，分别是：服务层的`ai.service.ts`、控制器层的`ai.controller.ts`和数据传输对象定义的`ai-request.dto.ts`。这三个文件共同构成了一个完整的AI服务处理流程，从接收请求、验证数据到调用AI接口并返回结果。

## 2. ai.service.ts 详细讲解

`ai.service.ts`是整个AI模块的核心服务类，它封装了与AI接口的交互逻辑，主要负责处理请求并生成智能回复。

### 2.1 导入和初始化

```typescript
import { Provide } from '@midwayjs/core';
import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import * as dotenv from 'dotenv';
import { AIRequestStyle, AIRequestType } from './dto/ai-request.dto';

dotenv.config();
const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});
```

这部分代码：
- 使用`@midwayjs/core`中的`Provide`装饰器，使服务可被依赖注入系统识别
- 从`ai`包导入`streamText`函数，用于生成流式文本响应
- 使用`@ai-sdk/deepseek`集成DeepSeek大语言模型
- 通过`dotenv`加载环境变量，确保API密钥安全存储
- 创建DeepSeek客户端实例，用于后续调用AI接口

### 2.2 服务类定义及处理请求方法

```typescript
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
    
    // 调用 AI 创建流式文本生成
    const { textStream } = streamText({
      model: deepseek('deepseek-chat'),
      prompt,
    });
    
    return {
      textStream,
      remainingCount: 200,
    };
  }
```

这个方法是整个服务的核心入口：
- 接收包含多个参数的请求对象，如许可证、选择的角色风格、请求类型、内容等
- 首先验证license是否正确，这是一个简单的授权检查
- 确保content字段有值，避免后续处理出错
- 根据请求类型（回复或优化）调用相应的提示词构建方法
- 使用DeepSeek模型生成流式文本响应
- 返回文本流和剩余使用次数（这里固定为200）

### 2.3 回复提示词构建方法

```typescript
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
```

这个方法专门构建回复类请求的提示词：
- 接收四个参数：风格、内容、上下文（可选）和自定义提示（可选）
- 首先定义不同风格的提示词模板：专业风格、幽默风格和随性风格
- 进行内容有效性检查，确保有内容可以回复
- 根据是否有上下文构建不同的提示内容
- 组合风格提示词和内容提示词，并添加额外条件
- 如果有自定义要求，将其添加到最终提示词中
- 返回完整的提示词字符串，供AI模型使用

### 2.4 优化提示词构建方法

```typescript
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
```

这个方法专门构建优化类请求的提示词：
- 与回复提示词构建方法类似，但专注于内容优化
- 定义了三种风格的优化提示词模板
- 对于优化功能，必须有实际内容，否则返回错误提示
- 根据是否有上下文构建不同的提示内容
- 组合风格提示词和内容提示词，确保模型能够理解需要保持原意但改变表达方式
- 如有自定义要求，添加到最终提示词
- 返回完整的优化提示词字符串

## 3. ai.controller.ts 详细讲解

`ai.controller.ts`是整个AI模块的控制器层，负责接收HTTP请求并调用服务层处理业务逻辑。它是前端与AI服务的桥梁。

### 3.1 导入和控制器定义

```typescript
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
```

这部分代码：
- 导入所需的装饰器和依赖
- 使用`@Controller('/api')`定义了API基础路径为`/api`
- 通过`@Inject()`注入了AIService服务和Koa上下文对象

### 3.2 验证码检查接口

```typescript
  @Get('/code/check')
  async codeCheck(@Query('code') code: string) {
    return {
      success: true,
      message: '查询成功',
      data: { remainingCount: 200 },
    };
  }
```

这个方法：
- 定义了一个GET请求接口，路径为`/api/code/check`
- 接收查询参数`code`
- 目前是一个简单实现，返回固定成功响应和剩余次数
- 在实际应用中，这里应该有实际的验证码检查逻辑

### 3.3 AI处理接口

```typescript
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
```

这个方法是控制器的核心处理方法：
- 定义了一个POST请求接口，路径为`/api/ai/process`
- 通过`@Body()`装饰器接收请求体，并使用AIRequestDTO进行验证
- 调用前面定义的aiService中的processRequest方法处理请求
- 设置SSE（Server-Sent Events）相关的响应头，支持流式传输
- 使用`for await...of`循环遍历文本流中的每个块，并写入响应
- 当所有内容处理完毕后，发送一个包含剩余计数的结束标记
- 捕获并处理可能出现的错误，返回适当的错误响应

## 4. ai-request.dto.ts 详细讲解

`ai-request.dto.ts`定义了AI请求的数据传输对象（DTO）和相关枚举，它规范了前端发送给后端的数据格式和验证规则。

### 4.1 枚举定义

```typescript
import { Rule, RuleType } from '@midwayjs/validate';

export enum AIRequestType {
  REPLY = 'reply',
  OPTIMIZE = 'optimize',
}

export enum AIRequestStyle {
  PROFESSIONAL = 'professional', // 专业
  HUMOROUS = 'humorous', // 诙谐
  CASUAL = 'casual', // 随性
}
```

这部分定义了两个重要的枚举：
- `AIRequestType`：定义了两种请求类型
  - `REPLY`：生成回复内容
  - `OPTIMIZE`：优化现有内容
- `AIRequestStyle`：定义了三种风格
  - `PROFESSIONAL`：专业风格，适合正式场合
  - `HUMOROUS`：幽默风格，增加趣味性
  - `CASUAL`：随性风格，适合日常交流

### 4.2 DTO类定义及字段验证

```typescript
export class AIRequestDTO {
  @Rule(RuleType.string().label('使用码').required())
  license: string;

  @Rule(RuleType.string().label('处理风格').required())
  selectedRole: AIRequestStyle;

  @Rule(RuleType.string().label('处理类型').required())
  type: AIRequestType;

  @Rule(RuleType.string().label('处理内容').required().allow(''))
  content: string;
  
  @Rule(
    RuleType.array().items(RuleType.string()).label('不喜欢的回复').optional()
  )
  dislikedResponses?: string[];

  @Rule(RuleType.string().label('聊天上下文').optional().allow(''))
  context?: string;

  @Rule(RuleType.string().label('自定义要求').optional().allow(''))
  customPrompt?: string;
}
```

这个DTO类定义了请求的结构和验证规则：
- 使用`@Rule`装饰器为每个字段定义验证规则
- 必填字段：
  - `license`：使用码，用于验证请求合法性
  - `selectedRole`：选择的处理风格
  - `type`：处理类型（回复或优化）
  - `content`：需要处理的内容（允许空字符串）
- 可选字段：
  - `dislikedResponses`：用户不喜欢的回复，可用于后续改进
  - `context`：聊天上下文，帮助AI更好理解语境
  - `customPrompt`：用户的自定义要求

### 4.3 验证规则说明

每个字段都使用`@midwayjs/validate`提供的验证规则：
- `RuleType.string()`：定义字符串类型
- `label()`：为字段提供友好名称，便于错误提示
- `required()`：标记为必填字段
- `allow('')`：允许空字符串（适用于content等字段）
- `optional()`：标记为可选字段
- `array().items()`：定义数组类型及其元素类型

## 5. 模块完整交互流程

1. 前端构建符合`AIRequestDTO`结构的请求对象，包含用户选择的风格、类型和内容
2. 前端发送POST请求到`/api/ai/process`端点
3. `ai.controller.ts`中的`process`方法接收并验证请求
4. 控制器调用`ai.service.ts`中的`processRequest`方法
5. 服务根据请求类型调用相应的提示词构建方法（`buildReplyPrompt`或`buildOptimizePrompt`）
6. 服务使用构建好的提示词调用DeepSeek API生成回复
7. 控制器将生成的内容以流式方式实时返回给前端
8. 前端接收流式响应并逐步显示给用户

## 6. 扩展和优化方向

### 6.1 AI模型和接口扩展
- 支持更多AI服务提供商，如OpenAI、Claude等
- 实现模型切换功能，根据需求选择不同模型
- 优化API调用参数，如温度、最大长度等

### 6.2 风格和功能扩展
- 增加更多回复风格选项，如正式、友好、简洁等
- 添加新的请求类型，如总结、扩展、翻译等
- 实现上下文记忆功能，支持多轮对话

### 6.3 用户体验优化
- 添加用户反馈机制，收集不满意的回复
- 实现AI回复质量评分系统
- 提供回复历史记录和收藏功能

### 6.4 性能和安全优化
- 实现请求缓存，提高常见请求的响应速度
- 添加请求限流和防滥用机制
- 完善错误处理和日志记录

### 6.5 提示词工程优化
- 持续优化各种风格的提示词模板
- 实现动态提示词生成，根据用户历史偏好调整
- 添加领域特定提示词，如技术、客服、销售等

以上就是SmartReply插件AI模块三个核心文件的详细讲解。通过这些文件的协同工作，实现了一个功能完整的AI辅助回复系统，可以根据用户需求生成或优化内容，提供多种风格选择。 