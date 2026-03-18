import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { title, description, imageUrl } = await req.json();
    const item = await prisma.galleryProject.update({
      where: { id: params.id },
      data: { title, description: description || null, imageUrl: imageUrl || null },
    });
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.galleryProject.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
