import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 8 * 1024 * 1024; // 8MB

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 });

    const filename = `gallery/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const blob = await put(filename, file, { access: 'public', contentType: file.type });
    return NextResponse.json({ url: blob.url });
  } catch (e: unknown) {
    console.error('Upload error:', e);
    const msg = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
