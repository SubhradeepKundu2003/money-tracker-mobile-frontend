import { api } from './client';

/** Thin, typed-by-convention wrappers around the documented REST endpoints. */

// ---- Auth ----
export const authApi = {
  register: (payload) => api.post('/api/auth/register', payload, { auth: false }),
  login: (payload) => api.post('/api/auth/login', payload, { auth: false }),
  me: () => api.get('/api/auth/me'),
  logout: (refreshToken) => api.post('/api/auth/logout', { refreshToken }),
};

// ---- User / profile ----
export const userApi = {
  // Switches base currency AND converts all money to it at the live rate.
  // Returns the updated user object.
  changeBaseCurrency: (currency) =>
    api.patch('/api/me/base-currency', { currency }),
};

// ---- Currencies ----
export const currenciesApi = {
  list: () => api.get('/api/currencies'),
};

// ---- Accounts ----
export const accountsApi = {
  list: () => api.get('/api/accounts'),
  get: (id) => api.get(`/api/accounts/${id}`),
  create: (payload) => api.post('/api/accounts', payload),
  update: (id, payload) => api.put(`/api/accounts/${id}`, payload),
  archive: (id, archived) =>
    api.post(`/api/accounts/${id}/archive?archived=${archived}`),
  remove: (id) => api.del(`/api/accounts/${id}`),
};

// ---- Categories ----
export const categoriesApi = {
  list: (type) => api.get(`/api/categories${type ? `?type=${type}` : ''}`),
  create: (payload) => api.post('/api/categories', payload),
  update: (id, payload) => api.put(`/api/categories/${id}`, payload),
  remove: (id) => api.del(`/api/categories/${id}`),
};

// ---- Transactions ----
function buildQuery(params = {}) {
  const q = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
}

export const transactionsApi = {
  search: (params) => api.get(`/api/transactions${buildQuery(params)}`),
  summary: (params) => api.get(`/api/transactions/summary${buildQuery(params)}`),
  get: (id) => api.get(`/api/transactions/${id}`),
  create: (payload) => api.post('/api/transactions', payload),
  update: (id, payload) => api.put(`/api/transactions/${id}`, payload),
  remove: (id) => api.del(`/api/transactions/${id}`),
};

// ---- Budgets ----
export const budgetsApi = {
  list: () => api.get('/api/budgets'),
  get: (id) => api.get(`/api/budgets/${id}`),
  create: (payload) => api.post('/api/budgets', payload),
  update: (id, payload) => api.put(`/api/budgets/${id}`, payload),
  setActive: (id, active) => api.patch(`/api/budgets/${id}/active`, { active }),
  topUp: (id, amount) => api.post(`/api/budgets/${id}/top-up`, { amount }),
  remove: (id) => api.del(`/api/budgets/${id}`),
};
