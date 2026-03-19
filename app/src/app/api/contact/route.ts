import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// GET — admin only
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST — public (contact form submission)
export async function POST(req: NextRequest) {
  try {
    const { name, contact, message } = await req.json();
    if (!name || !contact || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    // Limit field lengths to prevent spam/abuse
    if (name.length > 100 || contact.length > 200 || message.length > 2000) {
      return NextResponse.json({ error: 'Fields too long' }, { status: 400 });
    }
    const msg = await prisma.contactMessage.create({ data: { name, contact, message } });
    return NextResponse.json(msg, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH (mark read) — admin only
export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.contactMessage.update({ where: { id }, data: { read: true } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE — admin only
export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.contactMessage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
