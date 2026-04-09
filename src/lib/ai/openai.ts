import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, LLMResponse } from './types';
import { sendCodexCompletion, refreshAccessToken } from './openai-oauth';
import { createClient } from '@/lib/supabase/server';

/**
 * Standard OpenAI provider — uses OPENAI_API_KEY env var.
 */
export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async sendMessage(messages: LLMMessage[], model: string): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model,
      max_tokens: 500,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    return {
      content: response.choices[0]?.message?.content ?? '',
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
    };
  }
}

/**
 * OpenAI user-token provider — uses per-user credentials from Supabase.
 * Supports both:
 *   - 'openai-apikey': user's own API key (works everywhere)
 *   - 'openai-codex': Codex OAuth token (localhost only, uses ChatGPT subscription)
 */
export class OpenAIOAuthProvider implements LLMProvider {
  async sendMessage(messages: LLMMessage[], model: string): Promise<LLMResponse> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated — cannot use OpenAI');
    }

    // Get stored tokens (API key or OAuth)
    const { data: tokenRow } = await supabase
      .from('user_oauth_tokens')
      .select('*')
      .eq('user_id', user.id)
      .in('provider', ['openai-apikey', 'openai-codex'])
      .limit(1)
      .single();

    if (!tokenRow) {
      throw new Error(
        'OpenAI not connected. Go to Settings → connect your API key.'
      );
    }

    // API key flow — use standard OpenAI SDK
    if (tokenRow.provider === 'openai-apikey') {
      const client = new OpenAI({ apiKey: tokenRow.access_token });
      const response = await client.chat.completions.create({
        model,
        max_tokens: 500,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      return {
        content: response.choices[0]?.message?.content ?? '',
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      };
    }

    // OAuth flow — use Codex endpoint (localhost only)
    let accessToken = tokenRow.access_token;
    const expiresAt = new Date(tokenRow.expires_at);

    if (expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
      if (!tokenRow.refresh_token) {
        throw new Error(
          'OpenAI token expired. Please reconnect your account.'
        );
      }

      try {
        const refreshed = await refreshAccessToken(tokenRow.refresh_token);
        await supabase
          .from('user_oauth_tokens')
          .update({
            access_token: refreshed.accessToken,
            refresh_token: refreshed.refreshToken,
            expires_at: refreshed.expiresAt.toISOString(),
            account_id: refreshed.accountId,
          })
          .eq('id', tokenRow.id);

        accessToken = refreshed.accessToken;
      } catch (err) {
        throw new Error(
          `Failed to refresh OpenAI token: ${err instanceof Error ? err.message : 'unknown error'}. Please reconnect.`
        );
      }
    }

    const response = await sendCodexCompletion(accessToken, messages, model);
    return {
      content: response.content,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
    };
  }
}
