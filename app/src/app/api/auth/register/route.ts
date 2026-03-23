import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const { name, email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name: name || email.split('@')[0], email, password: hashed, role: 'CLIENT' } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
