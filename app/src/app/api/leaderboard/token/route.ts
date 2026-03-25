import { NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';

// Derive a domain-specific key so we don't reuse the auth secret directly
const SECRET = createHmac('sha256', process.env.NEXTAUTH_SECRET ?? 'dev')
  .update('filament-feed-leaderboard')
  .digest('hex');

export async function GET() {
  const nonce = randomBytes(16).toString('hex');
  const ts    = Date.now().toString();
  const sig   = createHmac('sha256', SECRET).update(`${nonce}:${ts}`).digest('hex');
  return NextResponse.json({ token: `${nonce}:${ts}:${sig}` });
}
