import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';

export async function GET() {
  try {
    const items = await prisma.galleryProject.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, description, imageUrl } = await req.json();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const item = await prisma.galleryProject.create({
      data: { title, description: description || null, imageUrl: imageUrl || null },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
