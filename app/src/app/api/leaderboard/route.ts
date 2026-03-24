import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';

export async function GET() {
  try {
    const entries = await prisma.leaderboardEntry.findMany({
      orderBy: { score: 'desc' },
      take: 10,
      select: { id: true, name: true, score: true, createdAt: true },
    });
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, score } = await req.json();
    const cleanName = String(name ?? '').trim().slice(0, 20);
    if (!cleanName || typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 9999) {
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
