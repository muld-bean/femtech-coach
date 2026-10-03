import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../lib/supabase-admin';
import { sendToTrainer, sendTelegram } from '../../../lib/telegram';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const p = (n: number) => (n < 10 ? '0' + n : n);
  const todayISO = now.getFullYear() + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate());

  const { data: trainer } = await supabase.from('trainers').select('*').limit(1).single();
  if (!trainer) return NextResponse.json({ ok: false });

  let sent = 0;
  let achievementsSent = 0;

  // === НАПОМИНАНИЯ ЗА ЧАС ===
  const { data: slots } = await supabase
    .from('schedule')
    .select('*, clients(name, telegram_chat_id)')
    .eq('trainer_id', trainer.id)
    .eq('date', todayISO)
    .eq('status', 'план');

  if (slots && slots.length > 0) {
    for (const s of slots) {
      const parts = String(s.time).split(':');
      if (parts.length < 2) continue;
      const slotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(parts[0]), parseInt(parts[1]));
      const diffMin = (slotDate.getTime() - now.getTime()) / 60000;

      if (diffMin > 55 && diffMin < 65) {
        const time = String(s.time).slice(0, 5);
        const clientName = s.clients?.name || 'Клиент';
        await sendToTrainer(`⏰ <b>Через час тренировка</b>\n\n${time} — ${clientName}`);
        sent++;
        if (s.clients?.telegram_chat_id) {
          await sendTelegram(s.clients.telegram_chat_id, `Привет! Через час тренировка в ${time}. Не забудь форму 💪`);
        }
      }
    }
  }

  // === ДОСТИЖЕНИЯ (раз в день, утром) ===
  const hour = now.getHours();
  if (hour >= 8 && hour <= 10) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, telegram_chat_id, achievements_sent')
      .eq('trainer_id', trainer.id)
      .not('telegram_chat_id', 'is', null);

    if (clients && clients.length > 0) {
      for (const c of clients) {
        const { count } = await supabase
          .from('schedule')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', c.id)
          .eq('status', 'проведено');

        const trainings = count || 0;
        const sentAchievements: string[] = c.achievements_sent ? JSON.parse(c.achievements_sent) : [];

        const thresholds: { key: string; count: number; msg: string }[] = [
          { key: 'first_training', count: 1, msg: '🎯 Первый шаг! Ты сделала первую тренировку.' },
          { key: 'ten_trainings', count: 10, msg: '🔥 10 тренировок! Ты в ритме.' },
          { key: 'thirty_trainings', count: 30, msg: '⚡ 30 тренировок! Становишься сильнее.' },
          { key: 'hundred_trainings', count: 100, msg: '🏆 100 тренировок! Железная воля.' },
        ];

        const newSent = [...sentAchievements];

        for (const t of thresholds) {
          if (trainings >= t.count && !sentAchievements.includes(t.key)) {
            await sendTelegram(c.telegram_chat_id, `Поздравляю, ${c.name}! ${t.msg}\n\nПродолжай — я с тобой.`);
            newSent.push(t.key);
            achievementsSent++;
          }
        }

        if (newSent.length !== sentAchievements.length) {
          await supabase
            .from('clients')
            .update({ achievements_sent: JSON.stringify(newSent) })
            .eq('id', c.id);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, achievementsSent });
}