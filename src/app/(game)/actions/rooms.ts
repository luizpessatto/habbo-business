'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function generateDefaultLayout(width: number, height: number): number[][] {
  const layout: number[][] = [];
  for (let y = 0; y < height; y++) {
    layout.push(Array(width).fill(1));
  }
  return layout;
}

export async function getOrCreateRoom() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', data: null };

  // Try to find existing private room
  const { data: existing } = await supabase
    .from('rooms')
    .select('*')
    .eq('owner_id', user.id)
    .eq('room_type', 'private')
    .limit(1)
    .single();

  if (existing) return { data: existing };

  // Create default room
  const layout = generateDefaultLayout(12, 12);
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      owner_id: user.id,
      name: 'My Room',
      room_type: 'private',
      layout,
      width: 12,
      height: 12,
    })
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { data };
}

export async function getRoom(roomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error) return { error: error.message, data: null };
  return { data };
}

export async function placeAgentInRoom(agentId: string, roomId: string, x: number, y: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Verify agent belongs to user
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('id', agentId)
    .eq('user_id', user.id)
    .single();

  if (!agent) return { error: 'Agent not found' };

  const { error } = await supabase
    .from('room_agents')
    .upsert(
      { room_id: roomId, agent_id: agentId, position_x: x, position_y: y, is_active: true },
      { onConflict: 'room_id,agent_id' }
    );

  if (error) return { error: error.message };

  revalidatePath('/');
  return { success: true };
}

export async function getRoomAgents(roomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('room_agents')
    .select('*, agents(*)')
    .eq('room_id', roomId)
    .eq('is_active', true);

  if (error) return { error: error.message, data: [] };
  return { data: data ?? [] };
}

export async function updateAgentPosition(agentId: string, roomId: string, x: number, y: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('room_agents')
    .update({ position_x: x, position_y: y })
    .eq('agent_id', agentId)
    .eq('room_id', roomId);

  if (error) return { error: error.message };
  return { success: true };
}
