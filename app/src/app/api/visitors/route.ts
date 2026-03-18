import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';

const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'missing sessionId' }, { status: 400 });

    const cutoff = new Date(Date.now() - TIMEOUT_MS);

    // Upsert this session + clean stale ones in parallel
    await Promise.all([
      prisma.activeVisitor.upsert({
        where: { sessionId },
        update: { lastSeen: new Date() },
        create: { sessionId },
      }),
      prisma.activeVisitor.deleteMany({ where: { lastSeen: { lt: cutoff } } }),
    ]);

    const count = await prisma.activeVisitor.count({
      where: { lastSeen: { gte: cutoff } },
    });

    return NextResponse.json({ count });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ count: 1 });
  }
}

export async function GET() {
  try {
    const cutoff = new Date(Date.now() - TIMEOUT_MS);
    const count = await prisma.activeVisitor.count({
      where: { lastSeen: { gte: cutoff } },
    });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 1 });
  }
}
