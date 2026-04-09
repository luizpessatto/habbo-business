'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendMessageToAgent, clearConversation } from '@/app/(game)/actions/chat';
import { X, Send, Trash2, Bot, User, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AgentInfo {
  id: string;
  name: string;
  systemPrompt: string;
  personality: string;
  provider: 'claude' | 'openai';
  model: string;
  status: string;
}

interface ChatPanelProps {
  agent: AgentInfo | null;
  onClose: () => void;
  onAgentReply?: (agentId: string, message: string) => void;
}

export default function ChatPanel({ agent, onClose, onAgentReply }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevAgentId = useRef<string | null>(null);

  // Reset messages when agent changes
  useEffect(() => {
    if (agent && agent.id !== prevAgentId.current) {
      setMessages([]);
      setError('');
      prevAgentId.current = agent.id;
    }
  }, [agent]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (agent) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [agent]);

  if (!agent) return null;

  function handleSend() {
    const text = input.trim();
    if (!text || isPending || !agent) return;

    setError('');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Dispatch user bubble event
    window.dispatchEvent(
      new CustomEvent('chat-bubble', {
        detail: { agentId: agent.id, message: text, sender: 'user' },
      })
    );

    startTransition(async () => {
      const result = await sendMessageToAgent(
        agent.id,
        agent.name,
        agent.systemPrompt,
        agent.personality,
        agent.provider,
        agent.model,
        text
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Dispatch agent reply bubble
      window.dispatchEvent(
        new CustomEvent('chat-bubble', {
          detail: { agentId: agent.id, message: result.reply, sender: 'agent' },
        })
      );

      onAgentReply?.(agent.id, result.reply);
    });
  }

  function handleClear() {
    startTransition(async () => {
      await clearConversation(agent!.id);
      setMessages([]);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg">
      <div className="bg-[#16213e]/95 backdrop-blur-md border border-[#0f3460] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#0f3460]">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-cyan-400" />
            <span className="font-mono text-sm font-bold text-white">{agent.name}</span>
            <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
              {agent.provider === 'claude' ? 'Claude' : 'OpenAI'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              className="p-1 text-white/30 hover:text-white/70 transition-colors"
              title="Limpar conversa"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-white/30 hover:text-white/70 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="h-64 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-white/30 text-xs py-8 font-mono">
              Comece uma conversa com {agent.name}...
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={12} className="text-cyan-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#e94560]/80 text-white rounded-br-sm'
                    : 'bg-white/10 text-white/90 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-[#e94560]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={12} className="text-[#e94560]" />
                </div>
              )}
            </div>
          ))}

          {isPending && (
            <div className="flex gap-2 items-center">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Bot size={12} className="text-cyan-400" />
              </div>
              <div className="bg-white/10 px-3 py-2 rounded-lg rounded-bl-sm">
                <Loader2 size={14} className="text-white/50 animate-spin" />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-3 py-2 rounded text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 px-4 py-3 border-t border-[#0f3460]">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Falar com ${agent.name}...`}
            className="bg-[#1a1a2e] border-[#0f3460] text-white text-sm placeholder:text-white/30 flex-1"
            disabled={isPending}
          />
          <Button
            onClick={handleSend}
            disabled={isPending || !input.trim()}
            size="sm"
            className="bg-[#e94560] hover:bg-[#c73e54] px-3"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
