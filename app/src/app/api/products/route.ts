import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { materials: { include: { inventoryItem: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const product = await prisma.product.create({
      data: {
        name: body.name,
        batchQuantity: parseInt(body.batchQuantity) || 1,
        printHours: parseFloat(body.printHours) || 0,
        operatorHours: parseFloat(body.operatorHours) || 0,
        markup: parseFloat(body.markup) / 100 || 0.3,
        materials: {
          create: (body.materials || []).map((m: { inventoryItemId: string; amountUsed: number }) => ({
            inventoryItemId: m.inventoryItemId,
            amountUsed: parseFloat(String(m.amountUsed)),
          })),
        },
      },
      include: { materials: { include: { inventoryItem: true } } },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
