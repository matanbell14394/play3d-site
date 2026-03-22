import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrders,
      openOrders,
      totalRevenue,
      totalUsers,
      inventoryItems,
      lowStock,
      recentOrders,
      unreadContacts,
      salesAllTime,
      salesThisMonth,
      recentSales,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ['PENDING', 'PROCESSING', 'PRINTING'] } } }),
      prisma.order.aggregate({ _sum: { totalPrice: true }, where: { status: { not: 'CANCELLED' } } }),
      prisma.user.count(),
      prisma.inventoryItem.count(),
      prisma.inventoryItem.findMany({ where: { quantity: { lt: 500 } }, orderBy: { quantity: 'asc' }, take: 5, select: { id: true, name: true, quantity: true, unit: true } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, clientName: true, status: true, totalPrice: true, createdAt: true } }),
      prisma.contactMessage.count({ where: { read: false } }),
      prisma.sale.aggregate({ _sum: { salePrice: true, profit: true }, _count: { id: true } }),
      prisma.sale.aggregate({ _sum: { salePrice: true, profit: true }, _count: { id: true }, where: { createdAt: { gte: startOfMonth } } }),
      prisma.sale.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, productName: true, quantity: true, salePrice: true, profit: true, createdAt: true } }),
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
      sales: {
        allTime: { revenue: salesAllTime._sum.salePrice ?? 0, profit: salesAllTime._sum.profit ?? 0, count: salesAllTime._count.id },
        thisMonth: { revenue: salesThisMonth._sum.salePrice ?? 0, profit: salesThisMonth._sum.profit ?? 0, count: salesThisMonth._count.id },
        recent: recentSales,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
