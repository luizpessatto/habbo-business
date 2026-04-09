import { getLLMProvider } from './factory';
import type { LLMMessage } from './types';

interface AgentProfile {
  id: string;
  name: string;
  systemPrompt: string;
  personality: string;
  provider: 'claude' | 'openai';
  model: string;
}

interface ActiveConversation {
  initiator: AgentProfile;
  responder: AgentProfile;
  messages: { agentId: string; content: string }[];
  exchangeCount: number;
  maxExchanges: number;
}

const activeConversations = new Map<string, ActiveConversation>();
const conversationCooldowns = new Map<string, number>();

const COOLDOWN_MS = 30_000; // 30 seconds between conversations per agent
const MIN_EXCHANGES = 2;
const MAX_EXCHANGES = 4;

function convKey(a: string, b: string) {
  return [a, b].sort().join(':');
}

function buildAgentSystemPrompt(agent: AgentProfile, partner: AgentProfile): string {
  return [
    agent.systemPrompt,
    agent.personality ? `Your personality: ${agent.personality}` : '',
    `Your name is ${agent.name}. You are chatting with ${partner.name} in the AI Hotel.`,
    'Keep responses very short (1-2 sentences). Be natural and in character.',
    'Respond in Portuguese (Brazilian) by default.',
  ].filter(Boolean).join('\n');
}

export async function startAgentConversation(
  initiator: AgentProfile,
  responder: AgentProfile,
  onMessage: (agentId: string, message: string) => void,
  onEnd: () => void,
) {
  const key = convKey(initiator.id, responder.id);

  // Check cooldown
  const lastConv = conversationCooldowns.get(initiator.id) ?? 0;
  if (Date.now() - lastConv < COOLDOWN_MS) {
    onEnd();
    return;
  }

  // Check if already in conversation
  if (activeConversations.has(key)) {
    onEnd();
    return;
  }

  const maxExchanges = MIN_EXCHANGES + Math.floor(Math.random() * (MAX_EXCHANGES - MIN_EXCHANGES + 1));

  const conv: ActiveConversation = {
    initiator,
    responder,
    messages: [],
    exchangeCount: 0,
    maxExchanges,
  };
  activeConversations.set(key, conv);

  try {
    // Initiator starts
    let currentSpeaker = initiator;
    let currentListener = responder;

    for (let i = 0; i < maxExchanges * 2; i++) {
      const isInitiator = currentSpeaker.id === initiator.id;

      // Build messages for the current speaker
      const systemPrompt = buildAgentSystemPrompt(currentSpeaker, currentListener);
      const llmMessages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history from this agent's perspective
      for (const msg of conv.messages) {
        llmMessages.push({
          role: msg.agentId === currentSpeaker.id ? 'assistant' : 'user',
          content: msg.content,
        });
      }

      // If first message, add a prompt to start the conversation
      if (conv.messages.length === 0) {
        llmMessages.push({
          role: 'user',
          content: `[${currentListener.name} esta perto de voce no AI Hotel. Inicie uma conversa breve e natural.]`,
        });
      }

      try {
        const provider = getLLMProvider(currentSpeaker.provider);
        const response = await provider.sendMessage(llmMessages, currentSpeaker.model);

        if (response.content) {
          conv.messages.push({ agentId: currentSpeaker.id, content: response.content });
          onMessage(currentSpeaker.id, response.content);

          // Small delay between messages for natural feel
          await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
        }
      } catch (err) {
        console.error(`[ConversationOrchestrator] Error for ${currentSpeaker.name}:`, err);
        break;
      }

      // Swap speakers
      const tmp = currentSpeaker;
      currentSpeaker = currentListener;
      currentListener = tmp;

      conv.exchangeCount++;
      if (conv.exchangeCount >= maxExchanges) break;
    }
  } finally {
    activeConversations.delete(key);
    conversationCooldowns.set(initiator.id, Date.now());
    conversationCooldowns.set(responder.id, Date.now());
    onEnd();
  }
}

export function isAgentInConversation(agentId: string): boolean {
  for (const conv of activeConversations.values()) {
    if (conv.initiator.id === agentId || conv.responder.id === agentId) {
      return true;
    }
  }
  return false;
}
