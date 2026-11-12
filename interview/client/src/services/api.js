import axios from 'axios';

export const AUTH_EXPIRED_EVENT = 'prepmind:auth-expired';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15000,
});

function readCookie(name) {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// Double-submit CSRF token: echo the readable pm_csrf cookie in a header on state-changing requests.
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    const token = readCookie('pm_csrf');
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

// A single in-flight refresh shared by all callers (refresh tokens rotate, so concurrent refreshes would collide).
let refreshPromise = null;
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh', null, { _skipRefresh: true })
      .then((res) => res.data.data.user)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    // The browser drops the access cookie when it expires, so the API sees UNAUTHENTICATED (not only TOKEN_EXPIRED).
    const recoverable = ['TOKEN_EXPIRED', 'UNAUTHENTICATED'].includes(response?.data?.error?.code);
    const isCredentialCall = /\/auth\/(login|register|logout|refresh)$/.test(config?.url || '');
    if (
      response?.status === 401 &&
      recoverable &&
      !isCredentialCall &&
      config &&
      !config._retried &&
      !config._skipRefresh
    ) {
      try {
        await refreshSession();
        config._retried = true;
        return api(config);
      } catch (refreshError) {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

/** Normalizes any axios error into a user-friendly message plus per-field validation errors. */
export function parseApiError(error) {
  if (error?.response) {
    const apiError = error.response.data?.error;
    return {
      message: apiError?.message || 'Something went wrong. Please try again.',
      code: apiError?.code || 'ERROR',
      status: error.response.status,
      fields: apiError?.code === 'VALIDATION_ERROR' || apiError?.code === 'EMAIL_TAKEN' ? apiError.details || {} : {},
    };
  }
  if (error?.code === 'ECONNABORTED') {
    return { message: 'The request timed out. Please try again.', code: 'TIMEOUT', fields: {} };
  }
  return {
    message: "Can't reach the server. Check your connection and try again.",
    code: 'NETWORK_ERROR',
    fields: {},
  };
}

export default api;
