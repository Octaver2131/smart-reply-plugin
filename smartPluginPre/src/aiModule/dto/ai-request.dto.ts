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
