const BASE_URL = import.meta.env.VITE_API_URL;

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // #region agent log
  fetch('http://127.0.0.1:7932/ingest/df25aa2f-5688-4e90-abed-6c03ae1f29b3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'128924'},body:JSON.stringify({sessionId:'128924',runId:'pre-fix',hypothesisId:'H1',location:'apiHelper.ts:8',message:'apiFetch request',data:{endpoint,method:(options.method ?? 'GET'),hasBody:options.body!=null,baseUrl:BASE_URL},timestamp:Date.now()})}).catch(()=>{});
  // #endregion agent log
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
    // #region agent log
    fetch('http://127.0.0.1:7932/ingest/df25aa2f-5688-4e90-abed-6c03ae1f29b3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'128924'},body:JSON.stringify({sessionId:'128924',runId:'pre-fix',hypothesisId:'H2',location:'apiHelper.ts:24',message:'apiFetch non-ok response meta',data:{endpoint,status:res.status,contentType:res.headers.get('Content-Type')},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    try {
      const ct = res.headers.get('Content-Type');
      if (ct?.includes('application/json')) {
        const body = (await res.json()) as {
          message?: string;
          title?: string;
          errors?: Record<string, string[] | string>;
        };
        // #region agent log
        fetch('http://127.0.0.1:7932/ingest/df25aa2f-5688-4e90-abed-6c03ae1f29b3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'128924'},body:JSON.stringify({sessionId:'128924',runId:'pre-fix',hypothesisId:'H2',location:'apiHelper.ts:33',message:'apiFetch error json',data:{endpoint,status:res.status,hasMessage:!!body?.message,hasTitle:!!body?.title,hasErrors:!!body?.errors,errorKeys:body?.errors?Object.keys(body.errors):[]},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
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
    // #region agent log
    fetch('http://127.0.0.1:7932/ingest/df25aa2f-5688-4e90-abed-6c03ae1f29b3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'128924'},body:JSON.stringify({sessionId:'128924',runId:'pre-fix',hypothesisId:'H2',location:'apiHelper.ts:55',message:'apiFetch throwing',data:{endpoint,status:res.status,detail},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
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
