import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import CourseActions from './CourseActions';

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const course = await api.getPublishedCourse(params.slug);
  if (!course) return { title: 'Course not found' };
  return {
    title: course.title,
    description: course.summary ?? undefined,
  };
}

function previewText(content: unknown): string | null {
  const blocks = (content as { blocks?: { text?: string }[] })?.blocks;
  return blocks?.map((b) => b.text).filter(Boolean).join(' ') ?? null;
}

export default async function CourseDetail({ params }: Params) {
  const course = await api.getPublishedCourse(params.slug);
  if (!course) notFound();

  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);

  // Course structured data for SEO.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.summary ?? undefined,
  };

  return (
    <main className="section container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <h1>{course.title}</h1>
      {course.summary && <p>{course.summary}</p>}
      <p className="stat-sub">
        {course.modules.length} modules · {lessonCount} lessons ·{' '}
        {course.price === 0 ? 'Free' : `${course.currency} ${(course.price / 100).toFixed(2)}`}
      </p>

      <CourseActions courseId={course.id} />

      {course.description && <p style={{ marginTop: 16 }}>{course.description}</p>}

      <h2 style={{ marginTop: 24 }}>Curriculum</h2>
      {course.modules.map((m) => (
        <div className="card" key={m.id} style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>{m.title}</h3>
          <ol className="lesson-list">
            {m.lessons.map((l) => (
              <li key={l.id}>
                {l.title}
                {l.isPreview ? (
                  <>
                    {' '}
                    <span className="badge">preview</span>
                    {previewText(l.content) && (
                      <p className="stat-sub" style={{ margin: '4px 0 0' }}>{previewText(l.content)}</p>
                    )}
                  </>
                ) : (
                  <span className="stat-sub"> · 🔒</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </main>
  );
}
