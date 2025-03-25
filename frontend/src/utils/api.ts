/**
 * API utility functions for making consistent requests to the backend
 */
import { getCookie } from "../utils/cookie";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

/**
 * Default fetch options to include credentials in every request
 */
const defaultOptions: RequestInit = {
  credentials: "include",
};

/**
 * Get current headers with auth token
 * @returns Headers object with auth token if available
 */
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Get token from cookie and include in Authorization header
  const token = getCookie("auth_token");
  if (token) {
    console.log("Including auth token in request headers");
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make a GET request to the API
 * @param endpoint - API endpoint (without base URL)
 * @param options - Additional fetch options
 * @returns Promise with the response data
 */
export const apiGet = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    method: "GET",
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Make a POST request to the API
 * @param endpoint - API endpoint (without base URL)
 * @param data - Data to send
 * @param options - Additional fetch options
 * @returns Promise with the response data
 */
export const apiPost = async <T>(
  endpoint: string,
  data: any,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Make a PUT request to the API
 * @param endpoint - API endpoint (without base URL)
 * @param data - Data to send
 * @param options - Additional fetch options
 * @returns Promise with the response data
 */
export const apiPut = async <T>(
  endpoint: string,
  data: any,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    method: "PUT",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Make a DELETE request to the API
 * @param endpoint - API endpoint (without base URL)
 * @param options - Additional fetch options
 * @returns Promise with the response data
 */
export const apiDelete = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
};
