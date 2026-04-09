'use client';

import { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Coins, Zap } from 'lucide-react';

interface TokenUsageProps {
  open: boolean;
  onClose: () => void;
}

interface UsageSummary {
  provider: string;
  model: string;
  totalPrompt: number;
  totalCompletion: number;
  count: number;
}

// Rough cost estimates per 1M tokens
const COST_PER_1M: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates = COST_PER_1M[model] ?? { input: 1, output: 5 };
  return (promptTokens * rates.input + completionTokens * rates.output) / 1_000_000;
}

export default function TokenUsage({ open, onClose }: TokenUsageProps) {
  const [usage, setUsage] = useState<UsageSummary[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('token_usage')
          .select('provider, model, prompt_tokens, completion_tokens')
          .order('created_at', { ascending: false })
          .limit(500);

        if (!data || data.length === 0) {
          setUsage([]);
          return;
        }

        // Aggregate by model
        const agg = new Map<string, UsageSummary>();
        for (const row of data) {
          const key = `${row.provider}:${row.model}`;
          const existing = agg.get(key) ?? {
            provider: row.provider,
            model: row.model,
            totalPrompt: 0,
            totalCompletion: 0,
            count: 0,
          };
          existing.totalPrompt += row.prompt_tokens;
          existing.totalCompletion += row.completion_tokens;
          existing.count++;
          agg.set(key, existing);
        }

        setUsage(Array.from(agg.values()));
      } catch {
        setUsage([]);
      }
    });
  }, [open]);

  const totalCost = usage.reduce(
    (sum, u) => sum + estimateCost(u.model, u.totalPrompt, u.totalCompletion),
    0
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#16213e] border-[#0f3460] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2 text-white">
            <Coins size={18} className="text-yellow-400" /> Token Usage
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {isPending ? (
            <p className="text-white/40 text-sm text-center py-4">Carregando...</p>
          ) : usage.length === 0 ? (
            <div className="text-center py-6">
              <Zap size={24} className="mx-auto text-white/20 mb-2" />
              <p className="text-white/40 text-sm">Nenhum uso registrado ainda.</p>
              <p className="text-white/30 text-xs mt-1">
                Configure as API keys e converse com agentes.
              </p>
            </div>
          ) : (
            <>
              {usage.map((u) => {
                const cost = estimateCost(u.model, u.totalPrompt, u.totalCompletion);
                return (
                  <div
                    key={`${u.provider}:${u.model}`}
                    className="bg-[#1a1a2e] rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-[#0f3460] text-white/50">
                          {u.provider}
                        </Badge>
                        <span className="font-mono text-xs text-white/80">{u.model}</span>
                      </div>
                      <span className="text-xs text-green-400/80">
                        ~${cost.toFixed(4)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-white/40">
                      <div>
                        <span className="block text-white/60">{u.totalPrompt.toLocaleString()}</span>
                        input tokens
                      </div>
                      <div>
                        <span className="block text-white/60">{u.totalCompletion.toLocaleString()}</span>
                        output tokens
                      </div>
                      <div>
                        <span className="block text-white/60">{u.count}</span>
                        requests
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2 border-t border-[#0f3460]">
                <span className="text-xs text-white/50">Custo estimado total</span>
                <span className="font-mono text-sm text-green-400">
                  ~${totalCost.toFixed(4)}
                </span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
