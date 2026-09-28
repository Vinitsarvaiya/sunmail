import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptPassword } from '@sunmail/shared';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, host, port, encryption, username, password, from_email } = body;

    if (!name || !host || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const encryptionKey = process.env.SMTP_ENCRYPTION_KEY || 'default-0123456789abcdef0123456789abcdef';
    const encryptedPassword = encryptPassword(password, encryptionKey);

    const { data, error } = await supabase
      .from('smtp_destinations')
      .insert({
        user_id: user.id,
        name,
        host,
        port: parseInt(port, 10) || 587,
        encryption: encryption || 'STARTTLS',
        username,
        encrypted_password: encryptedPassword,
        from_email: from_email || null,
      })
      .select('id, user_id, name, host, port, encryption, username, from_email, created_at, updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, destination: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
