import axios from "axios";

// Central Axios instance for frontend API calls.
// In development: set VITE_API_URL in frontend/.env (defaults to localhost).
// In production:  set VITE_API_URL to your deployed backend URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:9000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT for protected routes (orders, payments, etc.)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

