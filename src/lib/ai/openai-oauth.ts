/**
 * OpenAI Codex OAuth 2.1 PKCE flow.
 * Allows users to authenticate with their ChatGPT Plus/Pro subscription
 * and use it for AI agent chat instead of a separate API key.
 *
 * Flow:
 *   1. Browser calls /api/auth/openai → redirects to auth.openai.com
 *   2. User logs in and authorizes
 *   3. Callback at /api/auth/openai/callback exchanges code for tokens
 *   4. Tokens stored in Supabase user_oauth_tokens table
 *   5. OpenAI provider uses OAuth token instead of API key
 */

// --- PKCE helpers (used client-side to start the flow) ---

const OPENAI_AUTH_URL = 'https://auth.openai.com/oauth/authorize';
const OPENAI_TOKEN_URL = 'https://auth.openai.com/oauth/token';

// Codex public client ID (same one used by Codex CLI / OpenClaw)
const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';

const SCOPES = 'openid profile email offline_access';

/**
 * Generate a cryptographically random string for PKCE verifier / state.
 */
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

/**
 * Create a SHA-256 code challenge from a verifier (S256 method).
 */
async function sha256Challenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  // Base64url encode
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Generate PKCE parameters for the OAuth flow.
 */
export async function generatePKCE(): Promise<PKCEParams> {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await sha256Challenge(codeVerifier);
  const state = generateRandomString(32);
  return { codeVerifier, codeChallenge, state };
}

/**
 * Build the authorization URL to redirect the user to OpenAI.
 */
export function buildAuthorizationURL(
  codeChallenge: string,
  state: string,
  redirectUri: string,
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CODEX_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    // Flags used by Codex CLI
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
  });

  return `${OPENAI_AUTH_URL}?${params.toString()}`;
}

// --- Token exchange (used server-side in callback) ---

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  accountId: string | null;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CODEX_CLIENT_ID,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch(OPENAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI token exchange failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  // Try to extract accountId from the access token (JWT)
  let accountId: string | null = null;
  try {
    const payload = JSON.parse(atob(data.access_token.split('.')[1]));
    accountId = payload.sub ?? payload.account_id ?? null;
  } catch {
    // Not a JWT or missing fields
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
    accountId,
  };
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CODEX_CLIENT_ID,
    refresh_token: refreshToken,
  });

  const res = await fetch(OPENAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI token refresh failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  let accountId: string | null = null;
  try {
    const payload = JSON.parse(atob(data.access_token.split('.')[1]));
    accountId = payload.sub ?? payload.account_id ?? null;
  } catch {
    // Not a JWT
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt,
    accountId,
  };
}

// --- Codex API call (uses OAuth token) ---

const CODEX_API_URL = 'https://chatgpt.com/backend-api/codex/responses';

export interface CodexMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CodexResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Send a chat completion via the Codex backend API using an OAuth token.
 * This uses the user's ChatGPT subscription, not API credits.
 */
export async function sendCodexCompletion(
  accessToken: string,
  messages: CodexMessage[],
  model: string = 'gpt-4o',
): Promise<CodexResponse> {
  // The Codex endpoint accepts a similar format to the standard API
  const res = await fetch(CODEX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 500,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Codex API error: ${res.status} ${err}`);
  }

  const data = await res.json();

  // Parse response — Codex may return in standard OpenAI format or slightly different
  const content =
    data.choices?.[0]?.message?.content ??
    data.output_text ??
    data.content ??
    '';

  return {
    content,
    promptTokens: data.usage?.prompt_tokens ?? data.usage?.input_tokens ?? 0,
    completionTokens:
      data.usage?.completion_tokens ?? data.usage?.output_tokens ?? 0,
  };
}
