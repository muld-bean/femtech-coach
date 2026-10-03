import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
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

  const { data: slots } = await supabase
    .from('schedule')
    .select('*, clients(name, telegram_chat_id)')
    .eq('trainer_id', trainer.id)
    .eq('date', todayISO)
    .eq('status', 'план');

  if (!slots || slots.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  let sent = 0;
  for (const s of slots) {
    const parts = String(s.time).split(':');
    if (parts.length < 2) continue;
    const slotDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      parseInt(parts[0]),
      parseInt(parts[1])
    );
    const diffMin = (slotDate.getTime() - now.getTime()) / 60000;

    if (diffMin > 55 && diffMin < 65) {
      const time = String(s.time).slice(0, 5);
      const clientName = s.clients?.name || 'Клиент';

      await sendToTrainer(`⏰ <b>Через час тренировка</b>\n\n${time} — ${clientName}`);
      sent++;

      if (s.clients?.telegram_chat_id) {
        await sendTelegram(
          s.clients.telegram_chat_id,
          `Привет! Напоминаю — через час тренировка в ${time}. Не забудь форму 💪`
        );
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}