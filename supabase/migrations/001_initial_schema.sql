-- AI Hotel - Initial Database Schema
-- Run this in your Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  personality TEXT DEFAULT '',
  system_prompt TEXT DEFAULT 'You are a friendly AI agent in the AI Hotel.',
  avatar_config JSONB DEFAULT '{"hairColor":"#333333","skinColor":"#f5d0a9","shirtColor":"#4a90d9","pantsColor":"#2c3e50"}',
  llm_provider TEXT DEFAULT 'claude' CHECK (llm_provider IN ('claude', 'openai')),
  llm_model TEXT DEFAULT 'claude-sonnet-4-20250514',
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy')),
  capabilities JSONB DEFAULT '{"autonomousMovement":true,"canInitiateChat":true,"chatFrequency":"normal"}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  room_type TEXT DEFAULT 'private' CHECK (room_type IN ('private', 'public')),
  layout JSONB NOT NULL DEFAULT '[]',
  width INT DEFAULT 12,
  height INT DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Room-Agent placement
CREATE TABLE room_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  position_x INT NOT NULL DEFAULT 5,
  position_y INT NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(room_id, agent_id)
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent')),
  sender_id UUID NOT NULL,
  sender_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  receiver_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation context for LLM
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('user', 'agent')),
  partner_id UUID NOT NULL,
  messages_json JSONB DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, partner_type, partner_id)
);

-- Room furniture
CREATE TABLE room_furniture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  furniture_type TEXT NOT NULL,
  position_x INT NOT NULL,
  position_y INT NOT NULL,
  rotation INT DEFAULT 0,
  properties JSONB DEFAULT '{}'
);

-- Token usage tracking
CREATE TABLE token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_rooms_owner ON rooms(owner_id);
CREATE INDEX idx_room_agents_room ON room_agents(room_id);
CREATE INDEX idx_room_agents_agent ON room_agents(agent_id);
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX idx_token_usage_user ON token_usage(user_id);

-- Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_furniture ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- Agents: users manage their own
CREATE POLICY "Users manage own agents" ON agents
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Rooms: users manage own, read public
CREATE POLICY "Users manage own rooms" ON rooms
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Anyone reads public rooms" ON rooms
  FOR SELECT USING (room_type = 'public');

-- Room agents: manage in own rooms, read in public rooms
CREATE POLICY "Manage agents in own rooms" ON room_agents
  FOR ALL USING (
    room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid())
  );

CREATE POLICY "Read agents in public rooms" ON room_agents
  FOR SELECT USING (
    room_id IN (SELECT id FROM rooms WHERE room_type = 'public')
  );

-- Chat messages: read in accessible rooms
CREATE POLICY "Read messages in accessible rooms" ON chat_messages
  FOR SELECT USING (
    room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid() OR room_type = 'public')
  );

CREATE POLICY "Insert messages in accessible rooms" ON chat_messages
  FOR INSERT WITH CHECK (
    room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid() OR room_type = 'public')
  );

-- Agent conversations: manage own agents' conversations
CREATE POLICY "Manage own agent conversations" ON agent_conversations
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

-- Room furniture: manage in own rooms
CREATE POLICY "Manage furniture in own rooms" ON room_furniture
  FOR ALL USING (
    room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid())
  );

CREATE POLICY "Read furniture in public rooms" ON room_furniture
  FOR SELECT USING (
    room_id IN (SELECT id FROM rooms WHERE room_type = 'public')
  );

-- Token usage: users see own usage
CREATE POLICY "Users see own token usage" ON token_usage
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for chat_messages and room_agents
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_agents;
