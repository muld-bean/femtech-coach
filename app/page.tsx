'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase';
import { signIn, signUp } from './lib/auth';

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
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (trainer) {
        router.push('/dashboard');
      } else {
        router.push('/cabinet');
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

        if (mode === 'login') {
      const res = await signIn(phone, password);
      if (res.error) { setError(res.error); setLoading(false); return; }
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) { router.push('/'); return; }
      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.user.id)
        .maybeSingle();
      router.push(trainer ? '/dashboard' : '/cabinet');
    } else {
      if (!name) { setError('Введите имя'); setLoading(false); return; }
      const res = await signUp(phone, password, name);
      if (res.error) { setError(res.error); setLoading(false); return; }
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-800 p-5">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-2xl font-bold text-purple-700 text-center mb-2">
          CRM для тренера
        </h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          {mode === 'login' ? 'Вход' : 'Регистрация'}
        </p>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={'flex-1 py-2 rounded-xl font-semibold ' + (mode === 'login' ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600')}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={'flex-1 py-2 rounded-xl font-semibold ' + (mode === 'register' ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600')}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Телефон</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+79991234567"
            className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:outline-none focus:border-purple-700"
            required
          />

          <label className="block text-sm font-semibold text-gray-600 mb-1">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:outline-none focus:border-purple-700"
            required
          />

          {mode === 'register' && (
            <>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Ваше имя</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:outline-none focus:border-purple-700"
              />
            </>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm mb-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-700 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {loading ? 'Подождите...' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>
      </div>
    </div>
  );
}