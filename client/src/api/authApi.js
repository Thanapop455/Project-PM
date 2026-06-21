import api from "./axios";

export const authApi = {
  login: async (payload) => {
    const response = await api.post("/api/auth/login", payload);
    return response.data;
  },
  me: async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },
};
