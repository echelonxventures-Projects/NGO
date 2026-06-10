import { api } from '@/lib/api';

export const metadata = { title: 'Programs' };

export default async function ProgramsPage() {
  const programs = await api.listPublished('program');
  return (
    <main className="section container">
      <h1>Programs</h1>
      {programs && programs.length > 0 ? (
        <div className="grid">
          {programs.map((p) => (
            <article className="card" key={p.id}>
              <h3>{p.title}</h3>
              <p>{p.excerpt ?? ''}</p>
              <a href={`/programs/${p.slug}`}>Learn more →</a>
            </article>
          ))}
        </div>
      ) : (
        <p>No published programs yet.</p>
      )}
    </main>
  );
}
