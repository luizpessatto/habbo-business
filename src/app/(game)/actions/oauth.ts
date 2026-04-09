'use server';

import { createClient } from '@/lib/supabase/server';

export interface OAuthStatus {
  connected: boolean;
  provider: string;
  accountId: string | null;
  expiresAt: string | null;
}

/**
 * Check if the current user has a connected OpenAI OAuth account.
 */
export async function getOpenAIOAuthStatus(): Promise<OAuthStatus> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { connected: false, provider: 'openai-codex', accountId: null, expiresAt: null };
    }

    const { data } = await supabase
      .from('user_oauth_tokens')
      .select('provider, account_id, expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'openai-codex')
      .single();

    if (!data) {
      return { connected: false, provider: 'openai-codex', accountId: null, expiresAt: null };
    }

    return {
      connected: true,
      provider: data.provider,
      accountId: data.account_id,
      expiresAt: data.expires_at,
    };
  } catch {
    return { connected: false, provider: 'openai-codex', accountId: null, expiresAt: null };
  }
}

/**
 * Disconnect the user's OpenAI OAuth account.
 */
export async function disconnectOpenAIOAuth(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    await supabase
      .from('user_oauth_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'openai-codex');

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to disconnect' };
  }
}
