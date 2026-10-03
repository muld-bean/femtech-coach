'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import TabBar from '../../lib/TabBar';
import { useRealtime } from '../../lib/useRealtime';

const ORANGE = '#FF4A1C';

function phaseInfo(day: number) {
  if (day >= 1 && day <= 5) return { color: '#FF4A1C', phase: 'Менструальная', advice: 'Снизить нагрузку на 30%.' };
  if (day >= 6 && day <= 13) return { color: '#4ade80', phase: 'Фолликулярная', advice: 'Пик силы. Можно грузить.' };
  if (day >= 14 && day <= 16) return { color: '#fbbf24', phase: 'Овуляция', advice: 'Пик силы, но связки уязвимы.' };
  if (day >= 17 && day <= 23) return { color: '#4ade80', phase: 'Ранняя лютеиновая', advice: 'Обычный режим.' };
  if (day >= 24) return { color: '#FF4A1C', phase: 'Поздняя лютеиновая', advice: 'Снизить нагрузку.' };
  return { color: '#737373', phase: '—', advice: '' };
}

function fmtDate(iso: string) {
  if (!iso) return '';
  const p = iso.split('-');
  if (p.length !== 3) return iso;
  return p[2] + '.' + p[1] + '.' + p[0];
}

export default function ClientProfile() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [program, setProgram] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [cycleData, setCycleData] = useState<any>({ current: null, day: 0, phase: null });
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editFormat, setEditFormat] = useState('');
  const [editRest, setEditRest] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editStrategy, setEditStrategy] = useState('');
  const [editGoal1, setEditGoal1] = useState('');
  const [editMetric1, setEditMetric1] = useState('');
  const [editGoal1Value, setEditGoal1Value] = useState('');
  const [editGoal1Current, setEditGoal1Current] = useState('');
  const [editMedical, setEditMedical] = useState('');
  const [editInjuries, setEditInjuries] = useState('');
  const [editLifestyle, setEditLifestyle] = useState('');
  const [editCycleNote, setEditCycleNote] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editWeight, setEditWeight] = useState('');

  const [showAddProg, setShowAddProg] = useState(false);
  const [pName, setPName] = useState('');
  const [pDay, setPDay] = useState('1');
  const [pSets, setPSets] = useState('4');
  const [pReps, setPReps] = useState('8');
  const [pWeight, setPWeight] = useState('');

  const [showAddMeas, setShowAddMeas] = useState(false);
  const [mWeight, setMWeight] = useState('');
  const [mWaist, setMWaist] = useState('');
  const [mChest, setMChest] = useState('');
  const [mGlutes, setMGlutes] = useState('');
  const [mThigh, setMThigh] = useState('');

  useEffect(() => { loadClient(); }, [id]);
  useRealtime(['schedule', 'program_items', 'measurements', 'cycles', 'clients'], loadClient);

  async function loadClient() {
    const { data: c } = await supabase.from('clients').select('*').eq('id', id).single();
    if (!c) { router.push('/dashboard'); return; }
    setClient(c);

    const { data: s } = await supabase.from('schedule').select('*').eq('client_id', id).gte('date', new Date().toISOString().split('T')[0]).order('date');
    setSchedule(s || []);

    const { data: p } = await supabase.from('program_items').select('*').eq('client_id', id).order('day').order('ord');
    setProgram(p || []);

    const { data: m } = await supabase.from('measurements').select('*').eq('client_id', id).order('date', { ascending: false });
    setMeasurements(m || []);

    const { data: cyc } = await supabase.from('cycles').select('*').eq('client_id', id).order('start_date', { ascending: false });
    if (cyc && cyc.length > 0) {
      const current = cyc.find((x: any) => !x.end_date);
      let dayNum = 0;
      let phase = null;
      if (current) {
        const start = new Date(current.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dayNum = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
        if (dayNum < 1) dayNum = 1;
        phase = phaseInfo(dayNum);
      }
      setCycleData({ current, day: dayNum, phase });
    }

    setLoading(false);
  }

  function openEdit() {
    setEditName(client.name);
    setEditPhone(client.phone || '');
    setEditFormat(client.format || '');
    setEditRest(String(client.rest || 0));
    setEditNote(client.note || '');
    setEditStrategy(client.strategy || '');
    setEditGoal1(client.goal1 || '');
    setEditMetric1(client.metric1 || '');
    setEditGoal1Value(client.goal1_value || '');
    setEditGoal1Current(client.goal1_current || '');
    setEditMedical(client.medical || '');
    setEditInjuries(client.injuries || '');
    setEditLifestyle(client.lifestyle || '');
    setEditCycleNote(client.cycle_note || '');
    setEditHeight(client.height || '');
    setEditWeight(client.weight || '');
    setShowEdit(true);
  }

  async function saveEdit() {
    const { error } = await supabase.from('clients').update({
      name: editName,
      phone: editPhone || null,
      format: editFormat,
      rest: parseInt(editRest) || 0,
      note: editNote || null,
      strategy: editStrategy || null,
      goal1: editGoal1 || null,
      metric1: editMetric1 || null,
      goal1_value: editGoal1Value || null,
      goal1_current: editGoal1Current || null,
      medical: editMedical || null,
      injuries: editInjuries || null,
      lifestyle: editLifestyle || null,
      cycle_note: editCycleNote || null,
      height: editHeight || null,
      weight: editWeight || null,
    }).eq('id', id);
    if (error) { alert(error.message); return; }
    setShowEdit(false);
    loadClient();
  }

  async function addToRest(delta: number) {
    if (!client) return;
    const newRest = Math.max(0, client.rest + delta);
    await supabase.from('clients').update({ rest: newRest }).eq('id', id);
    loadClient();
  }

  async function addProgram() {
    if (!pName.trim()) return;
    const { error } = await supabase.from('program_items').insert({
      client_id: id,
      week_start: new Date().toISOString().split('T')[0],
      day: parseInt(pDay),
      ord: program.filter(p => p.day === parseInt(pDay)).length + 1,
      name: pName.trim(),
      sets: pSets,
      reps: pReps,
      weight: pWeight,
    });
    if (error) { alert(error.message); return; }
    setPName(''); setPSets('4'); setPReps('8'); setPWeight('');
    setShowAddProg(false);
    loadClient();
  }

  async function deleteProgram(pid: string) {
    if (!confirm('Удалить упражнение?')) return;
    await supabase.from('program_items').delete().eq('id', pid);
    loadClient();
  }

  async function saveFact(pid: string, fs: string, fr: string, fw: string) {
    await supabase.from('program_items').update({
      fact_sets: fs || null,
      fact_reps: fr || null,
      fact_weight: fw || null,
    }).eq('id', pid);
    loadClient();
  }

  async function addMeasurement() {
    if (!mWeight && !mWaist && !mChest && !mGlutes && !mThigh) {
      alert('Введи хотя бы один замер');
      return;
    }
    const { error } = await supabase.from('measurements').insert({
      client_id: id,
      date: new Date().toISOString().split('T')[0],
      weight: mWeight || null,
      waist: mWaist || null,
      chest: mChest || null,
      glutes: mGlutes || null,
      thigh: mThigh || null,
    });
    if (error) { alert(error.message); return; }
    setMWeight(''); setMWaist(''); setMChest(''); setMGlutes(''); setMThigh('');
    setShowAddMeas(false);
    loadClient();
  }

  async function deleteMeasurement(mid: string) {
    if (!confirm('Удалить замер?')) return;
    await supabase.from('measurements').delete().eq('id', mid);
    loadClient();
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white/50">Загрузка...</div>
    </div>
  );

  if (!client) return null;

  const goalV = parseFloat((client.goal1_value || '').replace(/[^\d.]/g, '')) || 0;
  const goalC = parseFloat((client.goal1_current || '').replace(/[^\d.]/g, '')) || 0;
  const goalPct = goalV > 0 ? Math.min(100, Math.round(goalC / goalV * 100)) : 0;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* HEADER */}
      <div className="px-6 pt-8 pb-6">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-white/50 mb-3">← Назад</button>
        <div className="text-3xl font-black uppercase tracking-tight">{client.name}</div>
        <div className="text-sm text-white/50 mt-1">{client.format || 'без формата'}</div>
        {client.phone && <div className="text-sm mt-1" style={{ color: ORANGE }}>{client.phone}</div>}
      </div>

      <div className="px-5 space-y-4">
        {/* REST */}
        <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
          <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Остаток занятий</div>
          <div className="text-5xl font-black text-center my-3" style={{ color: ORANGE }}>{client.rest}</div>
          <div className="flex gap-2">
            <button onClick={() => addToRest(-1)} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: '#ef444422', color: '#ef4444' }}>
              Минус 1
            </button>
            <button onClick={() => addToRest(1)} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background: '#4ade8022', color: '#4ade80' }}>
              Плюс 1
            </button>
          </div>
        </div>

        {/* GOAL */}
        {(client.goal1 || goalV > 0) && (
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Цель</div>
            <div className="text-sm font-bold mb-3">{client.goal1} — {client.metric1}</div>
            <div className="flex justify-between text-xs text-white/50 mb-2">
              <span>Текущее: {client.goal1_current || '—'}</span>
              <span>Цель: {client.goal1_value || '—'}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#262626' }}>
              <div className="h-2 rounded-full" style={{ width: goalPct + '%', background: ORANGE }} />
            </div>
            <div className="text-xs text-right mt-1" style={{ color: ORANGE }}>{goalPct}%</div>
          </div>
        )}

        {/* CYCLE */}
        {client.gender === 'female' && (
          <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
            <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Цикл</div>
            {cycleData.current && cycleData.phase ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center" style={{ background: cycleData.phase.color + '22', border: '2px solid ' + cycleData.phase.color }}>
                  <div className="text-xl font-black" style={{ color: cycleData.phase.color }}>{cycleData.day}</div>
                  <div className="text-[9px] text-white/50">день</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{ color: cycleData.phase.color }}>{cycleData.phase.phase}</div>
                  <div className="text-xs text-white/60 mt-1">{cycleData.phase.advice}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/40">Не отмечен</div>
            )}
            {client.cycle_note && (
              <div className="text-xs mt-3 p-3 rounded-xl" style={{ background: '#0a0a0a' }}>
                <div className="text-white/40 mb-1">Заметка</div>
                {client.cycle_note}
              </div>
            )}
          </div>
        )}

        {/* STRATEGY */}
        <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs uppercase tracking-widest text-white/50">Стратегия</div>
            <button onClick={openEdit} className="text-xs font-bold" style={{ color: ORANGE }}>Изменить</button>
          </div>
          <div className="text-sm whitespace-pre-wrap text-white/80">
            {client.strategy || 'Не заполнено'}
          </div>
        </div>

        {/* ANAMNESIS */}
        <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs uppercase tracking-widest text-white/50">Анамнез</div>
            <button onClick={openEdit} className="text-xs font-bold" style={{ color: ORANGE }}>Изменить</button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-neutral-900">
              <span className="text-white/50">Рост</span><span>{client.height || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-900">
              <span className="text-white/50">Вес</span><span>{client.weight || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-900">
              <span className="text-white/50">Медпоказания</span><span className="text-right ml-4">{client.medical || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-900">
              <span className="text-white/50">Травмы</span><span className="text-right ml-4">{client.injuries || '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-white/50">Образ жизни</span><span className="text-right ml-4">{client.lifestyle || '—'}</span>
            </div>
          </div>
        </div>

        {/* SCHEDULE */}
        <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
          <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Расписание</div>
          {schedule.length === 0 ? (
            <div className="text-sm text-white/40 py-3">Нет предстоящих тренировок</div>
          ) : (
            schedule.map(s => (
              <div key={s.id} className="flex justify-between py-2 border-b border-neutral-900 last:border-0">
                <div>
                  <div className="text-sm font-semibold">{fmtDate(s.date)} · {s.time}</div>
                  <div className="text-xs text-white/40">{s.format || ''}</div>
                </div>
                <div className="text-[10px] px-2 py-1 rounded-full uppercase font-bold self-center" style={{ background: ORANGE + '22', color: ORANGE }}>
                  {s.status}
                </div>
              </div>
            ))
          )}
        </div>

        {/* PROGRAM */}
        <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs uppercase tracking-widest text-white/50">Программа</div>
            <button onClick={() => setShowAddProg(true)} className="text-xs font-bold" style={{ color: ORANGE }}>+ Упражнение</button>
          </div>
          {program.length === 0 ? (
            <div className="text-sm text-white/40 py-3">Программа не назначена</div>
          ) : (
            [1, 2, 3, 4, 5].map(day => {
              const dayItems = program.filter(p => p.day === day);
              if (dayItems.length === 0) return null;
              return (
                <div key={day} className="mb-4 last:mb-0">
                  <div className="text-xs font-bold mb-2" style={{ color: ORANGE }}>День {day}</div>
                  {dayItems.map(p => {
                    const ps = parseInt(String(p.sets).replace(/\D/g, '')) || 0;
                    const pr = parseInt(String(p.reps).replace(/\D/g, '')) || 0;
                    const fs = parseInt(String(p.fact_sets || '').replace(/\D/g, '')) || 0;
                    const fr = parseInt(String(p.fact_reps || '').replace(/\D/g, '')) || 0;
                    const hasFact = p.fact_sets || p.fact_reps || p.fact_weight;
                    const pct = ps * pr > 0 ? Math.round(fs * fr / (ps * pr) * 100) : 0;
                    let borderColor = '#262626';
                    if (hasFact) {
                      if (pct >= 100) borderColor = '#4ade80';
                      else if (pct >= 50) borderColor = '#fbbf24';
                      else borderColor = '#ef4444';
                    }
                    return (
                      <div key={p.id} className="py-2 px-3 my-1 rounded-lg" style={{ background: '#0a0a0a', borderLeft: '3px solid ' + borderColor }}>
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="text-sm font-semibold">{p.name}</div>
                            <div className="text-xs text-white/50">План: {p.sets || '?'}×{p.reps || '?'} {p.weight || ''}</div>
                            {hasFact && (
                              <div className="text-xs mt-1" style={{ color: borderColor }}>
                                Факт: {p.fact_sets || '?'}×{p.fact_reps || '?'} {p.fact_weight || ''} ({pct}%)
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <button
                              onClick={() => {
                                const fs2 = prompt('Факт подходы:', p.fact_sets || '');
                                if (fs2 === null) return;
                                const fr2 = prompt('Факт повторы:', p.fact_reps || '');
                                if (fr2 === null) return;
                                const fw2 = prompt('Факт вес:', p.fact_weight || '');
                                if (fw2 === null) return;
                                saveFact(p.id, fs2, fr2, fw2);
                              }}
                              className="text-xs font-bold"
                              style={{ color: '#4ade80' }}
                            >
                              Факт
                            </button>
                            <button onClick={() => deleteProgram(p.id)} className="text-xs font-bold text-red-400">Удалить</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* MEASUREMENTS */}
        <div className="rounded-3xl p-5" style={{ background: '#141414', border: '1px solid #262626' }}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs uppercase tracking-widest text-white/50">Замеры</div>
            <button onClick={() => setShowAddMeas(true)} className="text-xs font-bold" style={{ color: ORANGE }}>+ Замер</button>
          </div>
          {measurements.length === 0 ? (
            <div className="text-sm text-white/40 py-3">Замеров пока нет</div>
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
              {measurements.slice(1, 6).map(m => (
                <div key={m.id} className="flex justify-between py-2 border-b border-neutral-900 last:border-0 text-sm">
                  <span className="text-white/50">{fmtDate(m.date)}</span>
                  <div className="flex items-center gap-3">
                    <span>{[m.weight && m.weight + ' кг', m.waist && 'талия ' + m.waist].filter(Boolean).join(' · ')}</span>
                    <button onClick={() => deleteMeasurement(m.id)} className="text-red-400 text-xs">×</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowEdit(false)}>
          <div className="w-full rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto" style={{ background: '#141414' }} onClick={e => e.stopPropagation()}>
            <div className="text-lg font-black uppercase mb-4">Редактировать</div>
            <input placeholder="Имя" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Телефон" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Формат" value={editFormat} onChange={e => setEditFormat(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Остаток" type="number" value={editRest} onChange={e => setEditRest(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Рост" value={editHeight} onChange={e => setEditHeight(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Вес" value={editWeight} onChange={e => setEditWeight(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Медпоказания" value={editMedical} onChange={e => setEditMedical(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Травмы" value={editInjuries} onChange={e => setEditInjuries(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Образ жизни" value={editLifestyle} onChange={e => setEditLifestyle(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Заметка по циклу" value={editCycleNote} onChange={e => setEditCycleNote(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Цель" value={editGoal1} onChange={e => setEditGoal1(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input placeholder="Метрика" value={editMetric1} onChange={e => setEditMetric1(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <div className="flex gap-2 mb-3">
              <input placeholder="Целевое" value={editGoal1Value} onChange={e => setEditGoal1Value(e.target.value)} className="flex-1 p-3 rounded-xl text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
              <input placeholder="Текущее" value={editGoal1Current} onChange={e => setEditGoal1Current(e.target.value)} className="flex-1 p-3 rounded-xl text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            </div>
            <textarea placeholder="Стратегия" value={editStrategy} onChange={e => setEditStrategy(e.target.value)} rows={4} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <textarea placeholder="Заметка" value={editNote} onChange={e => setEditNote(e.target.value)} rows={2} className="w-full p-3 rounded-xl mb-4 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <div className="flex gap-2">
              <button onClick={() => setShowEdit(false)} className="flex-1 py-3 rounded-xl font-bold text-white/70" style={{ background: '#0a0a0a' }}>Отмена</button>
              <button onClick={saveEdit} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: ORANGE }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PROGRAM MODAL */}
      {showAddProg && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowAddProg(false)}>
          <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#141414' }} onClick={e => e.stopPropagation()}>
            <div className="text-lg font-black uppercase mb-4">Новое упражнение</div>
            <input value={pName} onChange={e => setPName(e.target.value)} placeholder="Жим лёжа" className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <select value={pDay} onChange={e => setPDay(e.target.value)} className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }}>
              <option value="1">День 1</option>
              <option value="2">День 2</option>
              <option value="3">День 3</option>
              <option value="4">День 4</option>
              <option value="5">День 5</option>
            </select>
            <div className="flex gap-2 mb-3">
              <input value={pSets} onChange={e => setPSets(e.target.value)} placeholder="Подходы" className="w-full p-3 rounded-xl text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
              <input value={pReps} onChange={e => setPReps(e.target.value)} placeholder="Повторы" className="w-full p-3 rounded-xl text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            </div>
            <input value={pWeight} onChange={e => setPWeight(e.target.value)} placeholder="Вес" className="w-full p-3 rounded-xl mb-4 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <div className="flex gap-2">
              <button onClick={() => setShowAddProg(false)} className="flex-1 py-3 rounded-xl font-bold text-white/70" style={{ background: '#0a0a0a' }}>Отмена</button>
              <button onClick={addProgram} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: ORANGE }}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEASUREMENT MODAL */}
      {showAddMeas && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowAddMeas(false)}>
          <div className="w-full rounded-t-3xl p-6 pb-10" style={{ background: '#141414' }} onClick={e => e.stopPropagation()}>
            <div className="text-lg font-black uppercase mb-4">Новый замер</div>
            <input value={mWeight} onChange={e => setMWeight(e.target.value)} placeholder="Вес (кг)" className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input value={mChest} onChange={e => setMChest(e.target.value)} placeholder="Грудь (см)" className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input value={mWaist} onChange={e => setMWaist(e.target.value)} placeholder="Талия (см)" className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input value={mGlutes} onChange={e => setMGlutes(e.target.value)} placeholder="Ягодицы (см)" className="w-full p-3 rounded-xl mb-3 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <input value={mThigh} onChange={e => setMThigh(e.target.value)} placeholder="Бедро (см)" className="w-full p-3 rounded-xl mb-4 text-white" style={{ background: '#0a0a0a', border: '1px solid #262626' }} />
            <div className="flex gap-2">
              <button onClick={() => setShowAddMeas(false)} className="flex-1 py-3 rounded-xl font-bold text-white/70" style={{ background: '#0a0a0a' }}>Отмена</button>
              <button onClick={addMeasurement} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: ORANGE }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}