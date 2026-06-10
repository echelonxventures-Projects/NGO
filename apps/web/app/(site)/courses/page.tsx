import { api } from '@/lib/api';

export const metadata = { title: 'Courses' };

export default async function CoursesPage() {
  const courses = await api.listPublishedCourses();
  return (
    <main className="section container">
      <h1>Courses</h1>
      {courses && courses.length > 0 ? (
        <div className="grid">
          {courses.map((c) => (
            <article className="card" key={c.id}>
              <h3>{c.title}</h3>
              <p>{c.summary ?? ''}</p>
              <p className="stat-sub">
                {c._count?.modules ?? 0} modules · {c.price === 0 ? 'Free' : `${c.currency} ${(c.price / 100).toFixed(2)}`}
              </p>
              <a href={`/courses/${c.slug}`}>View course →</a>
            </article>
          ))}
        </div>
      ) : (
        <p>No courses published yet.</p>
      )}
    </main>
  );
}
