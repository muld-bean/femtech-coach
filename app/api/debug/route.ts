import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { supabase } from '../../lib/supabase';

export async function GET(req: Request) {
  const out: any = {
    envCheck: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceLength: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
      cron: !!process.env.CRON_SECRET,
    },
    queries: {},
  };

  // Обычный клиент
  try {
    const { data, error } = await supabase.from('trainers').select('*');
    out.queries.anon = { count: data?.length ?? 0, error: error?.message || null };
  } catch (e: any) {
    out.queries.anon = { error: e.message };
  }

  // Admin клиент
  try {
    const { data, error } = await supabaseAdmin.from('trainers').select('*');
    out.queries.admin = { count: data?.length ?? 0, error: error?.message || null, first: data?.[0] || null };
  } catch (e: any) {
    out.queries.admin = { error: e.message };
  }

  return NextResponse.json(out);
}