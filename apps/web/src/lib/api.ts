import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'default';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = Cookies.get('token');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-slug': TENANT_SLUG,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(error.message ?? 'Une erreur est survenue');
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T;
  return res.json();
}

async function fetchBlob(path: string): Promise<Blob> {
  const token = Cookies.get('token');
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'x-tenant-slug': TENANT_SLUG,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message ?? 'Fichier inaccessible');
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = void>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
  /** Fetch a binary file with auth and return an object URL (caller must revoke it). */
  blobUrl: async (path: string): Promise<string> => {
    const blob = await fetchBlob(path);
    return URL.createObjectURL(blob);
  },
  download: async (path: string, filename: string): Promise<void> => {
    const blob = await fetchBlob(path);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
};
