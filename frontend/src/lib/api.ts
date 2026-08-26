export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';

const TOKEN_KEY = 'dataroom_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Public endpoints don't need (or redirect on) auth. */
  public?: boolean;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token && !opts.public ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = Array.isArray(data.message) ? data.message[0] : data.message;
    } catch {}

    if (res.status === 401 && !opts.public) {
      clearToken();
      if (typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
        location.href = '/login';
      }
    }
    throw new ApiError(message || 'Something went wrong', res.status);
  }
  return res.json();
}

/** Upload one file with progress callbacks (XHR — fetch has no upload progress). */
export function uploadFile(
  folderId: string,
  file: globalThis.File,
  onProgress: (percent: number) => void,
): { promise: Promise<unknown>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('folderId', folderId);
    form.append('file', file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let message = 'Upload failed';
        try {
          const data = JSON.parse(xhr.responseText);
          message = Array.isArray(data.message) ? data.message[0] : data.message;
        } catch {}
        reject(new ApiError(message, xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError('Network error during upload', 0));
    xhr.onabort = () => reject(new ApiError('Upload cancelled', 0));

    xhr.open('POST', `${API_URL}/files/upload`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(form);
  });
  return { promise, abort: () => xhr.abort() };
}
