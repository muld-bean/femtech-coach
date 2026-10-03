'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getClientByUser, signOut } from '../lib/auth';
import { useRealtime } from '../lib/useRealtime';
import WeightChart from '../lib/WeightChart';
import { getLevel, getNextLevel, getProgressPercent, getAchievements, calculateStreak } from '../lib/Achievements';

type Tab = 'home' | 'schedule' | 'subscription' | 'progress';

type Widgets = {
  program: boolean;
  schedule: boolean;
  cycle: boolean;
  rest: boolean;
  goal: boolean;
  journey: boolean;
};

const DEFAULT_WIDGETS: Widgets = {
  program: true,
  schedule: true,
  cycle: true,
  rest: true,
  goal: true,
  journey: true,
};

const WIDGET_NAMES: { key: keyof Widgets; label: string }[] = [
  { key: 'program', label: 'Программа на день' },
  { key: 'schedule', label: 'Тренировки на сегодня' },
  { key: 'cycle', label: 'Мой цикл' },
  { key: 'rest', label: 'Остаток занятий' },
  { key: 'goal', label: 'Моя цель' },
  { key: 'journey', label: 'Мой путь' },
];

const ORANGE = '#FF4A1C';

function phaseInfo(day: number) {
  if (day >= 1 && day <= 5) return { color: '#FF4A1C', phase: 'Менструальная', advice: 'Побереги себя. Снижаем нагрузку на 30%.' };
  if (day >= 6 && day <= 13) return { color: '#4ade80', phase: 'Фолликулярная', advice: 'Ты в пике. Грузимся и кайфуем.' };
  if (day >= 14 && day <= 16) return { color: '#fbbf24', phase: 'Овуляция', advice: 'Сила на максимуме. Связки — нежные.' };
  if (day >= 17 && day <= 23) return { color: '#4ade80', phase: 'Ранняя лютеиновая', advice: 'Обычный режим, слушаем тело.' };
  if (day >= 24) return { color: '#FF4A1C', phase: 'Поздняя лютеиновая', advice: 'Организм просит мягкости. Снижаем нагрузку.' };
  return { color: '#737373', phase: '—', advice: '' };
}

function todayKey() {
  const d = new Date();
  const p = (n: number) => (n < 10 ? '0' + n : n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function fmtDate(iso: string) {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return parts[2] + '.' + parts[1] + '.' + parts[0];
}

function daysLeft(endIso: string) {
  if (!endIso) return null;
  const d = new Date(endIso);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - t.getTime()) / 86400000);
}

function getGreeting(name: string) {
  const h = new Date().getHours();
  const first = name.split(' ')[0] || name;
  if (h < 5) return 'Доброй ночи, ' + first;
  if (h < 12) return 'Доброе утро, ' + first;
  if (h < 18) return 'Добрый день, ' + first;
  return 'Добрый вечер, ' + first;
}

export default function Cabinet() {
  const router = useRouter();

  const [client, setClient] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [program, setProgram] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [cycle, setCycle] = useState<any>(null);
  const [cycleDay, setCycleDay] = useState(0);
  const [phase, setPhase] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<Tab>('home');
  const [widgets, setWidgets] = useState<Widgets>(DEFAULT_WIDGETS);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cabinet_widgets');
      if (saved) setWidgets({ ...DEFAULT_WIDGETS, ...JSON.parse(saved) });
    } catch {}
    load();
  }, []);

  // Периодическое обновление (polling)
  useRealtime(['schedule', 'shifts', 'requests', 'cycles', 'clients'], load);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function toggleWidget(key: keyof Widgets) {
    const next = { ...widgets, [key]: !widgets[key] };
    setWidgets(next);
    try { localStorage.setItem('cabinet_widgets', JSON.stringify(next)); } catch {}
  }

  async function load() {
    const c = await getClientByUser();
    if (!c) { router.push('/'); return; }
    setClient(c);

    // Загружаем ВСЕ тренировки (прошлые + будущие)
    const { data: s } = await supabase
      .from('schedule')
      .select('*')
      .eq('client_id', c.id)
      .order('date');
    setSchedule(s || []);

    const { data: p } = await supabase
      .from('program_items')
      .select('*')
      .eq('client_id', c.id)
      .order('day').order('ord');
    setProgram(p || []);

    const { data: sh } = await supabase
      .from('shifts')
      .select('*')
      .eq('trainer_id', c.trainer_id)
      .gte('date', todayKey())
      .order('date')
      .limit(20);
    setShifts(sh || []);

    const { data: rq } = await supabase
      .from('requests')
      .select('*')
      .eq('client_id', c.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setMyRequests(rq || []);

    const { data: m } = await supabase
      .from('measurements')
      .select('*')
      .eq('client_id', c.id)
      .order('date', { ascending: false });
    setMeasurements(m || []);

    const { data: cyc } = await supabase
      .from('cycles')
      .select('*')
      .eq('client_id', c.id)
      .order('start_date', { ascending: false });
    const active = (cyc || []).find((x: any) => !x.end_date);
    setCycle(active || null);
    if (active) {
      const start = new Date(active.start_date);
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      let d = Math.floor((t.getTime() - start.getTime()) / 86400000) + 1;
      if (d < 1) d = 1;
      setCycleDay(d);
      setPhase(phaseInfo(d));
    }

    setLoading(false);
  }

  async function requestShift(shift: any) {
    if (!client) return;
    const time = prompt('Во сколько хочешь заниматься?', shift.start_time);
    if (!time) return;
    const { error } = await supabase.from('requests').insert({
      trainer_id: client.trainer_id,
      client_id: client.id,
      date: shift.date,
      time,
      status: 'новая',
    });
    if (error) { showToast('Ошибка: ' + error.message); return; }
    showToast('Тренер получил твой запрос 💪');
    load();
  }

  async function markCycleStart() {
    if (!client) return;
    if (!confirm('Отметить начало цикла сегодня?')) return;
    if (cycle) {
      await supabase.from('cycles').update({
        end_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      }).eq('id', cycle.id);
    }
    await supabase.from('cycles').insert({
      client_id: client.id,
      start_date: todayKey(),
      last_day: 1,
    });
    showToast('Отмечено. Береги себя 🤍');
    load();
  }

  async function markCycleDay() {
    if (!client) return;
    const v = prompt('Какой сегодня день цикла?', '');
    if (!v) return;
    const n = parseInt(v);
    if (!n || n < 1 || n > 60) { showToast('Введи от 1 до 60'); return; }
    if (cycle) {
      await supabase.from('cycles').update({
        end_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      }).eq('id', cycle.id);
    }
    const start = new Date();
    start.setDate(start.getDate() - (n - 1));
    await supabase.from('cycles').insert({
      client_id: client.id,
      start_date: start.toISOString().split('T')[0],
      last_day: n,
    });
    showToast('День ' + n + '. Учту в нагрузке 💛');
    load();
  }

  async function markCycleMiss() {
    if (!cycle) { showToast('Нет активного цикла'); return; }
    if (!confirm('Отметить сбой?')) return;
    await supabase.from('cycles').update({ end_date: todayKey() }).eq('id', cycle.id);
    showToast('Понял. Восстанавливаемся 🌸');
    load();
  }

function openTelegramLink() {
  if (!client) return;
  // Замени username на свой из BotFather
  const botUsername = 'MyTrainerHelperBot';
  const url = `https://t.me/${botUsername}?start=c_${client.id}`;
  window.open(url, '_blank');
}

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50">Загрузка...</div>
      </div>
    );
  }
  if (!client) return null;

  const today = todayKey();
  const todaySchedule = schedule.filter(s => s.date === today);
  const futureSchedule = schedule.filter(s => s.date >= today);
  const todayShifts = shifts.filter(s => s.date === today);
  const nextTraining = futureSchedule[0];
  const restLeft = client.rest || 0;
  const dl = daysLeft(client.end_date);
  const goalV = parseFloat((client.goal1_value || '').replace(/[^\d.]/g, '')) || 0;
  const goalC = parseFloat((client.goal1_current || '').replace(/[^\d.]/g, '')) || 0;
  const goalPct = goalV > 0 ? Math.min(100, Math.round(goalC / goalV * 100)) : 0;

  return (
    <div className="min-h-screen bg-black text-white pb-28" style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>

      {/* HEADER */}
      <div className="px-6 pt-8 pb-4 flex items-start justify-between">
        <div>
          <div className="text-sm text-white/50">{getGreeting(client.name)}</div>
          <div className="text-3xl font-black mt-1 uppercase tracking-tight">
            {client.name.split(' ')[0]}
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ background: '#141414', border: '1px solid #262626' }}
        >
          ⚙
        </button>
      </div>

      {/* TAB: HOME */}
      {tab === 'home' && (
        <div className="px-5 space-y-4">

          {/* HERO */}
          <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #141414 0%, #1a1a1a 100%)', border: '1px solid #262626' }}>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: ORANGE }}>FemTech</div>
            <div className="text-2xl font-black uppercase tracking-tight leading-tight">
              Твоя сила.<br />Твоё тело.<br />Твой путь.
            </div>
            {nextTraining && (
              <div className="mt-4 text-sm text-white/60">
                Следующая тренировка: <b className="text-white">{fmtDate(nextTraining.date)} · {nextTraining.time}</b>
              </div>
            )}
          </div>

          {/* REST COUNTER */}
          {widgets.rest && (
            <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-widest text-white/50">Остаток занятий</div>
                <div className="text-xs" style={{ color: ORANGE }}>{client.format || '—'}</div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-5xl font-black" style={{ color: ORANGE }}>{restLeft}</div>
                <div className="text-white/50 text-sm">занятий</div>
              </div>
              {dl !== null && (
                <div className="mt-2 text-xs text-white/50">
                  {dl > 0 ? 'Действует ещё ' + dl + ' дн.' : dl === 0 ? 'Истекает сегодня' : 'Истёк ' + Math.abs(dl) + ' дн. назад'}
                </div>
              )}
            </div>
          )}

          {/* МОЙ ПУТЬ — УРОВЕНЬ И ДОСТИЖЕНИЯ */}
          {widgets.journey && (() => {
            const trainingsCount = schedule.filter((s: any) => s.status === 'проведено').length;
            const level = getLevel(trainingsCount);
            const nextLevel = getNextLevel(trainingsCount);
            const progress = getProgressPercent(trainingsCount);
            const streak = calculateStreak(schedule);
            const achievements = getAchievements({
             trainings: trainingsCount,
             hasMeasurements: measurements.length > 0,
             hasGoal: !!client.goal1,
             hasCycle: !!cycle,
             hasStreakMonth: streak >= 4,
            });
            const unlockedCount = achievements.filter(a => a.unlocked).length;

            return (
              <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs uppercase tracking-widest text-white/50">Мой путь</div>
                  <div className="text-xs" style={{ color: level.color }}>{unlockedCount}/{achievements.length} 🏅</div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-[10px] font-black uppercase text-center leading-tight"
                    style={{ background: level.color + '22', border: '2px solid ' + level.color, color: level.color }}>
                    {level.name}
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-black" style={{ color: level.color }}>{level.name}</div>
                    <div className="text-xs text-white/50">
                      {trainingsCount} {trainingsCount === 1 ? 'тренировка' : trainingsCount < 5 ? 'тренировки' : 'тренировок'}
                    </div>
                  </div>
                </div>
                {streak > 0 && (
  <div className="mb-3 px-3 py-2 rounded-xl flex items-center justify-between" style={{ background: '#fbbf2422' }}>
    <span className="text-xs text-white/70">Серия без пропусков</span>
    <span className="text-sm font-black" style={{ color: '#fbbf24' }}>
      🔥 {streak} {streak === 1 ? 'неделя' : streak < 5 ? 'недели' : 'недель'}
    </span>
  </div>
)}

                {nextLevel && (
                  <>
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                      <span>До {nextLevel.name}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: '#262626' }}>
                      <div className="h-2 rounded-full transition-all" style={{ width: progress + '%', background: level.color }} />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {achievements.map(a => (
                    <div
                      key={a.id}
                      className="flex flex-col items-center justify-center p-2 rounded-2xl text-center"
                      style={{
                        background: a.unlocked ? '#1a1a1a' : '#0a0a0a',
                        border: '1px solid ' + (a.unlocked ? '#262626' : '#1a1a1a'),
                        opacity: a.unlocked ? 1 : 0.35,
                      }}
                      title={a.description}
                    >
                      <div className="text-2xl mb-1" style={{ filter: a.unlocked ? 'none' : 'grayscale(100%)' }}>
                        {a.icon}
                      </div>
                      <div className="text-[8px] uppercase tracking-wide text-white/60 leading-tight">
                        {a.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {!client.telegram_chat_id && (
  <button
    onClick={openTelegramLink}
    className="w-full rounded-3xl p-5 text-left"
    style={{ background: ORANGE, color: 'white' }}
  >
    <div className="text-xs uppercase tracking-widest opacity-80 mb-1">Подключить Telegram</div>
    <div className="text-lg font-black">Получай напоминания о тренировках</div>
    <div className="text-sm opacity-80 mt-1">Нажми и напиши боту /start</div>
  </button>
)}

          {/* TODAY PROGRAM */}
          {widgets.program && program.length > 0 && (
            <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase tracking-widest text-white/50">Тренировка на сегодня</div>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: ORANGE }} />
              </div>
              {[1, 2, 3, 4, 5].map(day => {
                const items = program.filter(p => p.day === day);
                if (items.length === 0) return null;
                return (
                  <div key={day} className="mb-3 last:mb-0">
                    <div className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: ORANGE }}>
                      День {day}
                    </div>
                    <div className="space-y-2">
                      {items.map(p => (
                        <div key={p.id} className="flex items-center gap-3 py-2 border-b border-neutral-900 last:border-0">
                          <div className="w-1 h-8 rounded-full" style={{ background: ORANGE }} />
                          <div className="flex-1">
                            <div className="text-sm font-semibold">{p.name}</div>
                            <div className="text-xs text-white/50">
                              {p.sets || '?'} × {p.reps || '?'} {p.weight ? '· ' + p.weight : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TODAY SCHEDULE */}
          {widgets.schedule && (
            <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Сегодня</div>
              {todaySchedule.length === 0 && todayShifts.length === 0 ? (
                <div className="text-sm text-white/40 py-3">Сегодня тренировок нет. Отдых тоже важен.</div>
              ) : (
                <>
                  {todaySchedule.map(s => (
                    <div key={s.id} className="flex items-center gap-3 py-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: ORANGE }} />
                      <div className="text-sm">
                        <b>{s.time}</b> — {s.format || 'тренировка'}
                        <span className="text-white/40 ml-2 text-xs">({s.status})</span>
                      </div>
                    </div>
                  ))}
                  {todayShifts.length > 0 && (
                    <div className="mt-3 text-xs text-white/40 border-t border-neutral-900 pt-3">
                      Тренер в зале: {todayShifts.map(s => s.start_time + '–' + s.end_time).join(', ')}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* GOAL */}
          {widgets.goal && (client.goal1 || goalV > 0) && (
            <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Моя цель</div>
              <div className="text-lg font-bold mb-3">{client.goal1 || '—'}</div>
              <div className="flex justify-between text-xs text-white/50 mb-2">
                <span>{client.goal1_current || '—'}</span>
                <span>{client.goal1_value || '—'} {client.metric1 || ''}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#262626' }}>
                <div className="h-2 rounded-full transition-all" style={{ width: goalPct + '%', background: ORANGE }} />
              </div>
              <div className="text-xs text-right mt-1" style={{ color: ORANGE }}>{goalPct}%</div>
            </div>
          )}

          {/* CYCLE */}
          {widgets.cycle && client.gender === 'female' && (
            <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Мой цикл</div>
              {cycle && phase ? (
                <>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center" style={{ background: phase.color + '22', border: '2px solid ' + phase.color }}>
                      <div className="text-xl font-black" style={{ color: phase.color }}>{cycleDay}</div>
                      <div className="text-[9px] text-white/50">день</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold" style={{ color: phase.color }}>{phase.phase}</div>
                      <div className="text-xs text-white/60 mt-1">{phase.advice}</div>
                    </div>
                  </div>
                  <button onClick={markCycleMiss} className="w-full py-2 text-xs text-red-400 border border-red-500/30 rounded-xl">
                    Отметить сбой
                  </button>
                </>
              ) : (
                <div className="text-sm text-white/40 mb-3">Цикл не отмечен</div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={markCycleStart} className="flex-1 py-2 text-xs font-bold rounded-xl text-white" style={{ background: ORANGE }}>
                  Начало цикла
                </button>
                <button onClick={markCycleDay} className="flex-1 py-2 text-xs font-bold rounded-xl text-white/70 border border-neutral-800">
                  Ввести день
                </button>
              </div>
            </div>
          )}

          {/* REQUESTS */}
          {myRequests.length > 0 && (
            <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Мои заявки</div>
              {myRequests.map(r => (
                <div key={r.id} className="flex justify-between items-center py-2 border-b border-neutral-900 last:border-0">
                  <div className="text-sm">{fmtDate(r.date)} · {r.time}</div>
                  <div
                    className="text-[10px] px-2 py-1 rounded-full uppercase font-bold"
                    style={{
                      background: r.status === 'принята' ? '#4ade8022' : r.status === 'отклонена' ? '#ef444422' : '#fbbf2422',
                      color: r.status === 'принята' ? '#4ade80' : r.status === 'отклонена' ? '#ef4444' : '#fbbf24',
                    }}
                  >
                    {r.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: SCHEDULE */}
      {tab === 'schedule' && (
        <div className="px-5 space-y-4">
          <div className="text-xs uppercase tracking-widest text-white/50 px-1 mb-2">Мои тренировки</div>
          {futureSchedule.length === 0 ? (
            <div className="rounded-3xl p-6 text-center text-white/40 text-sm" style={{ background: '#141414', border: '1px solid #262626' }}>
              Пока ничего не запланировано
            </div>
          ) : (
            futureSchedule.map(s => (
              <div key={s.id} className="rounded-2xl p-4 flex justify-between items-center" style={{ background: '#141414', border: '1px solid #262626' }}>
                <div>
                  <div className="font-bold text-sm">{fmtDate(s.date)}</div>
                  <div className="text-xs text-white/50 mt-1">{s.time} · {s.format || 'тренировка'}</div>
                </div>
                <div className="text-[10px] px-2 py-1 rounded-full uppercase font-bold" style={{ background: ORANGE + '22', color: ORANGE }}>
                  {s.status}
                </div>
              </div>
            ))
          )}

          <div className="text-xs uppercase tracking-widest text-white/50 px-1 mb-2 mt-6">Смены тренера — свободные окна</div>
          {shifts.length === 0 ? (
            <div className="rounded-3xl p-6 text-center text-white/40 text-sm" style={{ background: '#141414', border: '1px solid #262626' }}>
              Свободных окон нет
            </div>
          ) : (
            shifts.map(s => (
              <div key={s.id} className="rounded-2xl p-4 flex justify-between items-center" style={{ background: '#141414', border: '1px solid #262626' }}>
                <div>
                  <div className="font-bold text-sm">{fmtDate(s.date)}</div>
                  <div className="text-xs text-white/50 mt-1">{s.start_time} – {s.end_time}</div>
                </div>
                <button
                  onClick={() => requestShift(s)}
                  className="text-xs font-bold px-3 py-2 rounded-xl text-white"
                  style={{ background: ORANGE }}
                >
                  Записаться
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: SUBSCRIPTION */}
      {tab === 'subscription' && (
        <div className="px-5 space-y-4">
          <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #141414 0%, #1a1a1a 100%)', border: '1px solid #262626' }}>
            <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Мой абонемент</div>
            <div className="text-5xl font-black mb-1" style={{ color: ORANGE }}>{restLeft}</div>
            <div className="text-white/60 text-sm mb-4">занятий осталось</div>

            {dl !== null && (
              <>
                <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: '#262626' }}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: Math.max(0, Math.min(100, dl * 3)) + '%',
                      background: dl < 0 ? '#ef4444' : dl < 7 ? '#fbbf24' : ORANGE,
                    }}
                  />
                </div>
                <div className="text-xs text-white/50">
                  {dl > 0 ? 'Действует ещё ' + dl + ' дн.' : dl === 0 ? 'Истекает сегодня' : 'Истёк ' + Math.abs(dl) + ' дн. назад'}
                </div>
              </>
            )}
          </div>

          <div className="rounded-3xl p-5 space-y-3" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="flex justify-between py-2 border-b border-neutral-900">
              <span className="text-white/50 text-sm">Формат</span>
              <span className="text-sm font-semibold">{client.format || '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-900">
              <span className="text-white/50 text-sm">Начало</span>
              <span className="text-sm font-semibold">{client.start_date ? fmtDate(client.start_date) : '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-900">
              <span className="text-white/50 text-sm">Конец</span>
              <span className="text-sm font-semibold">{client.end_date ? fmtDate(client.end_date) : '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-white/50 text-sm">Оплачено</span>
              <span className="text-sm font-semibold">{client.paid || '—'}</span>
            </div>
          </div>

          {client.note && (
            <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Заметка от тренера</div>
              <div className="text-sm text-white/80 whitespace-pre-wrap">{client.note}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB: PROGRESS */}
      {tab === 'progress' && (
        <div className="px-5 space-y-4">
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Замеры</div>
            {measurements.length === 0 ? (
              <div className="text-sm text-white/40 py-3">Пока нет замеров</div>
            ) : (
              <>
                <div className="rounded-2xl p-4 mb-3" style={{ background: ORANGE + '11' }}>
                  <div className="text-xs text-white/50 mb-2">Последний · {fmtDate(measurements[0].date)}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {measurements[0].weight && <div>Вес: <b>{measurements[0].weight}</b></div>}
                    {measurements[0].chest && <div>Грудь: <b>{measurements[0].chest}</b></div>}
                    {measurements[0].waist && <div>Талия: <b>{measurements[0].waist}</b></div>}
                    {measurements[0].glutes && <div>Ягодицы: <b>{measurements[0].glutes}</b></div>}
                    {measurements[0].thigh && <div>Бедро: <b>{measurements[0].thigh}</b></div>}
                    {measurements[0].biceps && <div>Бицепс: <b>{measurements[0].biceps}</b></div>}
                  </div>
                </div>
                {measurements.slice(1).map(m => (
                  <div key={m.id} className="py-2 border-b border-neutral-900 last:border-0 text-sm flex justify-between">
                    <span className="text-white/50">{fmtDate(m.date)}</span>
                    <span className="text-white/80">
                      {[m.weight && m.weight + ' кг', m.waist && 'талия ' + m.waist].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>

          {client.gender === 'female' && cycle && phase && (
            <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Цикл</div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center" style={{ background: phase.color + '22', border: '2px solid ' + phase.color }}>
                  <div className="text-xl font-black" style={{ color: phase.color }}>{cycleDay}</div>
                  <div className="text-[9px] text-white/50">день</div>
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: phase.color }}>{phase.phase}</div>
                  <div className="text-xs text-white/60 mt-1">{phase.advice}</div>
                </div>
              </div>
            </div>
          )}

          {(client.strategy || client.medical || client.injuries) && (
            <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Стратегия и заметки</div>
              {client.strategy && <div className="text-sm whitespace-pre-wrap mb-3">{client.strategy}</div>}
              {client.medical && <div className="text-xs text-white/50 mb-1">Медпоказания: {client.medical}</div>}
              {client.injuries && <div className="text-xs text-white/50">Травмы: {client.injuries}</div>}
            </div>
          )}
        </div>
      )}

      {measurements.filter(m => m.weight).length >= 2 && (
  <div className="rounded-2xl p-4 mb-4" style={{ background: '#0a0a0a' }}>
    <WeightChart
      data={measurements
        .filter(m => m.weight)
        .map(m => ({ date: m.date, value: parseFloat(String(m.weight).replace(',', '.')) || 0 }))
        .filter(p => p.value > 0)}
    />
  </div>
)}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl" style={{ background: '#1a1a1a', border: '1px solid ' + ORANGE, color: 'white' }}>
          {toast}
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setShowSettings(false)}>
          <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#141414', border: '1px solid #262626' }} onClick={e => e.stopPropagation()}>
            <div className="text-lg font-black uppercase mb-4">Виджеты на главной</div>
            <div className="space-y-3 mb-6">
              {WIDGET_NAMES.filter(w => w.key !== 'cycle' || client.gender === 'female').map(w => (
                <label key={w.key} className="flex items-center justify-between py-2 cursor-pointer">
                  <span className="text-sm">{w.label}</span>
                  <div
                    onClick={() => toggleWidget(w.key)}
                    className="w-12 h-7 rounded-full relative transition-all"
                    style={{ background: widgets[w.key] ? ORANGE : '#262626' }}
                  >
                    <div
                      className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
                      style={{ left: widgets[w.key] ? '26px' : '4px' }}
                    />
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={handleSignOut}
              className="w-full py-3 rounded-2xl text-sm font-bold text-red-400 border border-red-500/30"
            >
              Выйти из аккаунта
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM TABS */}
      <div className="fixed bottom-0 left-0 right-0 z-40" style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a' }}>
        <div className="flex justify-around py-3">
          {[
            { key: 'home', label: 'Главная' },
            { key: 'schedule', label: 'Расписание' },
            { key: 'subscription', label: 'Абонемент' },
            { key: 'progress', label: 'Прогресс' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              className="flex-1 text-center py-1"
            >
              <div
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: tab === t.key ? ORANGE : '#525252' }}
              >
                {t.label}
              </div>
              {tab === t.key && (
                <div className="w-6 h-0.5 mx-auto mt-1 rounded-full" style={{ background: ORANGE }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}