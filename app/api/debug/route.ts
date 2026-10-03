import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.json({
    queryToken: url.searchParams.get('token'),
    envSecret: process.env.CRON_SECRET,
    envSecretLength: (process.env.CRON_SECRET || '').length,
    match: url.searchParams.get('token') === process.env.CRON_SECRET,
    allKeys: Object.keys(process.env).filter(k => k.includes('CRON') || k.includes('TELEGRAM')),
  });
}