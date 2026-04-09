import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generatePKCE, buildAuthorizationURL } from '@/lib/ai/openai-oauth';

/**
 * GET /api/auth/openai
 * Starts the OpenAI Codex OAuth PKCE flow.
 * Generates PKCE params, stores verifier+state in cookies, redirects to OpenAI.
 */
export async function GET() {
  const { codeVerifier, codeChallenge, state } = await generatePKCE();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/openai/callback`;

  const authUrl = buildAuthorizationURL(codeChallenge, state, redirectUri);

  // Store PKCE verifier and state in httpOnly cookies (short-lived, 10 min)
  const cookieStore = await cookies();

  cookieStore.set('openai_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  cookieStore.set('openai_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return NextResponse.redirect(authUrl);
}
