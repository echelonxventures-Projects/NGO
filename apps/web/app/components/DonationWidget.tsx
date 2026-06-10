'use client';

import { useEffect, useState } from 'react';

interface Props {
  apiBase: string;
  tenant: string;
  orgName: string;
}

// Public donation widget. Loads enabled currencies, lets the visitor pick amount/currency
// and (optionally) a recurring interval, then calls the public donation/subscription API.
export default function DonationWidget({ apiBase, tenant, orgName }: Props) {
  const [currencies, setCurrencies] = useState<string[]>(['INR']);
  const [currency, setCurrency] = useState('INR');
  const [amount, setAmount] = useState('500');
  const [recurring, setRecurring] = useState(false);
  const [interval, setIntervalVal] = useState('MONTHLY');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-tenant': tenant };

  useEffect(() => {
    fetch(`${apiBase}/currencies`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.enabledCurrencies?.length) {
          setCurrencies(d.enabledCurrencies);
          setCurrency(d.baseCurrency ?? d.enabledCurrencies[0]);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    // Amount entered in major units; convert to integer minor units (2dp assumption for UI).
    const minor = Math.round(parseFloat(amount || '0') * 100);
    try {
      const path = recurring ? '/donations/subscriptions' : '/donations';
      const body: Record<string, unknown> = { amount: minor, currency, donorEmail: email, donorName: name };
      if (recurring) body.interval = interval;
      const res = await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Donation failed');
      const receipt = recurring
        ? data?.firstCycle?.receiptNumber
        : data?.donation?.receiptNumber;
      setStatus({
        ok: true,
        msg: `Thank you! Your ${recurring ? interval.toLowerCase() + ' recurring ' : ''}donation to ${orgName} succeeded.${
          receipt ? ` Receipt: ${receipt}` : ''
        }`,
      });
    } catch (err) {
      setStatus({ ok: false, msg: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ maxWidth: 480 }}>
      <div className="field">
        <label>Amount</label>
        <input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="field">
        <label>Currency</label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {currencies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Make it recurring
        </label>
      </div>
      {recurring && (
        <div className="field">
          <label>Interval</label>
          <select value={interval} onChange={(e) => setIntervalVal(e.target.value)}>
            {['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Processing…' : `Donate ${currency} ${amount}`}
      </button>
      {status && <div className={`notice ${status.ok ? 'ok' : 'err'}`}>{status.msg}</div>}
    </form>
  );
}
