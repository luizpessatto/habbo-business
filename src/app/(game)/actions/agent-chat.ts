'use server';

import { startAgentConversation } from '@/lib/ai/ConversationOrchestrator';

interface AgentProfile {
  id: string;
  name: string;
  systemPrompt: string;
  personality: string;
  provider: 'claude' | 'openai';
  model: string;
}

/**
 * Trigger a conversation between two agents.
 * Returns an array of messages exchanged.
 */
export async function triggerAgentConversation(
  initiator: AgentProfile,
  responder: AgentProfile,
): Promise<{ messages: { agentId: string; content: string }[] }> {
  const messages: { agentId: string; content: string }[] = [];

  await new Promise<void>((resolve) => {
    startAgentConversation(
      initiator,
      responder,
      (agentId, content) => {
        messages.push({ agentId, content });
      },
      () => resolve(),
    );
  });

  return { messages };
}
