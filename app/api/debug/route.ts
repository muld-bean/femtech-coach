import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const all = Object.keys(process.env).sort();
  return NextResponse.json({
    cronSecret: process.env.CRON_SECRET || 'NOT_SET',
    cronLength: (process.env.CRON_SECRET || '').length,
    telegram: !!process.env.TELEGRAM_BOT_TOKEN,
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    totalEnvVars: all.length,
    allEnvKeys: all,
  });
}