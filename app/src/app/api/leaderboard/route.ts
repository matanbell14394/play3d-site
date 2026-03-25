import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import prisma from '@/lib/prisma/prisma';

// Same derivation as in /token/route.ts
const SECRET = createHmac('sha256', process.env.NEXTAUTH_SECRET ?? 'dev')
  .update('filament-feed-leaderboard')
  .digest('hex');

const TOKEN_TTL  = 120_000; // 2 minutes
const MAX_SCORE  = 500;     // max achievable on a 20×20 grid

function verifyToken(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [nonce, ts, sig] = parts;
  if (!nonce || !ts || !sig) return false;
  if (Date.now() - parseInt(ts) > TOKEN_TTL) return false;
  const expected = createHmac('sha256', SECRET).update(`${nonce}:${ts}`).digest('hex');
  // Constant-time compare to prevent timing attacks
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
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
    const body = await req.json();
    const { name, score, token } = body;

    if (!verifyToken(token)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const cleanName = String(name ?? '').trim().slice(0, 20);
    if (
      !cleanName ||
      typeof score !== 'number' ||
      !Number.isInteger(score) ||
      score < 1 ||
      score > MAX_SCORE
    ) {
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
