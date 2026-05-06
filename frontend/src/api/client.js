const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();

function resolveApiUrl(path) {
  if (API_BASE_URL) {
    const normalizedBase = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;
    return new URL(path, normalizedBase);
  }
  return new URL(path, window.location.origin);
}

export function getStoredSession() {
  const raw = localStorage.getItem("nyaradzo-session");
  return raw ? JSON.parse(raw) : null;
}

export function persistSession(session) {
  localStorage.setItem(
    "nyaradzo-session",
    JSON.stringify({
      token: session.access_token,
      user: session.user,
    }),
  );
}

export function clearStoredSession() {
  localStorage.removeItem("nyaradzo-session");
}

function parseJsonText(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(path, { method = "GET", token, body, query, responseType = "json" } = {}) {
  const url = resolveApiUrl(path);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const response = await fetch(url, {
    method,
    headers: {
      ...(responseType === "json" ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const text = await response.text();
    const data = parseJsonText(text);
    throw new Error(data?.detail || "Something went wrong while contacting the API.");
  }

  if (responseType === "blob") {
    return response.blob();
  }

  const text = await response.text();
  return parseJsonText(text);
}

export const api = {
  login: (body) => request("/api/auth/login", { method: "POST", body }),
  fetchReferenceData: (token) => request("/api/reference-data", { token }),
  fetchMetrics: (token) => request("/api/dashboard/metrics", { token }),
  fetchDashboardTrends: (token) => request("/api/dashboard/trends", { token }),
  fetchPolicyholders: (token, query) => request("/api/policyholders", { token, query }),
  fetchPolicyholder: (token, id) => request(`/api/policyholders/${id}`, { token }),
  fetchPolicyholderByPolicyNumber: (token, policyNumber) =>
    request(`/api/policyholders/by-policy-number/${encodeURIComponent(policyNumber)}`, { token }),
  createPolicyholder: (token, body) => request("/api/policyholders", { method: "POST", token, body }),
  updatePolicyholder: (token, id, body) =>
    request(`/api/policyholders/${id}`, { method: "PUT", token, body }),
  deletePolicyholder: (token, id) => request(`/api/policyholders/${id}`, { method: "DELETE", token }),
  predictPolicyholder: (token, id) => request(`/api/policyholders/${id}/predict`, { method: "POST", token }),
  predictByPolicyNumber: (token, policyNumber) =>
    request("/api/predictions/by-policy-number", {
      method: "POST",
      token,
      body: { policy_number: policyNumber },
    }),
  predictAdHoc: (token, body) => request("/api/predictions", { method: "POST", token, body }),
  downloadPredictionPdfByPolicyNumber: (token, policyNumber) =>
    request(`/api/predictions/by-policy-number/${encodeURIComponent(policyNumber)}/pdf`, {
      token,
      responseType: "blob",
    }),
  fetchModelInfo: (token) => request("/api/model-info", { token }),
};
