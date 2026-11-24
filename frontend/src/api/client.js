const API_BASE = 'http://localhost:5001/api';

export const getAuthToken = () => {
  return localStorage.getItem('orvexa_token') || null;
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('orvexa_token', token);
  } else {
    localStorage.removeItem('orvexa_token');
  }
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const apiGet = (endpoint) => apiRequest(endpoint, { method: 'GET' });
export const apiPost = (endpoint, body) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) });
export const apiPatch = (endpoint, body) => apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = (endpoint) => apiRequest(endpoint, { method: 'DELETE' });
