// API Configuration
// In development, use relative paths (proxy will handle it)
// In production, use full backend URL

const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (isDevelopment ? '' : 'https://ai-agent-doc-manage.onrender.com');

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  endpoints: {
    document: {
      process: `${API_BASE_URL}/api/document/process`,
      status: (id) => `${API_BASE_URL}/api/document/status/${id}`,
      getAllCompleted: `${API_BASE_URL}/api/document/get-all-completed`,
      triggerGDPR: `${API_BASE_URL}/api/document/trigger-gdpr`,
      triggerSharing: `${API_BASE_URL}/api/document/trigger-sharing`,
      getFromPostgres: (id) => `${API_BASE_URL}/api/document/get-from-postgres/${id}`
    },
    gdpr: {
      list: `${API_BASE_URL}/gdpr`,
      getById: (id) => `${API_BASE_URL}/gdpr/${id}`
    },
    approvals: {
      list: `${API_BASE_URL}/api/approvals/list`,
      process: `${API_BASE_URL}/api/approvals/process`
    }
  }
};

// Helper function to get API URL (handles relative paths in dev)
export const getApiUrl = (path) => {
  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}/${path}`;
};

export default API_CONFIG;

