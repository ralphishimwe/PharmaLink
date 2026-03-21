import axios from "axios";

// Central Axios instance for frontend API calls.
// Base URL points to the backend API root.
const api = axios.create({
  baseURL: "http://localhost:9000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;

