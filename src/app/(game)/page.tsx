'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from '@/components/game';
import HUD from '@/components/game/HUD';
import AgentPanel from '@/components/panels/AgentPanel';
import ChatPanel from '@/components/panels/ChatPanel';
import RoomBrowser from '@/components/panels/RoomBrowser';
import RoomEditor from '@/components/panels/RoomEditor';
import UserMenu from '@/components/panels/UserMenu';
import TokenUsage from '@/components/panels/TokenUsage';
import { triggerAgentConversation } from './actions/agent-chat';

// Demo agent configs for chat (matching GameCanvas DEMO_AGENTS)
const DEMO_AGENT_CHAT_INFO: Record<string, {
  id: string;
  name: string;
  systemPrompt: string;
  personality: string;
  provider: 'claude' | 'openai';
  model: string;
  status: string;
}> = {
  'agent-1': {
    id: 'agent-1',
    name: 'Claude',
    systemPrompt: 'You are Claude, a helpful and thoughtful AI assistant.',
    personality: 'Thoughtful, curious, and warm. Loves deep conversations about philosophy and technology.',
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    status: 'online',
  },
  'agent-2': {
    id: 'agent-2',
    name: 'GPT',
    systemPrompt: 'You are GPT, a versatile AI assistant.',
    personality: 'Enthusiastic, knowledgeable, and adaptable. Enjoys creative writing and problem-solving.',
    provider: 'openai',
    model: 'gpt-4o-mini',
    status: 'online',
  },
  'agent-3': {
    id: 'agent-3',
    name: 'Gemini',
    systemPrompt: 'You are Gemini, a multimodal AI assistant.',
    personality: 'Analytical, precise, and slightly quirky. Loves data and visual thinking.',
    provider: 'claude',
    model: 'claude-haiku-4-5-20251001',
    status: 'busy',
  },
};

export default function GamePage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [chatAgent, setChatAgent] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<{ id: string; name: string } | null>(null);
  const [editorActive, setEditorActive] = useState(false);
  const [tokenUsageOpen, setTokenUsageOpen] = useState(false);

  // Agent selection
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSelectedAgent(detail ? detail.id : null);
    };
    window.addEventListener('agent-selected', handler);
    return () => window.removeEventListener('agent-selected', handler);
  }, []);

  // Open chat when agent is selected
  useEffect(() => {
    if (selectedAgent) {
      setChatAgent(selectedAgent);
    }
  }, [selectedAgent]);

  // Handle agent-to-agent conversations
  const handleAgentAgentChat = useCallback(async (e: Event) => {
    const { initiatorId, targetId } = (e as CustomEvent).detail;
    const initiator = DEMO_AGENT_CHAT_INFO[initiatorId];
    const target = DEMO_AGENT_CHAT_INFO[targetId];
    if (!initiator || !target) return;

    try {
      const result = await triggerAgentConversation(initiator, target);
      for (const msg of result.messages) {
        window.dispatchEvent(
          new CustomEvent('chat-bubble', {
            detail: { agentId: msg.agentId, message: msg.content, sender: 'agent' },
          })
        );
      }
    } catch (err) {
      console.error('Agent-agent conversation failed:', err);
    } finally {
      window.dispatchEvent(
        new CustomEvent('agent-agent-chat-end', {
          detail: { initiatorId, targetId },
        })
      );
    }
  }, []);

  useEffect(() => {
    window.addEventListener('agent-agent-chat', handleAgentAgentChat);
    return () => window.removeEventListener('agent-agent-chat', handleAgentAgentChat);
  }, [handleAgentAgentChat]);

  const chatAgentInfo = chatAgent ? DEMO_AGENT_CHAT_INFO[chatAgent] ?? null : null;

  function handleEnterRoom(roomId: string, roomName: string) {
    setCurrentRoom({ id: roomId, name: roomName });
    // Dispatch event for GameCanvas to reload room
    window.dispatchEvent(
      new CustomEvent('change-room', { detail: { roomId, roomName } })
    );
  }

  function handleGoHome() {
    setCurrentRoom(null);
    window.dispatchEvent(new CustomEvent('change-room', { detail: null }));
  }

  return (
    <>
      <GameCanvas />
      <HUD roomName={currentRoom?.name} />
      <AgentPanel />
      <RoomBrowser
        currentRoomId={currentRoom?.id}
        onEnterRoom={handleEnterRoom}
        onGoHome={handleGoHome}
      />
      <RoomEditor
        active={editorActive}
        onToggle={() => setEditorActive(!editorActive)}
        onSave={() => setEditorActive(false)}
      />
      <UserMenu onOpenTokens={() => setTokenUsageOpen(true)} />
      <TokenUsage open={tokenUsageOpen} onClose={() => setTokenUsageOpen(false)} />
      <ChatPanel
        agent={chatAgentInfo}
        onClose={() => setChatAgent(null)}
      />
    </>
  );
}
