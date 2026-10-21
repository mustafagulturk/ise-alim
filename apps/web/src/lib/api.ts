export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;
let onLogout: (() => void) | null = null;

export const tokens = {
  get: () => accessToken,
  set: (t: string | null) => (accessToken = t),
  onLogout: (fn: () => void) => (onLogout = fn),
};

/** Erişim belirteci 15 dakikada dolar; aynı anda gelen 401'ler tek bir yenileme isteğini paylaşır. */
export function refresh() {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then(async (r) => (r.ok ? ((await r.json()) as { accessToken: string }).accessToken : null))
    .catch(() => null)
    .then((t) => {
      accessToken = t;
      refreshing = null;
      return t;
    });
  return refreshing;
}

async function parseError(res: Response) {
  const body = (await res.json().catch(() => ({}))) as { message?: string | string[]; fields?: Record<string, string> };
  const message = Array.isArray(body.message) ? body.message[0] : body.message;
  return new ApiError(
    message ?? (res.status === 429 ? "Çok fazla istek gönderdiniz, biraz bekleyin." : "Bir şeyler ters gitti, tekrar deneyin."),
    res.status,
    body.fields,
  );
}

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refresh()) return request<T>(method, path, body, false);
    onLogout?.();
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b?: unknown) => request<T>("POST", p, b ?? {}),
  put: <T>(p: string, b: unknown) => request<T>("PUT", p, b),
  patch: <T>(p: string, b?: unknown) => request<T>("PATCH", p, b ?? {}),
  del: <T = void>(p: string) => request<T>("DELETE", p),
};

/** Oturum gerektiren dosyayı (CV, .ics) belirteçle indirip tarayıcıda açar. */
export async function openFile(path: string, download?: string) {
  let res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401 && (await refresh())) res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw await parseError(res);
  const url = URL.createObjectURL(await res.blob());
  if (download) {
    const a = Object.assign(document.createElement("a"), { href: url, download });
    a.click();
  } else window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function fileUrl(path: string) {
  let res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401 && (await refresh())) res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw await parseError(res);
  return URL.createObjectURL(await res.blob());
}
