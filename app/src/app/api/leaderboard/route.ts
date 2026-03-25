import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import prisma from '@/lib/prisma/prisma';

const SECRET = createHmac('sha256', process.env.NEXTAUTH_SECRET ?? 'dev')
  .update('filament-feed-leaderboard')
  .digest('hex');

const TOKEN_TTL = 120_000; // 2 minutes
const MAX_SCORE = 500;

// Returns { score } if token is valid, null otherwise.
// Score is extracted FROM the token — the POST body score field is ignored.
function verifyToken(token: unknown): { score: number } | null {
  if (typeof token !== 'string') return null;
  const parts = token.split(':');
  // format: nonce:ts:score:sig
  if (parts.length !== 4) return null;
  const [nonce, ts, scoreStr, sig] = parts;
  if (!nonce || !ts || !scoreStr || !sig) return null;

  if (Date.now() - parseInt(ts) > TOKEN_TTL) return null;

  const payload  = `${nonce}:${ts}:${scoreStr}`;
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex');

  // Constant-time compare
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;

  const score = parseInt(scoreStr);
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) return null;
  return { score };
}

export async function GET() {
  try {
    const entries = await prisma.leaderboardEntry.findMany({
      orderBy: { score: 'desc' },
      take: 10,
      select: { id: true, name: true, score: true },
    });
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, token } = await req.json();

    const verified = verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Score comes from the server-signed token, NOT from the request body
    const { score } = verified;

    const cleanName = String(name ?? '').trim().slice(0, 20);
    if (!cleanName) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const entry = await prisma.leaderboardEntry.create({
      data: { name: cleanName, score },
      select: { id: true, name: true, score: true },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
