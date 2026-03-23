import SiteNav from '@/components/SiteNav';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma/prisma';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug }, select: { title: true, excerpt: true } });
  if (!post) return {};
  return { title: `${post.title} | PLAY3D`, description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug, published: true } });
  if (!post) notFound();

  return (
    <>
      <SiteNav />
      <main id="main-content" style={{ direction: 'rtl', maxWidth: 720, margin: '0 auto', padding: '100px 24px 80px' }}>
        <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--teal)', fontSize: 13, marginBottom: 32, textDecoration: 'none' }}>
          → חזרה לבלוג
        </Link>

        {post.coverImage && (
          <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 32, maxHeight: 400 }}>
            <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--teal)', marginBottom: 12 }}>
          {new Date(post.createdAt).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16, lineHeight: 1.4 }}>{post.title}</h1>
        {post.excerpt && <p style={{ fontSize: 16, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>{post.excerpt}</p>}

        <div
          style={{ fontSize: 15, lineHeight: 1.9, color: 'var(--text2)' }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div style={{ marginTop: 48, padding: 28, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>רוצה לנסות?</div>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>שלח קובץ ונספק הצעת מחיר תוך 24 שעות</p>
          <Link href="/order" className="btn-hero" style={{ display: 'inline-block', fontSize: 14 }}>הזמן הדפסה</Link>
        </div>
      </main>
    </>
  );
}
