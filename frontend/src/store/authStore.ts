import { create } from "zustand";
import { api } from "../services/api";

export type RoleName = "EMPLOYEE" | "MANAGER" | null;

export type UserDto = {
  id: number;
  email: string;
  name: string | null;
  roleName: RoleName;
  isApproved: boolean;
  createdAt: string;
};

type AuthState = {
  token: string | null;
  user: UserDto | null;
  loading: boolean;

  setToken: (token: string | null) => void;
  logout: () => void;

  loadMe: () => Promise<void>;
  register: (payload: { email: string; name?: string; password: string }) => Promise<void>;
  login: (payload: { login: string; password: string }) => Promise<void>;
};

const TOKEN_KEY = "exam_project_token";

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  loading: false,

  setToken: (token) => {
    if (!token) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null });
  },

  loadMe: async () => {
    const { data } = await api.get<UserDto>("/auth/me");
    set({ user: data });
  },

  register: async (payload) => {
    await api.post("/auth/register", payload);
  },

  login: async (payload) => {
    const { data } = await api.post<{
      token: string;
      user: UserDto;
    }>("/auth/login", payload);

    set({
      token: data.token,
      user: data.user,
    });
    localStorage.setItem(TOKEN_KEY, data.token);
  },
}));

