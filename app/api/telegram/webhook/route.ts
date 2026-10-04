import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { sendToTrainer, sendTelegram } from '../../../lib/telegram';

const BASE_URL = 'https://femtech-coach-production.up.railway.app';

export async function POST(req: Request) {
  try {
    const update = await req.json();
    const msg = update.message;
    if (!msg || !msg.text) return NextResponse.json({ ok: true });

    const chatId = msg.chat.id;
    const text = String(msg.text).trim();
    const name = msg.from?.first_name || 'Друг';

    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const payload = parts[1] || '';

      if (payload.startsWith('c_')) {
        const clientId = payload.slice(2);

        // Привязка chat_id
        const { data: client, error } = await supabaseAdmin
          .from('clients')
          .update({ telegram_chat_id: String(chatId) })
          .eq('id', clientId)
          .select('id, name, magic_token')
          .single();

        if (error || !client) {
          await sendTelegram(chatId, 'Не удалось привязать аккаунт. Попроси тренера скинуть ссылку заново.');
          return NextResponse.json({ ok: true });
        }

        // Если нет magic_token — генерируем
        let token = client.magic_token;
        if (!token) {
          token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
          await supabaseAdmin.from('clients').update({ magic_token: token }).eq('id', client.id);
        }

        await sendTelegram(
  chatId,
  `Привет, ${name}! 👋\n\nТы подключена к тренеру. Напоминания о тренировках будут приходить сюда.`
);

        return NextResponse.json({ ok: true });
      }

      await sendTelegram(
        chatId,
        `Привет, ${name}! 👋\n\nЭто бот тренера. Открой ссылку-приглашение от тренера, чтобы подключиться.`
      );
      return NextResponse.json({ ok: true });
    }

    await sendToTrainer(
      `📩 <b>Сообщение от клиента</b>\n\n<b>${name}</b> (id: <code>${chatId}</code>):\n\n${text}`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.log('webhook error:', e);
    return NextResponse.json({ ok: true });
  }
}