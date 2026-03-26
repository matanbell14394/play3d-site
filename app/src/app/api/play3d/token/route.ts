import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';

const SECRET = createHmac('sha256', process.env.NEXTAUTH_SECRET ?? 'dev')
  .update('play3d-game')
  .digest('hex');

const MAX_SCORE = 999999;

export async function GET(req: NextRequest) {
  const score      = parseInt(req.nextUrl.searchParams.get('score')      ?? '0');
  const checkpoint = parseInt(req.nextUrl.searchParams.get('checkpoint') ?? '0');
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
  }
  const nonce   = randomBytes(16).toString('hex');
  const ts      = Date.now().toString();
  const payload = `${nonce}:${ts}:${score}:${checkpoint}`;
  const sig     = createHmac('sha256', SECRET).update(payload).digest('hex');
  return NextResponse.json({ token: `${payload}:${sig}` });
}
