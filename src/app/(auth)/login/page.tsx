'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e] p-4">
      <Card className="w-full max-w-md bg-[#16213e] border-[#0f3460] text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-mono tracking-wider">AI HOTEL</CardTitle>
          <CardDescription className="text-white/50">
            Entre na sua conta para acessar seus agentes
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="bg-[#1a1a2e] border-[#0f3460] text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                className="bg-[#1a1a2e] border-[#0f3460] text-white placeholder:text-white/30"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full bg-[#e94560] hover:bg-[#c73e54] text-white"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <p className="text-sm text-white/50">
              Nao tem conta?{' '}
              <Link href="/signup" className="text-[#e94560] hover:underline">
                Criar conta
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
