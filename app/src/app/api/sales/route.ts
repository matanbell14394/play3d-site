import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import prisma from '@/lib/prisma/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { name: true } } },
  });
  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { productId, quantity, salePrice, costPrice, note } = await req.json();
  const qty = parseInt(quantity) || 1;
  const sp = parseFloat(salePrice) || 0;
  const cp = parseFloat(costPrice) || 0;

  // Get product name
  const product = productId ? await prisma.product.findUnique({
    where: { id: productId },
    include: { materials: { include: { inventoryItem: true } } },
  }) : null;

  const productName = product?.name || 'מכירה ידנית';

  // Deduct inventory for each material used
  if (product) {
    for (const mat of product.materials) {
      const deductAmount = mat.amountUsed * qty;
      await prisma.inventoryItem.update({
        where: { id: mat.inventoryItemId },
        data: { quantity: { decrement: deductAmount } },
      });
    }
  }

  const sale = await prisma.sale.create({
    data: {
      productId: productId || null,
      productName,
      quantity: qty,
      salePrice: sp,
      costPrice: cp,
      profit: sp - cp,
      note: note || null,
    },
  });

  return NextResponse.json(sale, { status: 201 });
}
