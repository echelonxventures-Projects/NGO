import { api } from '@/lib/api';
import DonationWidget from '@/app/components/DonationWidget';

export const metadata = { title: 'Donate' };

export default async function DonatePage() {
  const b = await api.getBranding();
  const orgName = b?.tenant.name ?? 'our organization';
  return (
    <main className="section container">
      <h1>Donate to {orgName}</h1>
      <p>Your contribution is eligible for an 80G tax receipt where applicable.</p>
      <DonationWidget apiBase={api.apiBase} tenant={api.tenant} orgName={orgName} />
    </main>
  );
}
