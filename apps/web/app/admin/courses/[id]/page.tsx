'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../auth-context';
import { adminApi, CourseTree, hasPermission } from '@/lib/admin-api';

export default function CourseBuilderPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const canWrite = hasPermission(user, 'course:write');

  const [tree, setTree] = useState<CourseTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  // lesson draft per module
  const [lessonDraft, setLessonDraft] = useState<Record<string, { title: string; type: string; preview: boolean; text: string }>>({});

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getCourseTree(courseId)
      .then(setTree)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function draft(modId: string) {
    return lessonDraft[modId] ?? { title: '', type: 'TEXT', preview: false, text: '' };
  }
  function setDraft(modId: string, patch: Partial<{ title: string; type: string; preview: boolean; text: string }>) {
    setLessonDraft((d) => ({ ...d, [modId]: { ...draft(modId), ...patch } }));
  }

  async function addLesson(modId: string) {
    const d = draft(modId);
    if (!d.title) return;
    await run(() =>
      adminApi.addLesson(modId, {
        title: d.title,
        type: d.type,
        isPreview: d.preview,
        content: d.text ? { blocks: [{ type: 'text', text: d.text }] } : {},
      }),
    );
    setLessonDraft((s) => ({ ...s, [modId]: { title: '', type: 'TEXT', preview: false, text: '' } }));
  }

  if (!user) return null;

  return (
    <div>
      <p>
        <Link href="/admin/courses">← Courses</Link>
      </p>
      {error && <div className="notice err">{error}</div>}
      {loading ? (
        <p>Loading…</p>
      ) : !tree ? (
        <p>Course not found.</p>
      ) : (
        <>
          <div className="page-head">
            <h1>{tree.title}</h1>
            <span className={`status status-${tree.status.toLowerCase()}`}>{tree.status}</span>
          </div>
          {tree.summary && <p>{tree.summary}</p>}

          {canWrite && (
            <form
              className="card admin-form"
              style={{ maxWidth: 480 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!moduleTitle) return;
                run(() => adminApi.addModule(courseId, { title: moduleTitle })).then(() => setModuleTitle(''));
              }}
            >
              <div className="field">
                <label>Add module / section</label>
                <input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="Module title" />
              </div>
              <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>Add module</button>
            </form>
          )}

          {tree.modules.length === 0 ? (
            <p>No modules yet. Add one above to start building the curriculum.</p>
          ) : (
            tree.modules.map((m) => (
              <div className="card" key={m.id} style={{ marginTop: 16 }}>
                <div className="page-head">
                  <h3 style={{ margin: 0 }}>{m.title}</h3>
                  {canWrite && (
                    <button className="btn-sm" onClick={() => run(() => adminApi.deleteModule(m.id))} disabled={busy}>
                      Delete module
                    </button>
                  )}
                </div>

                {m.lessons.length === 0 ? (
                  <p className="stat-sub">No lessons in this module yet.</p>
                ) : (
                  <ol className="lesson-list">
                    {m.lessons.map((l) => (
                      <li key={l.id}>
                        <span className="badge">{l.type}</span> {l.title}
                        {l.isPreview && <span className="stat-sub"> · preview</span>}
                        {canWrite && (
                          <button
                            className="btn-sm lesson-del"
                            onClick={() => run(() => adminApi.deleteLesson(l.id))}
                            disabled={busy}
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                )}

                {canWrite && (
                  <div className="lesson-add">
                    <input
                      placeholder="Lesson title"
                      value={draft(m.id).title}
                      onChange={(e) => setDraft(m.id, { title: e.target.value })}
                    />
                    <select value={draft(m.id).type} onChange={(e) => setDraft(m.id, { type: e.target.value })}>
                      {['TEXT', 'VIDEO', 'PDF', 'QUIZ'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <label className="role-check">
                      <input type="checkbox" checked={draft(m.id).preview} onChange={(e) => setDraft(m.id, { preview: e.target.checked })} /> preview
                    </label>
                    <textarea
                      placeholder="Lesson text (optional)"
                      rows={2}
                      value={draft(m.id).text}
                      onChange={(e) => setDraft(m.id, { text: e.target.value })}
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => addLesson(m.id)} disabled={busy}>
                      Add lesson
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
