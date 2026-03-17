import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await prisma.order.findMany({
    include: { user: { select: { id: true, name: true, email: true } }, product: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const order = await prisma.order.create({
      data: {
        userId: body.userId,
        clientName: body.clientName,
        clientPhone: body.clientPhone,
        notes: body.notes || null,
        quantity: parseInt(body.quantity) || 1,
        totalPrice: body.totalPrice ? parseFloat(body.totalPrice) : null,
        productId: body.productId || null,
        status: body.status || 'PENDING',
      },
      include: { user: { select: { id: true, name: true, email: true } }, product: { select: { id: true, name: true } } },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
