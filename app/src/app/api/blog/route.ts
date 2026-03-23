import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';

export async function GET(req: Request) {
  const all = new URL(req.url).searchParams.get('all') === '1';
  const posts = await prisma.blogPost.findMany({
    where: all ? {} : { published: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, createdAt: true },
  });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const { title, slug, excerpt, content, published, coverImage } = await req.json();
  if (!title || !slug || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const post = await prisma.blogPost.create({ data: { title, slug, excerpt, content, published: !!published, coverImage } });
  return NextResponse.json(post, { status: 201 });
}
