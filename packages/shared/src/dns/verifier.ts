import { Resolver } from 'node:dns/promises';
import dns from 'node:dns/promises';

export interface VerificationResult {
  verified: boolean;
  reason?: string;
  foundRecords?: string[];
}

export interface MxCheckResult {
  verified: boolean;
  mxRecords: { exchange: string; priority: number }[];
  reason?: string;
}

function getResolver() {
  const resolver = new Resolver();
  try {
    resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch {
    // fallback if setServers fails
  }
  return resolver;
}

/**
 * Checks if the domain has the required TXT verification token
 * Checks both `_sunmail-verification.<domain>` and `<domain>`
 */
export async function verifyDomainTxtRecord(
  domain: string,
  expectedToken: string
): Promise<VerificationResult> {
  const cleanDomain = domain.trim().toLowerCase();
  const subDomain = `_sunmail-verification.${cleanDomain}`;
  const targetValue = expectedToken.startsWith('sunmail-verification=')
    ? expectedToken
    : `sunmail-verification=${expectedToken}`;

  const foundRecords: string[] = [];
  const resolver = getResolver();

  // 1. Try subdomain with custom resolver: _sunmail-verification.domain.com
  try {
    const txtRecords = await resolver.resolveTxt(subDomain);
    const flattened = txtRecords.map((chunk) => chunk.join(''));
    foundRecords.push(...flattened);

    if (flattened.some((record) => record.trim() === targetValue || record.includes(expectedToken))) {
      return { verified: true, foundRecords };
    }
  } catch (err: any) {
    // Subdomain TXT lookup may return ENODATA or ENOTFOUND
  }

  // 2. Try apex domain with custom resolver: domain.com
  try {
    const rootTxtRecords = await resolver.resolveTxt(cleanDomain);
    const flattenedRoot = rootTxtRecords.map((chunk) => chunk.join(''));
    foundRecords.push(...flattenedRoot);

    if (flattenedRoot.some((record) => record.trim() === targetValue || record.includes(expectedToken))) {
      return { verified: true, foundRecords };
    }
  } catch (err: any) {
    // Apex TXT lookup may return ENODATA or ENOTFOUND
  }

  // 3. Fallback to system DNS
  try {
    const sysRecords = await dns.resolveTxt(subDomain);
    const flattenedSys = sysRecords.map((chunk) => chunk.join(''));
    foundRecords.push(...flattenedSys);

    if (flattenedSys.some((record) => record.trim() === targetValue || record.includes(expectedToken))) {
      return { verified: true, foundRecords };
    }
  } catch (err: any) {}

  try {
    const sysRootRecords = await dns.resolveTxt(cleanDomain);
    const flattenedSysRoot = sysRootRecords.map((chunk) => chunk.join(''));
    foundRecords.push(...flattenedSysRoot);

    if (flattenedSysRoot.some((record) => record.trim() === targetValue || record.includes(expectedToken))) {
      return { verified: true, foundRecords };
    }
  } catch (err: any) {}

  return {
    verified: false,
    reason: `Could not find TXT record "${targetValue}" on "${subDomain}" or "${cleanDomain}"`,
    foundRecords,
  };
}

/**
 * Checks whether the domain MX records point to the SunMail receiving host (e.g., mail.sunmail.com)
 */
export async function checkDomainMxRecords(
  domain: string,
  expectedMailHost = process.env.MAIL_HOST || 'mail.sunmail.com'
): Promise<MxCheckResult> {
  const cleanDomain = domain.trim().toLowerCase();
  const expectedHostClean = expectedMailHost.trim().toLowerCase();
  const resolver = getResolver();

  let records: { exchange: string; priority: number }[] = [];

  try {
    records = await resolver.resolveMx(cleanDomain);
  } catch (err: any) {
    try {
      records = await dns.resolveMx(cleanDomain);
    } catch (e: any) {
      // Record might not have propagated yet
      return {
        verified: false,
        mxRecords: [],
        reason: 'MX record not found yet. DNS changes usually take 1–2 minutes to propagate.',
      };
    }
  }

  if (!records || records.length === 0) {
    return {
      verified: false,
      mxRecords: [],
      reason: `No MX records found for ${cleanDomain}. Ensure you added the MX record in your DNS panel.`,
    };
  }

  const sorted = records.sort((a, b) => a.priority - b.priority);

  const isMatch = sorted.some(
    (r) =>
      r.exchange.toLowerCase() === expectedHostClean ||
      r.exchange.toLowerCase() === `${expectedHostClean}.` ||
      r.exchange.toLowerCase().includes('sunmail') ||
      r.exchange.toLowerCase().includes(cleanDomain)
  );

  return {
    verified: isMatch,
    mxRecords: sorted,
    reason: isMatch ? undefined : `MX records found (${sorted.map((r) => r.exchange).join(', ')}), but does not match ${expectedMailHost}`,
  };
}
