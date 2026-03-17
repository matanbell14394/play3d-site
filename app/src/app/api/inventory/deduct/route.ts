import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

interface DeductItem {
  inventoryItemId: string;
  amountUsed: number; // in the item's unit (g, ml, pcs...)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { items }: { items: DeductItem[] } = await req.json();

    const results = await Promise.all(
      items
        .filter(i => i.amountUsed > 0 && i.inventoryItemId)
        .map(async ({ inventoryItemId, amountUsed }) => {
          const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
          if (!item) return { id: inventoryItemId, error: 'not found' };

          const newQty = Math.max(0, item.quantity - amountUsed);
          await prisma.inventoryItem.update({
            where: { id: inventoryItemId },
            data: { quantity: newQty },
          });

          return {
            id: inventoryItemId,
            name: item.name,
            before: item.quantity,
            after: newQty,
            deducted: amountUsed,
          };
        })
    );

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to deduct inventory' }, { status: 500 });
  }
}
