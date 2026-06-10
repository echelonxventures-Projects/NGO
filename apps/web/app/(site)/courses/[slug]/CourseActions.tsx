'use client';

import { useEffect, useState } from 'react';
import { adminApi, tokenStore } from '@/lib/admin-api';

export default function CourseActions({ courseId }: { courseId: string }) {
  const [state, setState] = useState<'loading' | 'anon' | 'enrolled' | 'not-enrolled'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenStore.get()) {
      setState('anon');
      return;
    }
    adminApi
      .myEnrollments()
      .then((list) => {
        setState(list.some((e) => e.courseId === courseId) ? 'enrolled' : 'not-enrolled');
      })
      .catch(() => setState('not-enrolled'));
  }, [courseId]);

  async function enroll() {
    setBusy(true);
    setError(null);
    try {
      await adminApi.enrollCourse(courseId);
      window.location.href = `/learn/${courseId}`;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (state === 'loading') return <p className="stat-sub">…</p>;

  if (state === 'anon') {
    const returnTo = typeof window !== 'undefined' ? window.location.pathname : '/courses';
    const q = `returnTo=${encodeURIComponent(returnTo)}`;
    return (
      <div className="row-actions">
        <a className="btn btn-primary" href={`/register?${q}`}>Sign up to enroll</a>
        <a className="btn-sm" href={`/login?${q}`}>Log in</a>
      </div>
    );
  }

  if (state === 'enrolled') {
    return (
      <a className="btn btn-primary" href={`/learn/${courseId}`}>
        Continue learning →
      </a>
    );
  }

  return (
    <div>
      <button className="btn btn-primary" onClick={enroll} disabled={busy}>
        {busy ? 'Enrolling…' : 'Enroll now'}
      </button>
      {error && <div className="notice err">{error}</div>}
    </div>
  );
}
