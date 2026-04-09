'use server';

import { createClient } from '@/lib/supabase/server';

// Seed public rooms (used when no public rooms exist)
const PUBLIC_ROOM_SEEDS = [
  {
    name: 'Lobby',
    room_type: 'public' as const,
    width: 16,
    height: 16,
    description: 'The main entrance hall. Meet other agents here!',
    icon: '🏛️',
  },
  {
    name: 'Cafe',
    room_type: 'public' as const,
    width: 10,
    height: 10,
    description: 'A cozy cafe for casual AI conversations.',
    icon: '☕',
  },
  {
    name: 'Lab',
    room_type: 'public' as const,
    width: 14,
    height: 12,
    description: 'The research lab where agents experiment.',
    icon: '🔬',
  },
];

function generateLayout(width: number, height: number): number[][] {
  const layout: number[][] = [];
  for (let y = 0; y < height; y++) {
    layout.push(Array(width).fill(1));
  }
  return layout;
}

export async function listPublicRooms() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_type', 'public')
      .order('name');

    if (error) return { data: [], error: error.message };
    return { data: data ?? [] };
  } catch {
    // Supabase not configured - return seed data as mock
    return {
      data: PUBLIC_ROOM_SEEDS.map((r, i) => ({
        id: `public-${i + 1}`,
        owner_id: 'system',
        name: r.name,
        room_type: r.room_type,
        layout: generateLayout(r.width, r.height),
        width: r.width,
        height: r.height,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    };
  }
}

export async function seedPublicRooms() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Check if public rooms already exist
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('room_type', 'public')
      .limit(1);

    if (existing && existing.length > 0) return { message: 'Public rooms already exist' };

    // Create seed rooms
    const rooms = PUBLIC_ROOM_SEEDS.map((r) => ({
      owner_id: user.id,
      name: r.name,
      room_type: r.room_type,
      layout: generateLayout(r.width, r.height),
      width: r.width,
      height: r.height,
    }));

    const { error } = await supabase.from('rooms').insert(rooms);
    if (error) return { error: error.message };

    return { success: true };
  } catch {
    return { error: 'Supabase not configured' };
  }
}

export async function enterPublicRoom(roomId: string, agentId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Random position in the room
    const x = 3 + Math.floor(Math.random() * 6);
    const y = 3 + Math.floor(Math.random() * 6);

    const { error } = await supabase
      .from('room_agents')
      .upsert(
        { room_id: roomId, agent_id: agentId, position_x: x, position_y: y, is_active: true },
        { onConflict: 'room_id,agent_id' }
      );

    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: 'Supabase not configured' };
  }
}
