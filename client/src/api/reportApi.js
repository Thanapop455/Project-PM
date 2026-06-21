import api from "./axios";

export const reportApi = {
  getDevices: async () => {
    const response = await api.get("/api/reports/devices");
    return response.data;
  },
  getPMPlan: async (params) => {
    const response = await api.get("/api/reports/pm-plan", { params });
    return response.data;
  },
  getPMHistory: async (params) => {
    const response = await api.get("/api/reports/pm-history", { params });
    return response.data;
  },
  getPMCost: async (params) => {
    const response = await api.get("/api/reports/pm-cost", { params });
    return response.data;
  },
  exportPMPlan: (params) =>
    api.get("/api/reports/pm-plan/export", { params, responseType: "blob" }),
  exportPMHistory: (params) =>
    api.get("/api/reports/pm-history/export", { params, responseType: "blob" }),
  exportPMCost: (params) =>
    api.get("/api/reports/pm-cost/export", { params, responseType: "blob" }),
};
