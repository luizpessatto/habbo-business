import type { LLMProvider } from './types';
import { ClaudeProvider } from './claude';
import { OpenAIProvider, OpenAIOAuthProvider } from './openai';

const providers = new Map<string, LLMProvider>();

/**
 * Get an LLM provider instance.
 *
 * For OpenAI, there are two modes:
 *   - 'openai'       → uses OPENAI_API_KEY (standard API billing)
 *   - 'openai-oauth'  → uses Codex OAuth (ChatGPT subscription)
 *
 * The OpenAI OAuth provider is per-request (reads user tokens from Supabase),
 * so it's not cached as a singleton.
 */
export function getLLMProvider(
  providerName: 'claude' | 'openai' | 'openai-oauth',
): LLMProvider {
  // OAuth provider is stateless per-request — always create fresh
  if (providerName === 'openai-oauth') {
    return new OpenAIOAuthProvider();
  }

  if (!providers.has(providerName)) {
    if (providerName === 'claude') {
      providers.set(providerName, new ClaudeProvider());
    } else {
      providers.set(providerName, new OpenAIProvider());
    }
  }
  return providers.get(providerName)!;
}
