const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string> & { "Content-Length"?: undefined };
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function apiFetchRaw<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = getToken();
  const url = new URL(`${API_URL}${path}`);

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Only set Content-Type for non-FormData bodies
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url.toString(), {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Request failed");
  }

  return res.json();
}

// Auto-unwrap {success: true, data: T} responses
async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const res: any = await apiFetchRaw(path, options);
  if (res && typeof res === 'object' && 'success' in res) {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    // Preserve meta if present (paginated responses)
    if (res.meta) {
      return { data: res.data, meta: res.meta } as T;
    }
    return res.data !== undefined ? res.data as T : res as T;
  }
  return res;
}

export function apiGet<T = unknown>(path: string, options?: FetchOptions): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "GET" });
}

export function apiPost<T = unknown>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method: "POST",
    body: data instanceof FormData ? data : data !== undefined ? JSON.stringify(data) : undefined,
  });
}

export function apiPut<T = unknown>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method: "PUT",
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

export function apiDelete<T = unknown>(path: string, options?: FetchOptions): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "DELETE" });
}
