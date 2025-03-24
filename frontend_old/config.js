// Configuration for SyncDoc Frontend
const CONFIG = {
  API_BASE_URL: "https://syncdoc-backend.onrender.com/api",
  SOCKET_URL: "https://syncdoc-backend.onrender.com",
  NODE_ENV: "production",
};

// For development - override with local URLs if in development
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  CONFIG.API_BASE_URL = "http://localhost:3000/api";
  CONFIG.SOCKET_URL = "http://localhost:3000";
  CONFIG.NODE_ENV = "development";
}

// Make configuration globally available
window.SYNCDOC_CONFIG = CONFIG;
