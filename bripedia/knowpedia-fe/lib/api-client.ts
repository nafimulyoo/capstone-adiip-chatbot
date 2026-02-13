const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("knowpedia_token");

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Optional: handle unauthorized globally (e.g., redirect or logout)
        localStorage.removeItem("knowpedia_token");
        localStorage.removeItem("knowpedia_user");
        if (typeof window !== "undefined") {
            window.location.href = "/login";
        }
    }

    return response;
}
