import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';

/** Returns session if user is authenticated, or a 401 NextResponse */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  return { session, error: null };
}

/** Returns session if user is ADMIN or OPERATOR, or a 403 NextResponse */
export async function requireAdmin() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };
  const role = (session!.user as { role?: string })?.role;
  if (role !== 'ADMIN' && role !== 'OPERATOR') {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session, error: null };
}
