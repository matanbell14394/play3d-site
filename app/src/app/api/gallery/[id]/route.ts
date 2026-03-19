import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await params;
    const { title, description, imageUrl, images } = await req.json();
    const item = await prisma.galleryProject.update({
      where: { id },
      data: {
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        images: JSON.stringify(images || []),
      },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await params;
    await prisma.galleryProject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
