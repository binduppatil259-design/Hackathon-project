
 // AgriConnect API helper
(function () {
  const config = window.AGRI_CONFIG || {};

  function getToken() {
    const keys = ["access_token", "token", "authToken"];

    for (const storage of [localStorage, sessionStorage]) {
      for (const key of keys) {
        const token = storage.getItem(key);
        if (token) return token;
      }
    }

    return null;
  }

  async function request(path, options = {}) {
    if (!config.USE_API) {
      throw new Error("API mode is disabled in config.js.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.REQUEST_TIMEOUT_MS || 12000
    );

    try {
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
      };

      const token = getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const baseUrl = (config.API_BASE_URL || "").replace(/\/+$/, "");

      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal
      });

      const text = await response.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!response.ok) {
        const detail = data.detail;
        const message =
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? detail.map(item => item.msg || JSON.stringify(item)).join("; ")
              : data.message || `Request failed (${response.status})`;

        throw new Error(message);
      }

      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("The server took too long to respond.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  window.AgriAPI = {
    enabled: () => Boolean(config.USE_API),
    get: path => request(path),
    post: (path, body) =>
      request(path, {
        method: "POST",
        body: JSON.stringify(body)
      }),
    patch: (path, body) =>
      request(path, {
        method: "PATCH",
        body: JSON.stringify(body)
      })
  };
})();
