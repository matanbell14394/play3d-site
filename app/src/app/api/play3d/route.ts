import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import prisma from '@/lib/prisma/prisma';

const SECRET = createHmac('sha256', process.env.NEXTAUTH_SECRET ?? 'dev')
  .update('play3d-game')
  .digest('hex');

const TOKEN_TTL  = 120_000; // 2 min
const MAX_SCORE  = 999999;

function verifyToken(token: unknown): { score: number; checkpoint: number } | null {
  if (typeof token !== 'string') return null;
  const parts = token.split(':');
  if (parts.length !== 5) return null;
  const [nonce, ts, scoreStr, checkpointStr, sig] = parts;
  const age = Date.now() - parseInt(ts);
  if (isNaN(age) || age < 0 || age > TOKEN_TTL) return null;
  const score      = parseInt(scoreStr);
  const checkpoint = parseInt(checkpointStr);
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) return null;
  const payload  = `${nonce}:${ts}:${score}:${checkpoint}`;
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
  try {
    if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
  } catch { return null; }
  return { score, checkpoint };
}

export async function GET() {
  const entries = await prisma.play3dEntry.findMany({
    orderBy: { score: 'desc' },
    take: 20,
    select: { id: true, name: true, score: true, checkpoint: true, createdAt: true },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const verified = verifyToken(body.token);
  if (!verified) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });

  const name = String(body.name ?? '').replace(/[<>"'&]/g, '').slice(0, 20).trim() || 'Player';
  const entry = await prisma.play3dEntry.create({
    data: { name, score: verified.score, checkpoint: verified.checkpoint },
  });
  return NextResponse.json(entry, { status: 201 });
}
