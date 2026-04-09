// === Room Types ===
export interface RoomLayout {
  width: number;
  height: number;
  tiles: number[][]; // 0 = empty, 1 = floor, 2 = wall
}

// === Agent Types ===
export interface AvatarConfig {
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
}

export interface AgentCapabilities {
  autonomousMovement: boolean;
  canInitiateChat: boolean;
  chatFrequency: 'rare' | 'normal' | 'frequent';
}

export type LLMProvider = 'claude' | 'openai';
export type AgentStatus = 'online' | 'offline' | 'busy';

export interface Agent {
  id: string;
  userId: string;
  name: string;
  personality: string;
  systemPrompt: string;
  avatarConfig: AvatarConfig;
  llmProvider: LLMProvider;
  llmModel: string;
  status: AgentStatus;
  capabilities: AgentCapabilities;
  createdAt: string;
  updatedAt: string;
}

// === Position ===
export interface TilePosition {
  x: number;
  y: number;
}

// === Chat Types ===
export type SenderType = 'user' | 'agent';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderType: SenderType;
  senderId: string;
  senderAgentId?: string;
  receiverAgentId?: string;
  content: string;
  createdAt: string;
}
