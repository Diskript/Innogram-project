"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { JwtUser } from "@repo/shared-types";
import { authApi, setAccessToken, ApiError } from "@/lib/api-client";

interface AuthTokensResponse {
  message: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}

interface RegisterResponse {
  message: string;
  userId: string;
  userEmail: string;
}

interface ValidateResponse {
  valid: boolean;
  payload?: {
    sub: string;
    email: string;
    iat: number;
    exp: number;
  };
}

interface AuthContextValue {
  user: JwtUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    displayName: string;
    birthday: string;
    bio?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  googleLogin: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem("refreshToken");
    document.cookie =
      "innogram_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }, []);

  useEffect(() => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    const authUrl =
      process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3002";
    fetch(`${authUrl}/jwt-auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Refresh failed");
        return res.json() as Promise<AuthTokensResponse>;
      })
      .then((data) => {
        setAccessToken(data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        setUser({ userId: data.userId, email: "" });
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => setIsLoading(false));
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.post<AuthTokensResponse>("/jwt-auth/login", {
      email,
      password,
    });
    setAccessToken(data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    document.cookie = "innogram_session=true; path=/; max-age=604800";
    setUser({ userId: data.userId, email });
  }, []);

  const register = useCallback(
    async (dto: {
      email: string;
      password: string;
      username: string;
      displayName: string;
      birthday: string;
      bio?: string;
    }) => {
      await authApi.post<RegisterResponse>("/jwt-auth/register", dto);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.post("/jwt-auth/logout");
    } catch {
      // proceed with local cleanup even if server request fails
    }
    clearSession();
  }, [clearSession]);

  const googleLogin = useCallback(() => {
    const authUrl =
      process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3002";
    window.location.href = `${authUrl}/google/google`;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        googleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}