import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

function cleanPhone(p: string) {
  let s = String(p).replace(/\D/g, '');
  if (s.length === 11 && s[0] === '8') s = '7' + s.slice(1);
  if (s.length === 10) s = '7' + s;
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'no token' }, { status: 400 });
  }

  const { data: client, error: cErr } = await supabaseAdmin
    .from('clients')
    .select('id, phone, user_id')
    .eq('magic_token', token)
    .maybeSingle();

  if (cErr || !client) {
    return NextResponse.json({ error: 'token not found' }, { status: 404 });
  }

  if (!client.user_id) {
    return NextResponse.json({ error: 'account not linked' }, { status: 400 });
  }

  const email = cleanPhone(client.phone || '') + '@crm.local';
  if (!email || email === '@crm.local') {
    return NextResponse.json({ error: 'no email' }, { status: 400 });
  }

  const { data: link, error: lErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (lErr || !link?.properties?.hashed_token) {
    return NextResponse.json({ error: lErr?.message || 'link failed' }, { status: 500 });
  }

  return NextResponse.json({
    email,
    hashed_token: link.properties.hashed_token,
  });
}