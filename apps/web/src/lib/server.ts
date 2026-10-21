const API = process.env.API_URL ?? "http://localhost:4000";

/** Sunucu bileşenleri için API isteği. Kariyer sayfaları SEO için sunucuda çizilir. */
export async function serverGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}/api${path}`, { next: { revalidate: 30 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as T;
}
