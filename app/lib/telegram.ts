const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TRAINER_CHAT = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegram(chatId: string | number | null, text: string) {
  if (!TOKEN) {
    console.log('TELEGRAM_BOT_TOKEN не задан');
    return false;
  }
  if (!chatId) {
    console.log('chat_id пустой');
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId),
        text,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    if (!data.ok) console.log('Telegram error:', data);
    return data.ok;
  } catch (e) {
    console.log('Telegram exception:', e);
    return false;
  }
}

export async function sendToTrainer(text: string) {
  return sendTelegram(TRAINER_CHAT || null, text);
}

export function formatDate(iso: string) {
  if (!iso) return '';
  const p = iso.split('-');
  return p[2] + '.' + p[1];
}