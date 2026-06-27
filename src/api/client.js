import { API_URL } from '../config';
import {
  getSessionToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from './tokenStorage';

/**
 * Error thrown for any non-2xx response, carrying the backend's error envelope.
 * { code, message, details } map to the documented error shape.
 */
export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Called when refresh definitively fails -> AuthContext routes back to login.
let onAuthExpired = null;
export function setAuthExpiredHandler(fn) {
  onAuthExpired = fn;
}

// Ensure only one refresh runs at a time even if several calls 401 together.
let refreshPromise = null;

function unwrap(json) {
  // Backend envelope: { success, data, error, timestamp }
  if (json && typeof json === 'object' && 'success' in json) {
    if (json.success) return json.data;
    const err = json.error || {};
    throw new ApiError(err.message || 'Request failed', {
      code: err.code,
      details: err.details,
    });
  }
  return json;
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function doFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getSessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

async function tryRefresh() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = unwrap(await parseBody(res));
        await saveTokens({
          sessionToken: data.sessionToken,
          refreshToken: data.refreshToken,
        });
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * Core request helper. On a 401 it attempts exactly one refresh, then retries.
 * If the refresh also fails, tokens are cleared and the auth-expired handler fires.
 */
export async function request(path, options = {}) {
  let res = await doFetch(path, options);

  if (res.status === 401 && options.auth !== false) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch(path, options);
    } else {
      await clearTokens();
      if (onAuthExpired) onAuthExpired();
      throw new ApiError('Session expired. Please sign in again.', {
        status: 401,
        code: 'UNAUTHORIZED',
      });
    }
  }

  const json = await parseBody(res);
  if (!res.ok) {
    const err = (json && json.error) || {};
    throw new ApiError(err.message || `Request failed (${res.status})`, {
      status: res.status,
      code: err.code,
      details: err.details,
    });
  }
  return unwrap(json);
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts) => request(path, { method: 'POST', body, ...opts }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
