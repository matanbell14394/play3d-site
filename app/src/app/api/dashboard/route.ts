import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const [
      totalOrders,
      openOrders,
      totalRevenue,
      totalUsers,
      inventoryItems,
      lowStock,
      recentOrders,
      unreadContacts,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ['PENDING', 'PROCESSING', 'PRINTING'] } } }),
      prisma.order.aggregate({ _sum: { totalPrice: true }, where: { status: { not: 'CANCELLED' } } }),
      prisma.user.count(),
      prisma.inventoryItem.count(),
      prisma.inventoryItem.findMany({ where: { quantity: { lt: 500 } }, orderBy: { quantity: 'asc' }, take: 5, select: { id: true, name: true, quantity: true, unit: true } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, clientName: true, status: true, totalPrice: true, createdAt: true } }),
      prisma.contactMessage.count({ where: { read: false } }),
    ]);

    return NextResponse.json({
      totalOrders,
      openOrders,
      revenue: totalRevenue._sum.totalPrice ?? 0,
      totalUsers,
      inventoryItems,
      lowStock,
      recentOrders,
      unreadContacts,
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
