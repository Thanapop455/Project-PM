import api from "./axios";

export const pmPlanApi = {
  getAll: async (params) => {
    const response = await api.get("/api/pm-plans", { params });
    return response.data;
  },
  getAlerts: async () => {
    const response = await api.get("/api/pm-plans/alerts");
    return response.data;
  },
  getYears: async () => {
    const response = await api.get("/api/pm-plans/years");
    return response.data;
  },
  getFilterOptions: async () => {
    const response = await api.get("/api/pm-plans/filter-options");
    return response.data;
  },
  getAlertStatus: async () => {
    const response = await api.get("/api/pm-plans/alerts/status");
    return response.data;
  },
  sendAlerts: async () => {
    const response = await api.post("/api/pm-plans/alerts/send");
    return response.data;
  },
  generate: async (payload) => {
    const response = await api.post("/api/pm-plans/generate", payload);
    return response.data;
  },
  undoGenerate: async (payload) => {
    const response = await api.put("/api/pm-plans/undo-generate", payload);
    return response.data;
  },
};
