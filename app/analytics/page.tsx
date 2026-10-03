'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getTrainer } from '../lib/auth';
import TabBar from '../lib/TabBar';
import { AnalyticsSkeleton } from '../lib/Skeleton';
const ORANGE = '#FF4A1C';
export default function Analytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const t = await getTrainer();
    if (!t) { router.push('/'); return; }

    const { data: p } = await supabase
      .from('payments')
      .select('*, clients(name)')
      .eq('trainer_id', t.id)
      .order('date');

    const { data: c } = await supabase
      .from('clients')
      .select('*')
      .eq('trainer_id', t.id);

    const { data: s } = await supabase
      .from('schedule')
      .select('*')
      .eq('trainer_id', t.id)
      .gte('date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);

    setPayments(p || []);
    setClients(c || []);
    setSchedule(s || []);
    setLoading(false);
  }

if (loading) return <AnalyticsSkeleton />;

  // === ВЫРУЧКА ПО МЕСЯЦАМ ===
  const monthMap: Record<string, number> = {};
  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    monthMap[key] = 0;
  }

  payments.forEach(p => {
    if (!p.date) return;
    const key = String(p.date).slice(0, 7);
    if (key in monthMap) monthMap[key] += p.amount || 0;
  });

  const monthBars = Object.entries(monthMap).map(([key, val]) => ({
    label: monthNames[parseInt(key.slice(5, 7)) - 1],
    value: val,
  }));
  const maxMonthRevenue = Math.max(...monthBars.map(m => m.value), 1);

  // === LTV ПО КЛИЕНТУ ===
  const ltvMap: Record<string, number> = {};
  payments.forEach(p => {
    const name = p.clients?.name || 'Unknown';
    ltvMap[name] = (ltvMap[name] || 0) + (p.amount || 0);
  });

  const top5 = Object.entries(ltvMap)
    .map(([name, sum]) => ({ name, sum }))
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 5);

  // === СРЕДНИЙ ЧЕК ===
  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const avgCheck = payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0;

  // === RETENTION ===
  // % клиентов, у которых есть платёж за последние 90 дней или активный остаток
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
  const activeClients = clients.filter(c => {
    const hasRecentPayment = payments.some(p =>
      p.clients?.name === c.name && p.date >= ninetyDaysAgo
    );
    return c.rest > 0 || hasRecentPayment;
  });
  const retention = clients.length > 0
    ? Math.round(activeClients.length / clients.length * 100)
    : 0;

  // === ПРОГНОЗ ===
  const forecast = avgCheck * activeClients.length;

  // === СРЕДНИЙ LTV ===
  const avgLTV = Object.values(ltvMap).length > 0
    ? Math.round(Object.values(ltvMap).reduce((s, v) => s + v, 0) / Object.values(ltvMap).length)
    : 0;

  // === ВСЕГО ТРЕНИРОВОК ===
  const totalTrainings = schedule.filter(s => s.status === 'проведено').length;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="px-6 pt-8 pb-4">
        <div className="text-sm text-white/50">Аналитика</div>
        <div className="text-3xl font-black uppercase tracking-tight mt-1">Мой бизнес</div>
      </div>

      <div className="px-5 space-y-4">
        {/* TOP METRICS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Всего</div>
            <div className="text-2xl font-black" style={{ color: ORANGE }}>
              {totalRevenue.toLocaleString('ru-RU')}
            </div>
            <div className="text-xs text-white/50 mt-1">рублей</div>
          </div>
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Средний чек</div>
            <div className="text-2xl font-black" style={{ color: ORANGE }}>
              {avgCheck.toLocaleString('ru-RU')}
            </div>
            <div className="text-xs text-white/50 mt-1">рублей</div>
          </div>
        </div>

        {/* CHART: REVENUE BY MONTH */}
        <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
          <div className="text-[10px] uppercase tracking-widest text-white/50 mb-4">Выручка за 6 месяцев</div>
          <div className="flex items-end justify-between gap-2 h-40">
            {monthBars.map((m, i) => {
              const h = Math.round(m.value / maxMonthRevenue * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="text-[10px] text-white/50 mb-1">
                    {m.value > 0 ? Math.round(m.value / 1000) + 'к' : ''}
                  </div>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: Math.max(h, 2) + '%',
                      background: m.value > 0 ? ORANGE : '#262626',
                      minHeight: m.value > 0 ? 8 : 2,
                    }}
                  />
                  <div className="text-[10px] text-white/40 mt-2">{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIVE / RETENTION */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Активных</div>
            <div className="text-3xl font-black">{activeClients.length}</div>
            <div className="text-xs text-white/50 mt-1">из {clients.length}</div>
          </div>
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Retention</div>
            <div className="text-3xl font-black" style={{ color: retention >= 60 ? '#4ade80' : retention >= 30 ? '#fbbf24' : '#ef4444' }}>
              {retention}%
            </div>
            <div className="text-xs text-white/50 mt-1">остаются</div>
          </div>
        </div>

        {/* FORECAST */}
        <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid ' + ORANGE + '44' }}>
          <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">
            Прогноз след. месяц
          </div>
          <div className="text-3xl font-black" style={{ color: ORANGE }}>
            {forecast.toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-xs text-white/50 mt-1">
            если все {activeClients.length} активных продлятся
          </div>
        </div>

        {/* EXTRA STATS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Средний LTV</div>
            <div className="text-xl font-black">{avgLTV.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Тренировок (90д)</div>
            <div className="text-xl font-black">{totalTrainings}</div>
          </div>
        </div>

        {/* TOP 5 */}
        <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
          <div className="text-[10px] uppercase tracking-widest text-white/50 mb-4">Топ-5 клиентов</div>
          {top5.length === 0 && (
            <div className="text-white/40 text-sm text-center py-4">Пока нет данных</div>
          )}
          {top5.map((c, i) => {
            const pct = top5[0].sum > 0 ? Math.round(c.sum / top5[0].sum * 100) : 0;
            return (
              <div key={c.name} className="mb-3 last:mb-0">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black" style={{ color: ORANGE }}>#{i + 1}</span>
                    <span className="text-sm font-semibold">{c.name}</span>
                  </div>
                  <span className="text-sm font-bold">{c.sum.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: '#262626' }}>
                  <div className="h-1 rounded-full" style={{ width: pct + '%', background: ORANGE }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TabBar />
    </div>
  );
}