import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();
    await prisma.productMaterial.deleteMany({ where: { productId: id } });
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        batchQuantity: parseInt(body.batchQuantity) || 1,
        printHours: parseFloat(body.printHours) || 0,
        operatorHours: parseFloat(body.operatorHours) || 0,
        markup: parseFloat(body.markup) / 100 || 0,
        materials: {
          create: (body.materials || []).map((m: { inventoryItemId: string; amountUsed: string }) => ({
            inventoryItemId: m.inventoryItemId,
            amountUsed: parseFloat(m.amountUsed) || 0,
          })),
        },
      },
    });
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    await prisma.productMaterial.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
