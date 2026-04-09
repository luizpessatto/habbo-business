import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens } from '@/lib/ai/openai-oauth';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/openai/callback
 * Handles the OAuth callback from OpenAI.
 * Exchanges code for tokens and stores them in Supabase.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Handle errors from OpenAI
  if (error) {
    const desc = searchParams.get('error_description') ?? error;
    return NextResponse.redirect(
      `${appUrl}/?oauth_error=${encodeURIComponent(desc)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/?oauth_error=${encodeURIComponent('Missing code or state')}`
    );
  }

  // Validate state and get verifier from cookies
  const cookieStore = await cookies();
  const storedState = cookieStore.get('openai_oauth_state')?.value;
  const codeVerifier = cookieStore.get('openai_code_verifier')?.value;

  // Clean up cookies
  cookieStore.delete('openai_oauth_state');
  cookieStore.delete('openai_code_verifier');

  if (!storedState || state !== storedState) {
    return NextResponse.redirect(
      `${appUrl}/?oauth_error=${encodeURIComponent('Invalid state parameter')}`
    );
  }

  if (!codeVerifier) {
    return NextResponse.redirect(
      `${appUrl}/?oauth_error=${encodeURIComponent('Missing PKCE verifier')}`
    );
  }

  try {
    // Exchange code for tokens
    const redirectUri = `${appUrl}/api/auth/openai/callback`;
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);

    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        `${appUrl}/login?oauth_error=${encodeURIComponent('Not authenticated')}`
      );
    }

    // Store tokens in Supabase
    await supabase.from('user_oauth_tokens').upsert(
      {
        user_id: user.id,
        provider: 'openai-codex',
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt.toISOString(),
        account_id: tokens.accountId,
      },
      { onConflict: 'user_id,provider' }
    );

    // Redirect back to game with success
    return NextResponse.redirect(`${appUrl}/?oauth_success=openai`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token exchange failed';
    console.error('OpenAI OAuth callback error:', message);
    return NextResponse.redirect(
      `${appUrl}/?oauth_error=${encodeURIComponent(message)}`
    );
  }
}
