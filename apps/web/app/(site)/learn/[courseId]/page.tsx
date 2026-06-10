'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminApi, LearnLesson, LearnPayload, tokenStore } from '@/lib/admin-api';

function lessonText(l: LearnLesson): string | null {
  const blocks = (l.content as { blocks?: { text?: string }[] })?.blocks;
  return blocks?.map((b) => b.text).filter(Boolean).join('\n\n') ?? null;
}

export default function LearnPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;
  const [data, setData] = useState<LearnPayload | null>(null);
  const [active, setActive] = useState<LearnLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!tokenStore.get()) {
      window.location.href = `/login?returnTo=${encodeURIComponent(`/learn/${courseId}`)}`;
      return;
    }
    adminApi
      .learn(courseId)
      .then((d) => {
        setData(d);
        const first = d.course.modules.flatMap((m) => m.lessons)[0];
        setActive((prev) => prev ?? first ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function complete(lessonId: string) {
    setBusy(true);
    try {
      await adminApi.completeLesson(lessonId);
      await new Promise((r) => setTimeout(r, 100));
      // refresh progress + completion flags
      const d = await adminApi.learn(courseId);
      setData(d);
      const stillActive = d.course.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
      if (stillActive) setActive(stillActive);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="section container"><p>Loading…</p></main>;
  if (error) return <main className="section container"><div className="notice err">{error}</div></main>;
  if (!data) return null;

  return (
    <main className="section container">
      <p><a href={`/courses/${data.course.slug}`}>← {data.course.title}</a></p>
      <div className="notice ok">Progress: {data.enrollment.progressPct}% · {data.enrollment.status}</div>

      <div className="learn-layout">
        <aside className="learn-sidebar">
          {data.course.modules.map((m) => (
            <div key={m.id}>
              <div className="learn-module">{m.title}</div>
              {m.lessons.map((l) => (
                <button
                  key={l.id}
                  className={`learn-lesson-link${active?.id === l.id ? ' active' : ''}`}
                  onClick={() => setActive(l)}
                >
                  {l.completed ? '✓ ' : '○ '}
                  {l.title}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section className="learn-content">
          {active ? (
            <>
              <h2>{active.title}</h2>
              {active.type === 'VIDEO' && active.videoUrl ? (
                <video controls src={active.videoUrl} style={{ width: '100%', borderRadius: 8 }} />
              ) : null}
              {lessonText(active) ? (
                lessonText(active)!.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <p className="stat-sub">No content for this lesson yet.</p>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => complete(active.id)}
                disabled={busy || active.completed}
              >
                {active.completed ? 'Completed ✓' : busy ? 'Saving…' : 'Mark complete'}
              </button>
            </>
          ) : (
            <p>This course has no lessons yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
