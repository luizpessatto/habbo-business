'use server';

import { createClient } from '@/lib/supabase/server';

export interface OAuthStatus {
  connected: boolean;
  provider: string;
  accountId: string | null;
  expiresAt: string | null;
}

/**
 * Check if the current user has a connected OpenAI account (OAuth or API key).
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
      .in('provider', ['openai-codex', 'openai-apikey'])
      .limit(1)
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
 * Disconnect the user's OpenAI account (OAuth or API key).
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
      .in('provider', ['openai-codex', 'openai-apikey']);

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to disconnect' };
  }
}

/**
 * Save an OpenAI API key for the current user.
 */
export async function saveOpenAIApiKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
  if (!apiKey || !apiKey.startsWith('sk-')) {
    return { success: false, error: 'Invalid API key — must start with sk-' };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Remove any existing openai tokens for this user
    await supabase
      .from('user_oauth_tokens')
      .delete()
      .eq('user_id', user.id)
      .in('provider', ['openai-codex', 'openai-apikey']);

    // Save the API key as a token
    const { error } = await supabase.from('user_oauth_tokens').insert({
      user_id: user.id,
      provider: 'openai-apikey',
      access_token: apiKey,
      refresh_token: null,
      expires_at: new Date('2099-12-31').toISOString(),
      account_id: `key-${apiKey.slice(-4)}`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to save API key' };
  }
}
