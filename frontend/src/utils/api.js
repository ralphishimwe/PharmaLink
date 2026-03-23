import axios from "axios";

// Central Axios instance for frontend API calls.
// Base URL points to the backend API root.
const api = axios.create({
  baseURL: "http://localhost:9000/api/v1",
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

