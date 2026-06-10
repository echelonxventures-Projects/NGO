import { api } from '@/lib/api';
import PlanSubscribe from './PlanSubscribe';

export const metadata = { title: 'Membership' };

export default async function MembershipPage() {
  const plans = await api.listMembershipPlans();
  return (
    <main className="section container">
      <h1>Membership</h1>
      {plans && plans.length > 0 ? (
        <div className="grid">
          {plans.map((p) => (
            <article className="card" key={p.id}>
              <h3>{p.name}</h3>
              <p className="stat-value" style={{ fontSize: 24 }}>
                {p.price === 0 ? 'Free' : `${p.currency} ${(p.price / 100).toFixed(2)}`}
                <span className="stat-sub"> / {p.interval.toLowerCase()}</span>
              </p>
              <ul>
                {(p.benefits ?? []).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              <PlanSubscribe planId={p.id} planName={p.name} />
            </article>
          ))}
        </div>
      ) : (
        <p>No membership plans available.</p>
      )}
    </main>
  );
}
