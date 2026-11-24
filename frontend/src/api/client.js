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

export const getGuestToken = () => {
  return localStorage.getItem('orvexa_guest_token') || null;
};

export const setGuestToken = (token) => {
  if (token) {
    localStorage.setItem('orvexa_guest_token', token);
  } else {
    localStorage.removeItem('orvexa_guest_token');
  }
};

// Global callback listener for guest preview expiry
let onGuestPreviewExpiredHandler = null;
export const setOnGuestPreviewExpired = (handler) => {
  onGuestPreviewExpiredHandler = handler;
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const guestToken = getGuestToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(guestToken && { 'X-Guest-Preview-Token': guestToken }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Extract returned guest preview token if server issued or renewed one
  const returnedGuestToken = response.headers.get('X-Guest-Preview-Token');
  if (returnedGuestToken) {
    setGuestToken(returnedGuestToken);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // If preview expired (403 GUEST_PREVIEW_EXPIRED)
    if (response.status === 403 && data.code === 'GUEST_PREVIEW_EXPIRED') {
      if (onGuestPreviewExpiredHandler) {
        onGuestPreviewExpiredHandler(data);
      }
    }

    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data;
};

export const apiGet = (endpoint) => apiRequest(endpoint, { method: 'GET' });
export const apiPost = (endpoint, body) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) });
export const apiPatch = (endpoint, body) => apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = (endpoint) => apiRequest(endpoint, { method: 'DELETE' });
