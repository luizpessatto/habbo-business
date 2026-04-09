'use server';

import { createClient } from '@/lib/supabase/server';
import { createAgentSchema, updateAgentSchema, type CreateAgentInput, type UpdateAgentInput } from '@/types/schemas';
import { revalidatePath } from 'next/cache';

function toSnakeCase(input: CreateAgentInput | UpdateAgentInput) {
  return {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.personality !== undefined && { personality: input.personality }),
    ...(input.systemPrompt !== undefined && { system_prompt: input.systemPrompt }),
    ...(input.avatarConfig !== undefined && {
      avatar_config: {
        hairColor: input.avatarConfig.hairColor,
        skinColor: input.avatarConfig.skinColor,
        shirtColor: input.avatarConfig.shirtColor,
        pantsColor: input.avatarConfig.pantsColor,
      },
    }),
    ...(input.llmProvider !== undefined && { llm_provider: input.llmProvider }),
    ...(input.llmModel !== undefined && { llm_model: input.llmModel }),
    ...(input.capabilities !== undefined && { capabilities: input.capabilities }),
  };
}

export async function createAgent(input: CreateAgentInput) {
  const parsed = createAgentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('agents')
    .insert({ user_id: user.id, ...toSnakeCase(parsed.data) })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/');
  return { data };
}

export async function updateAgent(id: string, input: UpdateAgentInput) {
  const parsed = updateAgentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('agents')
    .update(toSnakeCase(parsed.data))
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/');
  return { data };
}

export async function deleteAgent(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/');
  return { success: true };
}

export async function listAgents() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', data: [] };

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message, data: [] };

  return { data: data ?? [] };
}

export async function toggleAgentStatus(id: string, status: 'online' | 'offline') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('agents')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/');
  return { success: true };
}
