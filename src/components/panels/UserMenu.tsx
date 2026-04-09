'use client';

import { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, Coins, Link2, Unlink, CheckCircle2, Loader2 } from 'lucide-react';
import { getOpenAIOAuthStatus, disconnectOpenAIOAuth } from '@/app/(game)/actions/oauth';
import type { OAuthStatus } from '@/app/(game)/actions/oauth';

interface UserMenuProps {
  onOpenTokens?: () => void;
}

export default function UserMenu({ onOpenTokens }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  // Check for OAuth callback results in URL (without useSearchParams to avoid Suspense requirement)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('oauth_success');
    const error = params.get('oauth_error');

    if (success === 'openai') {
      setNotification({ type: 'success', message: 'OpenAI connected!' });
      window.history.replaceState({}, '', '/');
      loadOAuthStatus();
    } else if (error) {
      setNotification({ type: 'error', message: `OAuth error: ${error}` });
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(t);
  }, [notification]);

  function loadOAuthStatus() {
    setOauthLoading(true);
    getOpenAIOAuthStatus()
      .then(setOauthStatus)
      .finally(() => setOauthLoading(false));
  }

  // Load OAuth status when menu opens
  useEffect(() => {
    if (open) loadOAuthStatus();
  }, [open]);

  function handleLogout() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    });
  }

  function handleConnectOpenAI() {
    // Redirect to our OAuth initiation endpoint
    window.location.href = '/api/auth/openai';
  }

  function handleDisconnectOpenAI() {
    setOauthLoading(true);
    disconnectOpenAIOAuth().then((result) => {
      if (result.success) {
        setOauthStatus({ connected: false, provider: 'openai-codex', accountId: null, expiresAt: null });
        setNotification({ type: 'success', message: 'OpenAI disconnected' });
      } else {
        setNotification({ type: 'error', message: result.error ?? 'Failed' });
      }
      setOauthLoading(false);
    });
  }

  return (
    <div className="absolute top-4 right-44 z-10">
      {/* Notification toast */}
      {notification && (
        <div
          className={`absolute right-0 -top-12 z-30 px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap ${
            notification.type === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white font-mono text-sm flex items-center gap-2 hover:bg-black/80 transition-colors cursor-pointer"
        >
          <Settings size={16} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-[#16213e] border border-[#0f3460] rounded-lg shadow-xl min-w-[220px] py-1">
              {/* OpenAI OAuth section */}
              <div className="px-3 py-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">OpenAI Account</p>
                {oauthLoading ? (
                  <div className="flex items-center gap-2 text-sm text-white/40 py-1">
                    <Loader2 size={14} className="animate-spin" /> Loading...
                  </div>
                ) : oauthStatus?.connected ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-green-400/80">
                      <CheckCircle2 size={14} />
                      <span>Connected</span>
                    </div>
                    {oauthStatus.accountId && (
                      <p className="text-[10px] text-white/30 truncate pl-5">
                        {oauthStatus.accountId.slice(0, 20)}...
                      </p>
                    )}
                    <button
                      onClick={handleDisconnectOpenAI}
                      className="w-full px-2 py-1 text-left text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded flex items-center gap-2 transition-colors"
                    >
                      <Unlink size={12} /> Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectOpenAI}
                    className="w-full px-2 py-1.5 text-left text-sm text-cyan-400/80 hover:bg-cyan-500/10 hover:text-cyan-400 rounded flex items-center gap-2 transition-colors"
                  >
                    <Link2 size={14} /> Connect ChatGPT
                  </button>
                )}
              </div>

              <div className="h-px bg-[#0f3460] mx-2" />

              <button
                onClick={() => {
                  onOpenTokens?.();
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-[#0f3460] hover:text-white flex items-center gap-2 transition-colors"
              >
                <Coins size={14} /> Token Usage
              </button>
              <div className="h-px bg-[#0f3460] mx-2" />
              <button
                onClick={handleLogout}
                disabled={isPending}
                className="w-full px-3 py-2 text-left text-sm text-red-400/70 hover:bg-red-500/10 hover:text-red-400 flex items-center gap-2 transition-colors"
              >
                <LogOut size={14} /> {isPending ? 'Saindo...' : 'Sair'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
