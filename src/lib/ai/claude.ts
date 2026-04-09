import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMMessage, LLMResponse } from './types';

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async sendMessage(messages: LLMMessage[], model: string): Promise<LLMResponse> {
    // Separate system message from conversation
    const systemMsg = messages.find((m) => m.role === 'system');
    const conversationMsgs = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model,
      max_tokens: 500,
      system: systemMsg?.content ?? '',
      messages: conversationMsgs,
    });

    const textBlock = response.content.find((b) => b.type === 'text');

    return {
      content: textBlock?.text ?? '',
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    };
  }
}
