'use client';

import { useState } from 'react';
import { adminApi, tokenStore } from '@/lib/admin-api';

export default function PlanSubscribe({ planId, planName }: { planId: string; planName: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function subscribe() {
    if (!tokenStore.get()) {
      window.location.href = `/login?returnTo=/membership`;
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const m = await adminApi.subscribe(planId);
      setResult({ ok: true, msg: `You're now subscribed to ${planName} (${m.status}).` });
    } catch (err) {
      setResult({ ok: false, msg: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn btn-primary btn-sm" onClick={subscribe} disabled={busy}>
        {busy ? 'Processing…' : 'Join this plan'}
      </button>
      {result && <div className={`notice ${result.ok ? 'ok' : 'err'}`}>{result.msg}</div>}
    </div>
  );
}
