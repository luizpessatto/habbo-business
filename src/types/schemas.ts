import { z } from 'zod';

export const avatarConfigSchema = z.object({
  hairColor: z.string().default('#333333'),
  skinColor: z.string().default('#f5d0a9'),
  shirtColor: z.string().default('#4a90d9'),
  pantsColor: z.string().default('#2c3e50'),
});

export const agentCapabilitiesSchema = z.object({
  autonomousMovement: z.boolean().default(true),
  canInitiateChat: z.boolean().default(true),
  chatFrequency: z.enum(['rare', 'normal', 'frequent']).default('normal'),
});

export const createAgentSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio').max(30, 'Maximo 30 caracteres'),
  personality: z.string().max(500, 'Maximo 500 caracteres').default(''),
  systemPrompt: z.string().max(2000, 'Maximo 2000 caracteres').default('You are a friendly AI agent in the AI Hotel.'),
  avatarConfig: avatarConfigSchema.default({
    hairColor: '#333333',
    skinColor: '#f5d0a9',
    shirtColor: '#4a90d9',
    pantsColor: '#2c3e50',
  }),
  llmProvider: z.enum(['claude', 'openai']).default('claude'),
  llmModel: z.string().default('claude-sonnet-4-20250514'),
  capabilities: agentCapabilitiesSchema.default({
    autonomousMovement: true,
    canInitiateChat: true,
    chatFrequency: 'normal',
  }),
});

export const updateAgentSchema = createAgentSchema.partial();

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type AvatarConfig = z.infer<typeof avatarConfigSchema>;
export type AgentCapabilities = z.infer<typeof agentCapabilitiesSchema>;
