import { api } from '@/lib/api';

export const metadata = { title: 'Shop' };

export default async function ShopPage() {
  const products = await api.listProducts();
  return (
    <main className="section container">
      <h1>Shop</h1>
      {products && products.length > 0 ? (
        <div className="grid">
          {products.map((p) => (
            <article className="card" key={p.id}>
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.title} style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />
              )}
              <h3>{p.title}</h3>
              <p className="stat-sub">{p.currency} {(p.price / 100).toFixed(2)}</p>
              <a href={`/shop/${p.slug}`}>View →</a>
            </article>
          ))}
        </div>
      ) : (
        <p>No products available yet.</p>
      )}
    </main>
  );
}
