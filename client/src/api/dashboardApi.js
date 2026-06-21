import api from "./axios";

export const dashboardApi = {
  getSummary: async () => {
    const response = await api.get("/api/dashboard/summary");
    return response.data;
  },
};
