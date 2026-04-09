export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

export interface LLMProvider {
  sendMessage(
    messages: LLMMessage[],
    model: string
  ): Promise<LLMResponse>;
}
