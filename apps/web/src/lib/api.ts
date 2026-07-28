let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getAccessToken() {
  return currentAccessToken;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  if (currentAccessToken) {
    headers.set("Authorization", `Bearer ${currentAccessToken}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Required for passing the refresh token cookie
  };

  let response = await fetch(url, fetchOptions);

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setAccessToken(data.accessToken);
          onRefreshed(data.accessToken);
        } else {
          setAccessToken(null);
          window.dispatchEvent(new Event("auth:logout"));
          onRefreshed("");
        }
      } catch (err) {
        setAccessToken(null);
        window.dispatchEvent(new Event("auth:logout"));
        onRefreshed("");
      } finally {
        isRefreshing = false;
      }
    }

    // Wait for refresh to complete
    const newToken = await new Promise<string>(resolve => {
      addRefreshSubscriber(resolve);
    });

    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(url, { ...fetchOptions, headers });
    }
  }

  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw { status: response.status, data };
  }

  return data;
}
