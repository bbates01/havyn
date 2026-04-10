const BASE_URL = import.meta.env.VITE_API_URL;

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = `API ${res.status}`;
    try {
      const ct = res.headers.get('Content-Type');
      if (ct?.includes('application/json')) {
        const body = (await res.json()) as {
          message?: string;
          title?: string;
          errors?: Record<string, string[] | string>;
        };
        if (body?.errors && typeof body.errors === 'object') {
          const parts: string[] = [];
          for (const [key, msgs] of Object.entries(body.errors)) {
            const list = Array.isArray(msgs) ? msgs : [String(msgs)];
            for (const m of list) parts.push(`${key}: ${m}`);
          }
          if (parts.length) detail = parts.join(' ');
        } else if (body?.message) {
          detail = body.message;
        } else if (body?.title) {
          detail = body.title;
        }
      }
    } catch {
      /* keep detail */
    }
    throw new Error(detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export function buildQuery(
  params: Record<string, string | number | boolean | undefined>
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined
  ) as [string, string | number | boolean][];

  if (entries.length === 0) return '';

  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}
