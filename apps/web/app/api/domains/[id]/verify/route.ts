import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyDomainTxtRecord } from '@sunmail/shared';

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

    const result = await verifyDomainTxtRecord(domain.domain, domain.verification_token);

    if (result.verified) {
      await supabase
        .from('domains')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
        })
        .eq('id', domainId);
    }

    return NextResponse.json({
      verified: result.verified,
      reason: result.reason,
      foundRecords: result.foundRecords,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
