'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { adminApi, CurrencyConfig } from '@/lib/admin-api';

export default function CurrenciesPage() {
  const { user } = useAuth();
  const [cfg, setCfg] = useState<CurrencyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getCurrencies()
      .then(setCfg)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  return (
    <div>
      <h1>Currencies</h1>
      <p>Currencies this tenant accepts for donations. The base currency is used for FX snapshots.</p>
      <p className="stat-sub">
        Note: this view is read-only — currency configuration is not yet exposed via a write API.
      </p>
      {error && <div className="notice err">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : cfg ? (
        <>
          <div className="stat-grid" style={{ maxWidth: 420 }}>
            <div className="stat-card">
              <span className="stat-value">{cfg.baseCurrency}</span>
              <span className="stat-label">Base currency</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{cfg.enabledCurrencies.length}</span>
              <span className="stat-label">Enabled currencies</span>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            {cfg.enabledCurrencies.map((c) => (
              <span key={c} className="badge" style={{ marginRight: 8 }}>
                {c}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p>No currency configuration found.</p>
      )}
    </div>
  );
}
