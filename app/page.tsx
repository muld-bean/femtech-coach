'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase';
import { signIn, signUp } from './lib/auth';

const ORANGE = '#FF4A1C';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (trainer) router.push('/dashboard');
      else router.push('/cabinet');
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'login') {
      const res = await signIn(phone, password);
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/');
        return;
      }
      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      router.push(trainer ? '/dashboard' : '/cabinet');
    } else {
      if (!name) {
        setError('Введите имя');
        setLoading(false);
        return;
      }
      const res = await signUp(phone, password, name);
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="pt-16 pb-8 px-8">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: ORANGE }}>
          FemTech
        </div>
        <div className="text-4xl font-black uppercase tracking-tight leading-none">
          Твоя сила.<br />
          Твоё тело.<br />
          Твой путь.
        </div>
      </div>

      <div className="flex-1 flex items-end">
        <div className="w-full rounded-t-[32px] p-8 pb-10" style={{ background: '#141414', borderTop: '1px solid #262626' }}>
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="flex-1 py-3 rounded-2xl font-bold text-sm"
              style={{
                background: mode === 'login' ? ORANGE : '#0a0a0a',
                color: mode === 'login' ? 'white' : '#666',
              }}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className="flex-1 py-3 rounded-2xl font-bold text-sm"
              style={{
                background: mode === 'register' ? ORANGE : '#0a0a0a',
                color: mode === 'register' ? 'white' : '#666',
              }}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">
              Телефон
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+79991234567"
              className="w-full p-4 rounded-2xl mb-4 text-white text-base"
              style={{ background: '#0a0a0a', border: '1px solid #262626' }}
              required
            />

            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-4 rounded-2xl mb-4 text-white text-base"
              style={{ background: '#0a0a0a', border: '1px solid #262626' }}
              required
            />

            {mode === 'register' && (
              <>
                <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">
                  Ваше имя
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-4 rounded-2xl mb-4 text-white text-base"
                  style={{ background: '#0a0a0a', border: '1px solid #262626' }}
                />
              </>
            )}

            {error && (
              <div className="p-3 rounded-2xl text-sm mb-4" style={{ background: '#ef444422', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-wide text-white disabled:opacity-50"
              style={{ background: ORANGE }}
            >
              {loading ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}