'use client';

import { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { createAgent, updateAgent, deleteAgent, toggleAgentStatus } from '@/app/(game)/actions/agents';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Pencil, Trash2, Power, PowerOff, Bot } from 'lucide-react';
import type { CreateAgentInput } from '@/types/schemas';

interface AgentRow {
  id: string;
  name: string;
  personality: string;
  system_prompt: string;
  avatar_config: {
    hairColor: string;
    skinColor: string;
    shirtColor: string;
    pantsColor: string;
  };
  llm_provider: 'claude' | 'openai';
  llm_model: string;
  status: 'online' | 'offline' | 'busy';
  capabilities: {
    autonomousMovement: boolean;
    canInitiateChat: boolean;
    chatFrequency: string;
  };
  created_at: string;
}

const LLM_MODELS = {
  claude: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
};

const DEFAULT_FORM: CreateAgentInput = {
  name: '',
  personality: '',
  systemPrompt: 'You are a friendly AI agent in the AI Hotel. Respond naturally and in character.',
  avatarConfig: { hairColor: '#333333', skinColor: '#f5d0a9', shirtColor: '#4a90d9', pantsColor: '#2c3e50' },
  llmProvider: 'claude',
  llmModel: 'claude-sonnet-4-20250514',
  capabilities: { autonomousMovement: true, canInitiateChat: true, chatFrequency: 'normal' },
};

export default function AgentPanel() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAgentInput>(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function loadAgents() {
    const supabase = createClient();
    const { data } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAgents(data);
  }

  useEffect(() => {
    if (open) loadAgents();
  }, [open]);

  function openCreateForm() {
    setEditingAgent(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
    setError('');
  }

  function openEditForm(agent: AgentRow) {
    setEditingAgent(agent);
    setForm({
      name: agent.name,
      personality: agent.personality,
      systemPrompt: agent.system_prompt,
      avatarConfig: agent.avatar_config,
      llmProvider: agent.llm_provider,
      llmModel: agent.llm_model,
      capabilities: agent.capabilities as CreateAgentInput['capabilities'],
    });
    setShowForm(true);
    setError('');
  }

  function handleSubmit() {
    setError('');
    startTransition(async () => {
      const result = editingAgent
        ? await updateAgent(editingAgent.id, form)
        : await createAgent(form);

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
        return;
      }

      setShowForm(false);
      setEditingAgent(null);
      await loadAgents();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAgent(id);
      setDeleteConfirm(null);
      await loadAgents();
    });
  }

  function handleToggleStatus(agent: AgentRow) {
    const newStatus = agent.status === 'online' ? 'offline' : 'online';
    startTransition(async () => {
      await toggleAgentStatus(agent.id, newStatus);
      await loadAgents();
    });
  }

  const statusColor = (s: string) =>
    s === 'online' ? 'bg-green-500' : s === 'busy' ? 'bg-yellow-500' : 'bg-gray-500';

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <div
              role="button"
              tabIndex={0}
              className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white font-mono text-sm flex items-center gap-2 hover:bg-black/80 transition-colors cursor-pointer select-none"
            />
          }
        >
          <Users size={16} />
          Agents ({agents.length})
        </SheetTrigger>
        <SheetContent className="bg-[#16213e] border-[#0f3460] text-white w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white font-mono flex items-center gap-2">
              <Bot size={20} /> AI Agents
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {!showForm && (
              <Button
                onClick={openCreateForm}
                className="w-full bg-[#e94560] hover:bg-[#c73e54]"
              >
                <Plus size={16} className="mr-2" /> Criar Agente
              </Button>
            )}

            {showForm && (
              <div className="bg-[#1a1a2e] rounded-lg p-4 space-y-3">
                <h3 className="font-mono text-sm font-bold">
                  {editingAgent ? 'Editar Agente' : 'Novo Agente'}
                </h3>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-3 py-2 rounded text-xs">
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-white/70 text-xs">Nome</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Claude Assistant"
                    className="bg-[#16213e] border-[#0f3460] text-white text-sm h-8"
                    maxLength={30}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-white/70 text-xs">Personalidade</Label>
                  <Textarea
                    value={form.personality}
                    onChange={(e) => setForm({ ...form, personality: e.target.value })}
                    placeholder="Descreva a personalidade do agente..."
                    className="bg-[#16213e] border-[#0f3460] text-white text-sm min-h-[60px] resize-none"
                    maxLength={500}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-white/70 text-xs">System Prompt</Label>
                  <Textarea
                    value={form.systemPrompt}
                    onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                    className="bg-[#16213e] border-[#0f3460] text-white text-sm min-h-[80px] resize-none"
                    maxLength={2000}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs">Provider</Label>
                    <Select
                      value={form.llmProvider}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          llmProvider: v as 'claude' | 'openai',
                          llmModel: LLM_MODELS[v as 'claude' | 'openai'][0].value,
                        })
                      }
                    >
                      <SelectTrigger className="bg-[#16213e] border-[#0f3460] text-white h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#16213e] border-[#0f3460] text-white">
                        <SelectItem value="claude">Claude</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs">Model</Label>
                    <Select
                      value={form.llmModel}
                      onValueChange={(v) => v && setForm({ ...form, llmModel: v })}
                    >
                      <SelectTrigger className="bg-[#16213e] border-[#0f3460] text-white h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#16213e] border-[#0f3460] text-white">
                        {LLM_MODELS[form.llmProvider].map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-[#0f3460]" />

                {/* Avatar Colors */}
                <div className="space-y-1">
                  <Label className="text-white/70 text-xs">Cores do Avatar</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['hairColor', 'skinColor', 'shirtColor', 'pantsColor'] as const).map((key) => (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <input
                          type="color"
                          value={form.avatarConfig[key]}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              avatarConfig: { ...form.avatarConfig, [key]: e.target.value },
                            })
                          }
                          className="w-8 h-8 rounded cursor-pointer border border-[#0f3460]"
                        />
                        <span className="text-[10px] text-white/40">
                          {key.replace('Color', '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={isPending || !form.name}
                    className="flex-1 bg-[#e94560] hover:bg-[#c73e54] text-sm h-8"
                  >
                    {isPending ? 'Salvando...' : editingAgent ? 'Salvar' : 'Criar'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingAgent(null);
                    }}
                    className="border-[#0f3460] text-white/70 hover:bg-[#0f3460] text-sm h-8"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <Separator className="bg-[#0f3460]" />

            {/* Agent List */}
            {agents.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">
                Nenhum agente criado ainda.
                <br />
                Clique em &quot;Criar Agente&quot; para comecar!
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-[#1a1a2e] rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusColor(agent.status)}`} />
                      <span className="font-mono text-sm font-bold">{agent.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] border-[#0f3460] text-white/50">
                        {agent.llm_provider === 'claude' ? 'Claude' : 'OpenAI'}
                      </Badge>
                    </div>
                  </div>

                  {agent.personality && (
                    <p className="text-xs text-white/40 line-clamp-2">{agent.personality}</p>
                  )}

                  {/* Avatar color preview */}
                  <div className="flex gap-1">
                    {Object.values(agent.avatar_config).map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-sm border border-white/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div className="flex gap-1 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStatus(agent)}
                      className="h-7 px-2 text-xs text-white/60 hover:text-white hover:bg-[#0f3460]"
                    >
                      {agent.status === 'online' ? (
                        <><PowerOff size={12} className="mr-1" /> Off</>
                      ) : (
                        <><Power size={12} className="mr-1" /> On</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditForm(agent)}
                      className="h-7 px-2 text-xs text-white/60 hover:text-white hover:bg-[#0f3460]"
                    >
                      <Pencil size={12} className="mr-1" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(agent.id)}
                      className="h-7 px-2 text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={12} className="mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader>
            <DialogTitle>Excluir Agente</DialogTitle>
            <DialogDescription className="text-white/50">
              Tem certeza que deseja excluir este agente? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-[#0f3460] text-white/70"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
              disabled={isPending}
            >
              {isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
