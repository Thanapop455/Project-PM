import api from "./axios";

export const createCrudApi = (basePath) => ({
  getAll: async (params) => {
    const response = await api.get(basePath, { params });
    return response.data;
  },
  create: async (payload) => {
    const response = await api.post(basePath, payload);
    return response.data;
  },
  update: async (id, payload) => {
    const response = await api.put(`${basePath}/${id}`, payload);
    return response.data;
  },
  remove: async (id) => {
    const response = await api.delete(`${basePath}/${id}`);
    return response.data;
  },
});
