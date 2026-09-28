import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkDomainMxRecords } from '@sunmail/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const domainId = params.id;

  try {
    const { data: domain, error } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .single();

    if (error || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const mailHost = process.env.MAIL_HOST || 'mail.sunmail.com';
    const result = await checkDomainMxRecords(domain.domain, mailHost);

    if (result.verified) {
      await supabase
        .from('domains')
        .update({
          mx_verified: true,
        })
        .eq('id', domainId);
    }

    return NextResponse.json({
      verified: result.verified,
      mxRecords: result.mxRecords,
      reason: result.reason,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
