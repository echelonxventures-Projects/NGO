export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <main style={{ maxWidth: 560, margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <h1>You're offline</h1>
      <p>
        This page isn't available without a connection. Content you've already visited is still
        accessible, and your actions will sync when you're back online.
      </p>
      <p>
        <a href="/">Try again</a>
      </p>
    </main>
  );
}
