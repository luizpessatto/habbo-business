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
 * OpenAI OAuth provider — uses the user's ChatGPT subscription via Codex OAuth.
 * Tokens are stored per-user in Supabase `user_oauth_tokens`.
 */
export class OpenAIOAuthProvider implements LLMProvider {
  async sendMessage(messages: LLMMessage[], model: string): Promise<LLMResponse> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated — cannot use OpenAI OAuth');
    }

    // Get stored tokens
    const { data: tokenRow } = await supabase
      .from('user_oauth_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'openai-codex')
      .single();

    if (!tokenRow) {
      throw new Error(
        'OpenAI not connected. Go to Settings → Connect OpenAI Account.'
      );
    }

    let accessToken = tokenRow.access_token;
    const expiresAt = new Date(tokenRow.expires_at);

    // Refresh if expired or about to expire (5 min buffer)
    if (expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
      if (!tokenRow.refresh_token) {
        throw new Error(
          'OpenAI token expired and no refresh token available. Please reconnect your account.'
        );
      }

      try {
        const refreshed = await refreshAccessToken(tokenRow.refresh_token);

        // Update tokens in DB
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
          `Failed to refresh OpenAI token: ${err instanceof Error ? err.message : 'unknown error'}. Please reconnect your account.`
        );
      }
    }

    // Call Codex API with OAuth token
    const response = await sendCodexCompletion(accessToken, messages, model);

    return {
      content: response.content,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
    };
  }
}
