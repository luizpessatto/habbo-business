'use server';

import { createClient } from '@/lib/supabase/server';
import { getLLMProvider } from '@/lib/ai/factory';
import type { LLMMessage } from '@/lib/ai/types';

const MAX_CONTEXT_MESSAGES = 20;

// In-memory conversation store (works without Supabase for demo)
const memoryStore = new Map<string, LLMMessage[]>();

function getConversationKey(agentId: string, userId: string) {
  return `${agentId}:${userId}`;
}

interface SendMessageResult {
  reply: string;
  error?: string;
}

export async function sendMessageToAgent(
  agentId: string,
  agentName: string,
  agentSystemPrompt: string,
  agentPersonality: string,
  agentProvider: 'claude' | 'openai',
  agentModel: string,
  userMessage: string
): Promise<SendMessageResult> {
  // Build system prompt
  const systemPrompt = [
    agentSystemPrompt,
    agentPersonality ? `Your personality: ${agentPersonality}` : '',
    `Your name is ${agentName}. You are an AI agent living in the AI Hotel, a virtual isometric world.`,
    'Keep responses concise (1-3 sentences max). Be expressive and in character.',
    'Respond in the same language the user writes to you.',
  ]
    .filter(Boolean)
    .join('\n');

  // Get or init conversation context
  // Try Supabase first, fall back to in-memory
  let conversationKey = `demo:${agentId}`;
  let messages: LLMMessage[] = [];

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      conversationKey = getConversationKey(agentId, user.id);

      // Load from Supabase
      const { data: conv } = await supabase
        .from('agent_conversations')
        .select('messages_json')
        .eq('agent_id', agentId)
        .eq('partner_type', 'user')
        .eq('partner_id', user.id)
        .single();

      if (conv?.messages_json) {
        messages = conv.messages_json as LLMMessage[];
      }
    }
  } catch {
    // Supabase not configured, use in-memory
  }

  // Fall back to memory store
  if (messages.length === 0 && memoryStore.has(conversationKey)) {
    messages = memoryStore.get(conversationKey)!;
  }

  // Add user message
  messages.push({ role: 'user', content: userMessage });

  // Trim to max context
  if (messages.length > MAX_CONTEXT_MESSAGES) {
    messages = messages.slice(-MAX_CONTEXT_MESSAGES);
  }

  // Build full message array with system prompt
  const fullMessages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  try {
    // If agent uses OpenAI, check if user has OAuth token → use subscription instead of API key
    let effectiveProvider: 'claude' | 'openai' | 'openai-oauth' = agentProvider;
    if (agentProvider === 'openai') {
      try {
        const supabase2 = await createClient();
        const { data: { user: u } } = await supabase2.auth.getUser();
        if (u) {
          const { data: oauthToken } = await supabase2
            .from('user_oauth_tokens')
            .select('id')
            .eq('user_id', u.id)
            .eq('provider', 'openai-codex')
            .single();
          if (oauthToken) {
            effectiveProvider = 'openai-oauth';
          }
        }
      } catch {
        // No OAuth token, fall back to API key
      }
    }

    const provider = getLLMProvider(effectiveProvider);
    const response = await provider.sendMessage(fullMessages, agentModel);

    // Add assistant reply to context
    messages.push({ role: 'assistant', content: response.content });

    // Save context
    memoryStore.set(conversationKey, messages);

    // Try to persist to Supabase
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('agent_conversations')
          .upsert(
            {
              agent_id: agentId,
              partner_type: 'user',
              partner_id: user.id,
              messages_json: messages,
              last_updated: new Date().toISOString(),
            },
            { onConflict: 'agent_id,partner_type,partner_id' }
          );

        // Track token usage
        await supabase.from('token_usage').insert({
          user_id: user.id,
          agent_id: agentId,
          provider: agentProvider,
          model: agentModel,
          prompt_tokens: response.promptTokens,
          completion_tokens: response.completionTokens,
        });
      }
    } catch {
      // Supabase not configured
    }

    return { reply: response.content };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { reply: '', error: `AI error: ${message}` };
  }
}

export async function clearConversation(agentId: string) {
  // Clear in-memory
  for (const key of memoryStore.keys()) {
    if (key.includes(agentId)) {
      memoryStore.delete(key);
    }
  }

  // Try to clear in Supabase
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('agent_conversations')
        .delete()
        .eq('agent_id', agentId)
        .eq('partner_type', 'user')
        .eq('partner_id', user.id);
    }
  } catch {
    // Supabase not configured
  }
}
