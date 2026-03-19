import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const BRIDGE_SECRET = process.env.PRINTER_BRIDGE_SECRET || 'change-me-secret';

// GET — public, returns current printer status
export async function GET() {
  try {
    const status = await prisma.printerStatus.findUnique({ where: { id: 'singleton' } });
    if (!status) {
      return NextResponse.json({ status: 'offline', taskName: null, progress: 0, modelImageUrl: null, modelTitle: null, updatedAt: null });
    }
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ status: 'offline' });
  }
}

// POST — called by local bridge script with secret key
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-bridge-secret');
  if (secret !== BRIDGE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { status, taskName, progress } = body;

    if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 });

    const updated = await prisma.printerStatus.upsert({
      where: { id: 'singleton' },
      update: {
        status,
        taskName: taskName ?? null,
        progress: progress ?? 0,
      },
      create: {
        id: 'singleton',
        status,
        taskName: taskName ?? null,
        progress: progress ?? 0,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH — called by admin to set MakerWorld URL and fetch model image
export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { makerWorldUrl } = await req.json();

    let modelImageUrl: string | null = null;
    let modelTitle: string | null = null;

    if (makerWorldUrl) {
      const match = makerWorldUrl.match(/makerworld\.com\/(?:[a-z]{2}\/)?models\/(\d+)/i);
      if (match) {
        const modelId = match[1];
        try {
          const apiRes = await fetch(`https://makerworld.com/api/v1/design-service/design/${modelId}`, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://makerworld.com/' },
            signal: AbortSignal.timeout(6000),
          });
          if (apiRes.ok) {
            const data = await apiRes.json();
            const info = data?.designInfo || data;
            modelTitle = info?.title || info?.name || null;
            // Cover image
            const cover = info?.cover || info?.coverUrl || info?.thumbnail || info?.coverImage;
            if (cover) modelImageUrl = typeof cover === 'string' ? cover : cover?.url || null;
            // Try designFiles cover
            if (!modelImageUrl && data?.designFiles?.[0]?.cover) {
              modelImageUrl = data.designFiles[0].cover;
            }
          }
        } catch { /* ignore fetch errors */ }
      }
    }

    const updated = await prisma.printerStatus.upsert({
      where: { id: 'singleton' },
      update: { makerWorldUrl: makerWorldUrl || null, modelImageUrl, modelTitle },
      create: { id: 'singleton', status: 'offline', makerWorldUrl: makerWorldUrl || null, modelImageUrl, modelTitle },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
