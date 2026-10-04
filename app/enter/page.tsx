'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';

const ORANGE = '#FF4A1C';

function EnterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState('Проверяю ссылку...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Ссылка недействительна');
      return;
    }
    run();
  }, [token]);

  async function run() {
    try {
      setStatus('Вхожу...');
      const res = await fetch('/api/auth/magic?token=' + encodeURIComponent(token!));
      const data = await res.json();

      if (!res.ok || !data.hashed_token) {
        setError(data.error || 'Ошибка входа');
        return;
      }

      const { error: vErr } = await supabase.auth.verifyOtp({
        token_hash: data.hashed_token,
        type: 'magiclink',
      });

      if (vErr) {
        setError(vErr.message);
        return;
      }

      setStatus('Готово! Открываю кабинет...');
      setTimeout(() => router.push('/cabinet'), 500);
    } catch (e: any) {
      setError(e.message || 'Ошибка');
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="text-xs uppercase tracking-widest mb-6" style={{ color: ORANGE }}>
          Femtech
        </div>

        {!error ? (
          <div>
            <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: '#141414', border: '1px solid ' + ORANGE }}>
              <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: ORANGE }} />
            </div>
            <div className="text-lg font-bold mb-2">{status}</div>
            <div className="text-sm text-white/50">Это займёт пару секунд</div>
          </div>
        ) : (
          <div>
            <div className="text-2xl font-black mb-3" style={{ color: '#ef4444' }}>Ошибка</div>
            <div className="text-sm text-white/60 mb-6">{error}</div>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-2xl font-bold text-white"
              style={{ background: ORANGE }}
            >
              На главную
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Enter() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/50">Загрузка...</div>
      </div>
    }>
      <EnterInner />
    </Suspense>
  );
}