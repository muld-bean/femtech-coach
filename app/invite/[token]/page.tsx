'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getInvite, registerClientByInvite } from '../../lib/auth';
export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkInvite();
  }, [token]);

  async function checkInvite() {
    const inv = await getInvite(token);
    if (!inv) {
      setError('Ссылка не найдена');
    } else if (inv.status !== 'активна') {
      setError('Ссылка уже использована');
    } else {
      setInvite(inv);
    }
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!name.trim()) { setError('Введите имя'); setSubmitting(false); return; }

    const res = await registerClientByInvite(token, phone, password, name, gender);
    if (res.error) { setError(res.error); setSubmitting(false); return; }

    router.push('/cabinet');
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-800 p-5">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md text-center">
          <div className="text-2xl font-bold text-red-600 mb-3">Ошибка</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-800 p-5">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-2xl font-bold text-purple-700 text-center mb-2">
          Приглашение
        </h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Тренер: {invite.trainers?.name || '—'}
        </p>

        <form onSubmit={handleRegister}>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Ваше имя</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:outline-none focus:border-purple-700"
            required
          />

          <label className="block text-sm font-semibold text-gray-600 mb-1">Ваш пол</label>
<select
  value={gender}
  onChange={e => setGender(e.target.value as 'female' | 'male')}
  className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:outline-none focus:border-purple-700"
>
  <option value="female">Женский</option>
  <option value="male">Мужской</option>
</select>

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

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm mb-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-purple-700 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {submitting ? 'Создаём...' : 'Создать аккаунт'}
          </button>
        </form>
      </div>
    </div>
  );
}