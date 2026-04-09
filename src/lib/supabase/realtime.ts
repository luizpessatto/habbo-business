import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from './client';

interface PresenceState {
  odutId: string;
  agentId: string;
  agentName: string;
  tileX: number;
  tileY: number;
}

/**
 * Subscribe to a room's presence channel.
 * Returns the channel and cleanup function.
 */
export function subscribeToRoom(
  roomId: string,
  userId: string,
  onPresenceSync: (presences: PresenceState[]) => void,
  onAgentMove: (data: { agentId: string; tileX: number; tileY: number }) => void,
  onChatMessage: (data: { agentId: string; message: string }) => void,
): { channel: RealtimeChannel; unsubscribe: () => void } {
  const supabase = createClient();
  const channelName = `room:${roomId}`;

  const channel = supabase.channel(channelName, {
    config: { presence: { key: userId } },
  });

  // Presence: track who's in the room
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState<PresenceState>();
    const allPresences: PresenceState[] = [];
    for (const presences of Object.values(state)) {
      for (const p of presences) {
        allPresences.push(p);
      }
    }
    onPresenceSync(allPresences);
  });

  // Broadcast: agent position updates
  channel.on('broadcast', { event: 'agent-move' }, ({ payload }) => {
    onAgentMove(payload as { agentId: string; tileX: number; tileY: number });
  });

  // Broadcast: chat messages
  channel.on('broadcast', { event: 'chat-message' }, ({ payload }) => {
    onChatMessage(payload as { agentId: string; message: string });
  });

  channel.subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Broadcast an agent's position to all clients in the room.
 */
export function broadcastAgentMove(
  channel: RealtimeChannel,
  agentId: string,
  tileX: number,
  tileY: number,
) {
  channel.send({
    type: 'broadcast',
    event: 'agent-move',
    payload: { agentId, tileX, tileY },
  });
}

/**
 * Broadcast a chat message in the room.
 */
export function broadcastChatMessage(
  channel: RealtimeChannel,
  agentId: string,
  message: string,
) {
  channel.send({
    type: 'broadcast',
    event: 'chat-message',
    payload: { agentId, message },
  });
}
