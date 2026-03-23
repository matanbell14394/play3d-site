import SiteNav from '@/components/SiteNav';
import Link from 'next/link';
import prisma from '@/lib/prisma/prisma';

export const metadata = { title: 'בלוג | PLAY3D', description: 'מאמרים וטיפים על הדפסת תלת מימד' };

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, excerpt: true, coverImage: true, createdAt: true },
  });

  return (
    <>
      <SiteNav />
      <main id="main-content" style={{ direction: 'rtl', maxWidth: 900, margin: '0 auto', padding: '100px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="sh-tag" style={{ display: 'inline-block', marginBottom: 12 }}>// בלוג</div>
          <h1 className="sh-title">מאמרים וטיפים</h1>
          <div className="sh-line" style={{ margin: '12px auto 0' }} />
        </div>

        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✍️</div>
            <div style={{ fontSize: 15 }}>מאמרים בקרוב...</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {posts.map(post => (
              <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <article style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', transition: 'border-color .2s, transform .2s', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--teal)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                  {post.coverImage && (
                    <div style={{ height: 180, overflow: 'hidden' }}>
                      <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </div>
                  )}
                  <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--teal)', marginBottom: 8 }}>
                      {new Date(post.createdAt).toLocaleDateString('he-IL')}
                    </div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: 'var(--text)', lineHeight: 1.5 }}>{post.title}</h2>
                    {post.excerpt && <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{post.excerpt}</p>}
                    <div style={{ marginTop: 14, fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>קרא עוד ←</div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
