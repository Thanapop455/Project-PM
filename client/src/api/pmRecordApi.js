import api from "./axios";

export const pmRecordApi = {
  getAll: async (params) => {
    const response = await api.get("/api/pm-records", { params });
    return response.data;
  },
  create: async (payload) => {
    const response = await api.post("/api/pm-records", payload);
    return response.data;
  },
};
