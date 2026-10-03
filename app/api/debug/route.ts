import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase-admin';

export async function GET(req: Request) {
  const out: any = {};

  // Все тренеры (через admin — обходит RLS)
  const { data: trainers, error: tErr } = await supabaseAdmin
    .from('trainers')
    .select('*');
  out.trainers = { count: trainers?.length || 0, list: trainers, error: tErr?.message || null };

  // Все пользователи auth
  const { data: users, error: uErr } = await supabaseAdmin.auth.admin.listUsers();
  out.authUsers = {
    count: users?.users?.length || 0,
    list: users?.users?.map((u: any) => ({ id: u.id, email: u.email })),
    error: uErr?.message || null,
  };

  return NextResponse.json(out);
}